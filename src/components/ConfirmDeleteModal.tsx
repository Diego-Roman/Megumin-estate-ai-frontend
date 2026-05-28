"use client";

import { AlertCircle } from "lucide-react";

interface ConfirmDeleteModalProps {
  title?: string;
  description?: string;
  body?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export default function ConfirmDeleteModal({
  title       = "Eliminar contrato",
  description = "Esta acción no se puede deshacer",
  body        = "¿Estás seguro de que deseas eliminar este elemento?",
  confirmLabel = "Sí, eliminar",
  onConfirm,
  onCancel,
  isDeleting,
}: ConfirmDeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-backdrop"
      style={{ backgroundColor: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl animate-modal-panel overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle size={18} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {body}{" "}
            <span className="font-medium text-slate-700">Esta acción no se puede deshacer.</span>
          </p>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Eliminando…
                </>
              ) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
