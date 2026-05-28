"use client";

import {
  LayoutDashboard,
  FileText,
  Settings,
  Bot,
  Building2,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: FileText,        label: "Archivos",  id: "files"     },
  { icon: Bot,             label: "IA",        id: "ia"        },
  { icon: Settings,        label: "Ajustes",   id: "ajustes"   },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function DashboardLayout({
  children,
  activeTab,
  onTabChange,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-16 flex-shrink-0 flex flex-col items-center bg-white border-r border-slate-200 py-4 gap-2">

        {/* Logo */}
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center mb-4 flex-shrink-0">
          <Building2 size={16} className="text-white" />
        </div>

        {/* Nav icons */}
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
          {navItems.map(({ icon: Icon, label, id }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                title={label}
                className={`
                  relative group w-full flex items-center justify-center
                  h-10 rounded-xl transition-colors duration-150
                  ${isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-blue-600" />
                )}

                <Icon size={18} />

                {/* Tooltip */}
                <span className="
                  pointer-events-none absolute left-full ml-3 px-2.5 py-1.5
                  rounded-lg bg-slate-800 text-white
                  text-xs font-medium whitespace-nowrap
                  opacity-0 group-hover:opacity-100
                  translate-x-1 group-hover:translate-x-0
                  transition-all duration-150 z-50 shadow-md
                ">
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-2 cursor-pointer hover:bg-blue-700 transition-colors">
          <span className="text-[10px] font-bold text-white">AD</span>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>

    </div>
  );
}
