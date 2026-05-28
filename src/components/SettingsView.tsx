"use client";

import { useState } from "react";
import {
  User, Bell, LogOut, Shield, Pencil, Check, X,
  Building2, Mail, ChevronRight,
} from "lucide-react";

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-[28px] w-[50px] flex-shrink-0 cursor-pointer rounded-full transition-all duration-300 ease-in-out focus:outline-none ${
        enabled ? "bg-blue-600 shadow-[0_0_0_1px_#2563eb]" : "bg-slate-200 shadow-[0_0_0_1px_#e2e8f0]"
      }`}
    >
      <span
        className={`pointer-events-none absolute top-[3px] inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
          enabled ? "translate-x-[22px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

// ── Preference row ────────────────────────────────────────────────────────────

function PrefRow({
  icon: Icon, iconBg, iconColor,
  label, sub, enabled, onToggle,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  label: string; sub: string; enabled: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-5">
      <div className="flex items-center gap-4">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={16} className={iconColor} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onToggle={onToggle} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const STATIC_PROFILE = {
  name:    "Diego Aguirre",
  email:   "romaguirre344z@gmail.com",
  company: "Rikka Solutions",
};

export default function SettingsView() {
  const [profile, setProfile] = useState(STATIC_PROFILE);
  const [draft,     setDraft]     = useState(profile);
  const [isEditing, setIsEditing] = useState(false);

  const startEdit  = () => { setDraft(profile); setIsEditing(true); };
  const saveEdit   = () => { setProfile(draft); setIsEditing(false); };
  const cancelEdit = () => setIsEditing(false);

  const [emailNotifs, setEmailNotifs] = useState(true);

  return (
    <div className="max-w-2xl flex flex-col gap-7">

      {/* ── Page header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Cuenta</p>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight leading-none">
            Configuración
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Plan Profesional
        </div>
      </div>

      {/* ── Profile card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_16px_rgba(15,23,42,0.06)] overflow-hidden">

        {/* Card header */}
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <User size={13} className="text-slate-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Perfil del Agente</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Información de tu cuenta</p>
            </div>
          </div>

          {!isEditing ? (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50 transition-all duration-150 cursor-pointer"
            >
              <Pencil size={11} />
              Editar perfil
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEdit}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Cancelar"
              >
                <X size={14} />
              </button>
              <button
                onClick={saveEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                <Check size={11} />
                Guardar cambios
              </button>
            </div>
          )}
        </div>

        {/* Avatar + fields */}
        <div className="px-7 py-6 flex flex-col gap-6">

          {/* Avatar row */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-xl font-bold text-white">
                {profile.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{profile.name}</p>
              <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                <Shield size={9} />
                Administrador
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Fields */}
          <div className="grid grid-cols-1 gap-5">

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <User size={10} /> Nombre completo
              </label>
              {isEditing ? (
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Nombre completo"
                />
              ) : (
                <p className="text-sm font-medium text-slate-800 px-1">{profile.name}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Mail size={10} /> Correo electrónico
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="correo@ejemplo.com"
                />
              ) : (
                <p className="text-sm text-slate-600 px-1">{profile.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Building2 size={10} /> Empresa
              </label>
              {isEditing ? (
                <input
                  value={draft.company}
                  onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="Nombre de la empresa"
                />
              ) : (
                <p className="text-sm text-slate-600 px-1">{profile.company}</p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Preferences card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_16px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="px-7 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <Bell size={13} className="text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Preferencias</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Personaliza tu experiencia</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <PrefRow
            icon={Bell}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Notificaciones por correo"
            sub="Alertas de contratos próximos a vencer"
            enabled={emailNotifs}
            onToggle={() => setEmailNotifs((v) => !v)}
          />
        </div>
      </div>

      {/* ── Session card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_16px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="px-7 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
            <LogOut size={13} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Sesión</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Gestión de acceso</p>
          </div>
        </div>
        <div className="px-7 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Cerrar sesión</p>
              <p className="text-xs text-slate-400 mt-0.5">Saldrás de tu cuenta en este dispositivo</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer">
              <LogOut size={14} />
              Cerrar Sesión
              <ChevronRight size={13} className="opacity-70" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
