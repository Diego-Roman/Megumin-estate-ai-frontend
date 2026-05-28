"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCheck,
  FileText,
  DollarSign,
  AlertCircle,
  Trash2,
  Upload,
  X,
  UploadCloud,
  FileIcon,
  CheckCircle2,
  Building2,
  Sparkles,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import AiChat, { type Message as ChatMessage } from "@/components/AiChat";
import FilesView from "@/components/FilesView";
import SettingsView from "@/components/SettingsView";

// ── Types & Data ──────────────────────────────────────────────────────────────

type Contract = {
  id: string;
  inmueble: string;
  propietario: string;
  arrendatario: string;
  canon: string;
  canonNum: number;
  moneda: string;
  fechaFin: string;
  pdfUrl: string | null;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://megumin-estate-ai.onrender.com";
const API_URL = `${BASE_URL}/contracts`;

// Normalizes API response fields to our internal Contract shape.
// Handles snake_case, camelCase, and Spanish field names.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectMoneda(raw: any, canonRaw: unknown, canonNum: number | null): string {
  const m = String(raw.moneda ?? raw.currency ?? raw.divisa ?? raw.tipo_moneda ?? "").toUpperCase();
  if (m.includes("COP")) return "COP";
  if (m.includes("USD")) return "USD";
  if (m.includes("EUR")) return "EUR";
  if (m.length === 3)    return m;
  // Infer from the raw canon string
  if (typeof canonRaw === "string") {
    const s = canonRaw.toUpperCase();
    if (s.includes("COP")) return "COP";
    if (s.includes("EUR") || s.includes("€")) return "EUR";
    if (s.includes("USD")) return "USD";
  }
  // Heuristic: amounts above 100 000 are almost certainly COP
  if (canonNum != null && canonNum > 100_000) return "COP";
  return "USD";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeContract(raw: any): Contract {
  const canonRaw =
    raw.canon            ??
    raw.precio_alquiler  ??
    raw.precio           ??
    raw.mensualidad      ??
    raw.valor_canon      ??
    raw.valor            ??
    raw.monto            ??
    raw.alquiler         ??
    raw.renta            ??
    raw.monthly_rent     ??
    raw.rent             ??
    raw.rental_amount    ??
    raw.amount           ??
    null;

  const canonNum = typeof canonRaw === "string"
    ? parseFloat(canonRaw.replace(/[^0-9.]/g, ""))
    : (canonRaw as number | null);

  const safeNum  = canonNum != null && !isNaN(canonNum) ? canonNum : 0;
  const moneda   = detectMoneda(raw, canonRaw, safeNum || null);
  const canonStr = safeNum > 0
    ? `$${safeNum.toLocaleString("es-MX")}`
    : canonRaw != null ? String(canonRaw) : "—";

  return {
    id:           raw.id           ?? raw._id           ?? "",
    inmueble:     raw.inmueble     ?? raw.property       ?? raw.address       ?? raw.propiedad    ?? raw.direccion ?? "",
    propietario:  raw.propietario  ?? raw.owner          ?? raw.owner_name    ?? raw.dueno        ?? "",
    arrendatario: raw.arrendatario ?? raw.tenant         ?? raw.tenant_name   ?? raw.inquilino    ?? raw.arrendador ?? "",
    canon:        canonStr,
    canonNum:     safeNum,
    moneda,
    fechaFin:     raw.fechaFin     ?? raw.end_date       ?? raw.fecha_fin     ?? raw.expiry_date  ?? raw.fecha_vencimiento ?? "",
    pdfUrl:       raw.pdf_url      ?? raw.pdfUrl         ?? null,
  };
}

const CURRENCY_LOCALE: Record<string, string> = { USD: "en-US", COP: "es-CO", EUR: "de-DE" };
const CURRENCY_SYMBOL: Record<string, string> = { USD: "USD", COP: "COP", EUR: "EUR" };

function formatCanon(amount: number, moneda: string): string {
  const locale = CURRENCY_LOCALE[moneda] ?? "es-MX";
  const symbol = CURRENCY_SYMBOL[moneda] ?? moneda;
  return `${Number(amount).toLocaleString(locale)} ${symbol}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub,
  valueColor = "text-slate-800", iconBg = "bg-slate-100", iconColor = "text-slate-500",
  urgent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  iconBg?: string;
  iconColor?: string;
  urgent?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer ${
      urgent ? "border-red-300 bg-red-50/40" : "border-slate-200"
    }`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={15} className={iconColor} />
        </div>
      </div>
      <div>
        <p className={`text-3xl font-bold leading-none ${valueColor}`}>{value}</p>
        <p className="text-xs text-slate-400 mt-2">{sub}</p>
      </div>
    </div>
  );
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

const UPLOAD_URL = `${BASE_URL}/upload-contract`;

type DropState = "idle" | "hover" | "dragging" | "accepted" | "uploading" | "success" | "error";

interface DropZoneProps {
  onUploadSuccess: () => void;
}

function DropZone({ onUploadSuccess }: DropZoneProps) {
  const [state, setState]         = useState<DropState>("idle");
  const [file, setFile]           = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inputKey, setInputKey]   = useState(0);
  const inputRef                  = useRef<HTMLInputElement>(null);

  const accept = useCallback((f: File) => {
    if (f.type === "application/pdf") { setFile(f); setState("accepted"); }
    else { setState("error"); setTimeout(() => setState("idle"), 2200); }
  }, []);

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setState("dragging"); };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (state !== "accepted" && state !== "uploading" && state !== "success") setState("idle");
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (state === "uploading") return;
    const f = e.dataTransfer.files[0]; if (f) accept(f);
  };
  const reset = () => { setFile(null); setState("idle"); setUploadError(null); setInputKey(k => k + 1); };

  const uploadFile = async (f: File) => {
    setState("uploading");
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch(UPLOAD_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Error del servidor (${res.status})`);
      setState("success");
      onUploadSuccess();
      setTimeout(reset, 3500);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error desconocido");
      setState("error");
      setTimeout(reset, 4000);
    }
  };

  const isIdle      = state === "idle" || state === "hover" || state === "dragging";
  const isDragging  = state === "dragging";
  const isAccepted  = state === "accepted";
  const isUploading = state === "uploading";
  const isSuccess   = state === "success";
  const isError     = state === "error";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Sparkles size={13} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Carga de Documentos</h2>
          <p className="text-[11px] text-slate-400">Contratos en PDF</p>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => { if (state === "idle") setState("hover"); }}
        onMouseLeave={() => { if (state === "hover") setState("idle"); }}
        onClick={() => isIdle && inputRef.current?.click()}
        className={`
          relative flex-1 flex flex-col items-center justify-center gap-5
          rounded-2xl border-2 border-dashed p-8
          transition-all duration-200 select-none
          ${isUploading || isSuccess
            ? "border-blue-200 bg-blue-50 cursor-default"
            : isAccepted
            ? "border-green-300 bg-green-50 cursor-default"
            : isError
            ? "border-red-300 bg-red-50 cursor-default"
            : isDragging
            ? "border-blue-400 bg-blue-100 scale-[1.01] cursor-copy"
            : state === "hover"
            ? "border-blue-300 bg-blue-50 cursor-pointer"
            : "border-blue-300 bg-white hover:bg-blue-50 cursor-pointer"
          }
        `}
      >
        {isDragging && (
          <>
            <span className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-blue-400 rounded-tl" />
            <span className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-blue-400 rounded-tr" />
            <span className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-blue-400 rounded-bl" />
            <span className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-blue-400 rounded-br" />
          </>
        )}

        <AnimatePresence mode="wait">

          {/* ── Uploading ── */}
          {isUploading && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700">Subiendo y procesando con IA…</p>
                <p className="text-xs text-slate-400 mt-1">Esto puede tardar unos segundos</p>
              </div>
            </motion.div>
          )}

          {/* ── Success ── */}
          {isSuccess && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-green-100 border border-green-200 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-700">¡Contrato procesado correctamente!</p>
                <p className="text-xs text-slate-400 mt-1">La tabla se ha actualizado</p>
              </div>
            </motion.div>
          )}

          {/* ── Accepted (file ready, pending upload) ── */}
          {isAccepted && file && (
            <motion.div
              key="accepted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-green-100 border border-green-200 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 leading-snug">{file.name}</p>
                <p className="text-xs text-slate-400 mt-1">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors underline underline-offset-2"
              >
                Cambiar archivo
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); uploadFile(file); }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Upload size={13} />
                Procesar con IA
              </button>
            </motion.div>
          )}

          {/* ── Error ── */}
          {isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center">
                <X size={26} className="text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-600">
                {uploadError ?? "Solo se aceptan archivos PDF"}
              </p>
            </motion.div>
          )}

          {/* ── Idle / hover / dragging ── */}
          {isIdle && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 text-center"
            >
              <motion.div
                animate={isDragging ? { scale: 1.1, rotate: -3 } : state === "hover" ? { scale: 1.05 } : { scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center border-2 bg-blue-50 border-blue-200 transition-colors duration-200"
              >
                <UploadCloud size={34} className="text-blue-500 transition-colors duration-200" />
              </motion.div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-slate-700">
                  {isDragging ? "Suelta el archivo aquí" : "Arrastra tu contrato en PDF aquí"}
                </p>
                <p className="text-xs text-slate-400">o haz clic para seleccionar</p>
                <span className="inline-block mt-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 tracking-wide">
                  PDF · Máx. 20 MB
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                <FileIcon size={13} />
                Seleccionar archivo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          key={inputKey}
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) accept(f); }}
        />
      </div>
    </div>
  );
}

// ConfirmDeleteModal is imported from @/components/ConfirmDeleteModal

// ── Upload Modal ──────────────────────────────────────────────────────────────

function UploadModal({ onClose, onUploadSuccess }: { onClose: () => void; onUploadSuccess: () => void }) {
  const [isDragging, setIsDragging]     = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError]       = useState(false);
  const [inputKey, setInputKey]         = useState(0);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState<string | null>(null);

  const acceptFile = (file: File) => {
    if (file.type === "application/pdf") { setSelectedFile(file); setFileError(false); setUploadError(null); }
    else { setFileError(true); setTimeout(() => setFileError(false), 2500); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) acceptFile(f);
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch(UPLOAD_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Error del servidor (${res.status})`);
      onUploadSuccess();
      onClose();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error desconocido");
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-backdrop"
      style={{ backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}
      onClick={uploading ? undefined : onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl animate-modal-panel overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Upload size={15} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Subir Nuevo Contrato</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Solo archivos PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); if (!uploading) setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={uploading ? undefined : handleDrop}
            onClick={() => !selectedFile && !uploading && document.getElementById("modal-file-input")?.click()}
            className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed py-10 px-6 transition-all duration-200 select-none ${
              uploading     ? "border-blue-200 bg-blue-50 cursor-default"
              : selectedFile  ? "border-green-300 bg-green-50 cursor-default"
              : fileError   ? "border-red-300 bg-red-50"
              : isDragging  ? "border-blue-400 bg-blue-50 scale-[1.01] cursor-copy"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
            }`}
          >
            {uploading ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                  <svg className="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-blue-700">Subiendo y procesando con IA…</p>
                  <p className="text-xs text-slate-400 mt-1">Esto puede tardar unos segundos</p>
                </div>
              </>
            ) : selectedFile ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatBytes(selectedFile.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setUploadError(null); setInputKey(k => k + 1); }}
                  className="text-[11px] text-slate-400 hover:text-red-500 transition-colors underline underline-offset-2"
                >
                  Cambiar archivo
                </button>
              </>
            ) : (
              <>
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-colors ${
                  isDragging ? "bg-blue-100 border-blue-300" : fileError ? "bg-red-100 border-red-200" : "bg-slate-100 border-slate-200"
                }`}>
                  <UploadCloud size={28} className={isDragging ? "text-blue-500" : fileError ? "text-red-500" : "text-slate-400"} />
                </div>
                <div className="text-center space-y-1">
                  {fileError
                    ? <p className="text-sm font-medium text-red-600">Solo se aceptan archivos PDF</p>
                    : isDragging
                    ? <p className="text-sm font-semibold text-blue-600">Suelta el archivo aquí</p>
                    : <p className="text-sm text-slate-500">Arrastra tu contrato aquí <span className="text-slate-400">o haz clic para buscar</span></p>
                  }
                  <p className="text-xs text-slate-400">PDF · Máximo 20 MB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); document.getElementById("modal-file-input")?.click(); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <FileIcon size={13} />
                  Seleccionar Archivo
                </button>
              </>
            )}
            <input key={inputKey} id="modal-file-input" type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }} />
          </div>

          {uploadError && (
            <p className="text-xs text-red-600 text-center">{uploadError}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                selectedFile && !uploading
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Subiendo…
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Subir Contrato
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const WELCOME: ChatMessage = { role: "ai", content: "¡Hola! Soy Megumin. ¿En qué te puedo ayudar con los contratos hoy?" };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([WELCOME]);

  // Load persisted history on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("megumin_chat_history");
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) setChatMessages(parsed);
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  // Persist history on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("megumin_chat_history", JSON.stringify(chatMessages));
  }, [chatMessages]);

  const fetchContracts = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Error del servidor (${res.status})`);
        return res.json();
      })
      .then((data: unknown[]) => {
        setContracts(Array.isArray(data) ? data.map(normalizeContract) : []);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId]             = useState<string | null>(null);

  const deleteContract = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error al eliminar contrato:", err);
    } finally {
      setDeletingId(null);
      setContractToDelete(null);
    }
  };

  const activeCount = contracts.length;

  const canonTotals = contracts.reduce<Record<string, number>>((acc, c) => {
    acc[c.moneda] = (acc[c.moneda] ?? 0) + c.canonNum;
    return acc;
  }, {});

  const expiringSoon = contracts.filter((c) => {
    const days = (new Date(c.fechaFin).getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 60;
  }).length;

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>

      {/* ── IA Chat ── */}
      {activeTab === "ia" && <AiChat messages={chatMessages} setMessages={setChatMessages} />}

      {/* ── Settings ── */}
      {activeTab === "ajustes" && <SettingsView />}

      {/* ── Files ── */}
      {activeTab === "files" && <FilesView />}

      {/* ── Dashboard ── */}
      {activeTab === "dashboard" && <>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Panel de Control</p>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Megumin — Contratos Activos
          </h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <Upload size={15} />
          Subir Contrato
        </button>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <KpiCard
          icon={FileCheck}
          label="Contratos Activos"
          value={String(activeCount)}
          sub={`${activeCount} contratos en gestión`}
          valueColor="text-slate-800"
          iconBg="bg-slate-100"
          iconColor="text-slate-500"
        />
        {/* ── Canon por divisa ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Canon Mensual Total</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <DollarSign size={15} className="text-blue-600" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {Object.keys(canonTotals).length === 0 ? (
              <p className="text-3xl font-bold text-slate-300 leading-none">—</p>
            ) : (
              Object.entries(canonTotals).map(([moneda, total]) => (
                <div key={moneda} className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-blue-600 leading-none tabular-nums">
                    {formatCanon(total, moneda)}
                  </span>
                </div>
              ))
            )}
            <p className="text-xs text-slate-400 mt-1">Agrupado por divisa</p>
          </div>
        </div>
        <KpiCard
          icon={expiringSoon > 0 ? AlertCircle : CheckCircle2}
          label="Vencen en 60 días"
          value={String(expiringSoon)}
          sub={expiringSoon > 0 ? "¡Requieren atención inmediata!" : "Todos los contratos en regla"}
          valueColor={expiringSoon > 0 ? "text-amber-600" : "text-green-600"}
          iconBg={expiringSoon > 0 ? "bg-amber-50" : "bg-green-50"}
          iconColor={expiringSoon > 0 ? "text-amber-500" : "text-green-500"}
          urgent={expiringSoon > 0}
        />
      </div>

      {/* ── Table + DropZone ── */}
      <div className="grid grid-cols-[1fr_300px] gap-5 items-start">

        {/* Contracts table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <Building2 size={13} className="text-slate-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Listado de Contratos</h2>
                <p className="text-xs text-slate-400 mt-0.5">{contracts.length} registros activos</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              En vivo
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Inmueble", "Propietario", "Arrendatario", "Canon", "Fecha Fin", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* ── Loading ── */}
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <p className="text-sm">Cargando contratos…</p>
                        <p className="text-xs text-slate-300">El servidor puede tardar unos segundos en responder</p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* ── Error ── */}
                {!loading && error && (
                  <tr>
                    <td colSpan={6} className="px-6 py-14">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                          <AlertCircle size={18} className="text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">No se pudieron cargar los contratos</p>
                          <p className="text-xs text-slate-400 mt-1">{error}</p>
                        </div>
                        <button
                          onClick={fetchContracts}
                          className="mt-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
                        >
                          Reintentar
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* ── Data ── */}
                {!loading && !error && contracts.map((c, i) => {
                  const daysLeft   = (new Date(c.fechaFin).getTime() - Date.now()) / 86_400_000;
                  const isExpiring = daysLeft >= 0 && daysLeft <= 60;
                  const isExpired  = daysLeft < 0;
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50 transition-colors ${i === contracts.length - 1 ? "" : "border-b border-slate-100"}`}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700 leading-snug">{c.inmueble}</p>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">{c.id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{c.propietario}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{c.arrendatario}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-blue-600">{c.canon}</span>
                        <span className="text-xs text-slate-400 ml-1">/mes</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          isExpired    ? "bg-red-50 text-red-600 border-red-200"
                          : isExpiring ? "bg-amber-50 text-amber-600 border-amber-200"
                          : "bg-green-50 text-green-700 border-green-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? "bg-red-500" : isExpiring ? "bg-amber-500" : "bg-green-500"}`} />
                          {c.fechaFin}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          {c.pdfUrl && (
                            <a
                              href={c.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ver PDF del contrato"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all duration-150"
                            >
                              <FileText size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => setContractToDelete(c.id)}
                            disabled={deletingId !== null}
                            title="Eliminar contrato"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-150 ${
                              deletingId !== null
                                ? "text-slate-200 border-transparent cursor-not-allowed"
                                : "text-slate-300 hover:text-red-500 hover:bg-red-50 border-transparent hover:border-red-100 cursor-pointer"
                            }`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* ── Empty ── */}
                {!loading && !error && contracts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">
                      No hay contratos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drop Zone */}
        <div className="sticky top-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-md rounded-2xl">
          <DropZone onUploadSuccess={fetchContracts} />
        </div>
      </div>

      </>}

      {contractToDelete && (
        <ConfirmDeleteModal
          isDeleting={deletingId === contractToDelete}
          onConfirm={() => deleteContract(contractToDelete)}
          onCancel={() => setContractToDelete(null)}
        />
      )}

      {modalOpen && <UploadModal onClose={() => setModalOpen(false)} onUploadSuccess={fetchContracts} />}
    </DashboardLayout>
  );
}
