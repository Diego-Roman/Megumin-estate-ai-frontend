"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, ExternalLink, UploadCloud, AlertCircle, ChevronDown, Trash2 } from "lucide-react";
import { UploadDropzone } from "@/utils/uploadthing";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "https://megumin-estate-ai.onrender.com"}/contracts`;

type ContractOption = { id: string; label: string };

type ContractWithPdf = {
  id: string;
  inmueble: string;
  arrendatario: string;
  pdfUrl: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOption(raw: any): ContractOption {
  const id    = raw.id ?? raw._id ?? "";
  const place = raw.inmueble ?? raw.property ?? raw.address ?? raw.propiedad ?? id;
  const tenant = raw.arrendatario ?? raw.tenant ?? raw.inquilino ?? "";
  return { id, label: tenant ? `${place} — ${tenant}` : place };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toContractWithPdf(raw: any): ContractWithPdf | null {
  const pdfUrl = raw.pdf_url ?? raw.pdfUrl ?? null;
  if (!pdfUrl) return null;
  return {
    id:           raw.id ?? raw._id ?? "",
    inmueble:     raw.inmueble ?? raw.property ?? raw.address ?? raw.propiedad ?? "",
    arrendatario: raw.arrendatario ?? raw.tenant ?? raw.inquilino ?? "—",
    pdfUrl,
  };
}

export default function FilesView() {
  const [contracts, setContracts]             = useState<ContractOption[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [selectedId, setSelectedId]           = useState<string>("");
  const [uploadError, setUploadError]         = useState<string | null>(null);
  const [patchError, setPatchError]           = useState<string | null>(null);
  const [pdfContracts, setPdfContracts]       = useState<ContractWithPdf[]>([]);
  const [tableLoading, setTableLoading]       = useState(true);

  const fetchContracts = useCallback(() => {
    setTableLoading(true);
    fetch(API_URL)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: unknown[]) => {
        if (!Array.isArray(data)) return;
        setContracts(data.map(toOption));
        setPdfContracts(data.map(toContractWithPdf).filter(Boolean) as ContractWithPdf[]);
      })
      .catch(() => {/* silent – table will stay empty */})
      .finally(() => { setContractsLoading(false); setTableLoading(false); });
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; pdfUrl: string } | null>(null);
  const [isDeleting, setIsDeleting]       = useState(false);

  const confirmDeletePdf = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await fetch("/api/uploadthing/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: pendingDelete.pdfUrl }),
      });
      await fetch(`${API_URL}/${pendingDelete.id}/archivo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_url: null }),
      });
      fetchContracts();
    } catch (err) {
      console.error("Error al eliminar PDF:", err);
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleUploadComplete = async (res: { name: string; url: string }[]) => {
    if (!selectedId || !res[0]) return;
    setPatchError(null);
    try {
      const resp = await fetch(`${API_URL}/${selectedId}/archivo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_url: res[0].url }),
      });
      if (!resp.ok) throw new Error(`Error del servidor (${resp.status})`);
      fetchContracts(); // refresh table from backend
      setSelectedId("");
    } catch (err) {
      setPatchError(err instanceof Error ? err.message : "No se pudo guardar la URL del PDF.");
    }
  };

  const canUpload = selectedId !== "";

  return (
    <>
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Gestión de Archivos</p>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Contratos en PDF</h1>
      </div>

      {/* ── Upload card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <UploadCloud size={13} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Subir PDF de Contrato</h2>
            <p className="text-xs text-slate-400 mt-0.5">Solo archivos PDF · Máx. 16 MB</p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4">

          {/* Contract selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              1. Selecciona el contrato al que pertenece este PDF
            </label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={contractsLoading}
                className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-9 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {contractsLoading ? "Cargando contratos…" : "— Selecciona un contrato —"}
                </option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Dropzone — only active when a contract is selected */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              2. Arrastra o selecciona el PDF
            </label>
            {canUpload ? (
              <UploadDropzone
                endpoint="contractUploader"
                appearance={{
                  container:      "border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/40 hover:bg-blue-50 transition-colors ut-uploading:border-blue-400",
                  uploadIcon:     "text-blue-400",
                  label:          "text-sm font-medium text-slate-600 mt-2",
                  allowedContent: "text-xs text-slate-400",
                  button:         "bg-blue-600 text-white rounded-xl px-5 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors ut-uploading:bg-blue-400 ut-uploading:cursor-not-allowed",
                }}
                onClientUploadComplete={handleUploadComplete}
                onUploadError={(err) => setUploadError(err.message)}
              />
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 py-10 flex flex-col items-center gap-3 select-none">
                <UploadCloud size={28} className="text-slate-300" />
                <p className="text-sm text-slate-400">Selecciona un contrato para habilitar la subida</p>
              </div>
            )}
          </div>

          {(uploadError || patchError) && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600">{uploadError ?? patchError}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Files table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <FileText size={13} className="text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Contratos con PDF vinculado</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {tableLoading ? "Cargando…" : `${pdfContracts.length} contrato${pdfContracts.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Inmueble", "Arrendatario", "Acciones"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <p className="text-sm">Cargando archivos…</p>
                    </div>
                  </td>
                </tr>
              ) : pdfContracts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-14 text-center text-slate-400 text-sm">
                    Ningún contrato tiene un PDF vinculado aún.
                  </td>
                </tr>
              ) : (
                pdfContracts.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50 transition-colors ${i < pdfContracts.length - 1 ? "border-b border-slate-100" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                          <FileText size={14} className="text-red-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 leading-snug truncate max-w-xs">
                          {c.inmueble}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{c.arrendatario}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={c.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir PDF"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          <ExternalLink size={12} />
                          Ver PDF
                        </a>
                        <button
                          onClick={() => setPendingDelete({ id: c.id, pdfUrl: c.pdfUrl })}
                          title="Eliminar PDF"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>

    {pendingDelete && (
      <ConfirmDeleteModal
        title="Eliminar PDF vinculado"
        description="El archivo se borrará permanentemente de UploadThing"
        body="¿Estás seguro de que deseas eliminar el PDF de este contrato?"
        confirmLabel="Sí, eliminar PDF"
        isDeleting={isDeleting}
        onConfirm={confirmDeletePdf}
        onCancel={() => setPendingDelete(null)}
      />
    )}
    </>
  );
}
