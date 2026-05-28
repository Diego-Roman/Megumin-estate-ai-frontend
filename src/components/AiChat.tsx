"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Bot, Sparkles, Download, Trash2 } from "lucide-react";

export type Message = {
  role: "user" | "ai";
  content: string;
};

const SUGGESTIONS = [
  "Resumen de contratos",
  "Contratos por vencer",
  "Canon mensual total",
  "Contratos activos",
];

interface AiChatProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

// ── Markdown → pdfmake content parser ───────────────────────────────────────

type Run  = { text: string; bold?: boolean; italics?: boolean };
type Node =
  | { text: string | Run[]; fontSize?: number; bold?: boolean; margin?: [number,number,number,number]; alignment?: string; lineHeight?: number }
  | { ul: { text: string | Run[] }[]; margin?: [number,number,number,number] }
  | { canvas: object[] }
  | { columns: object[]; margin?: [number,number,number,number] }
  | { text: string; fontSize?: number };

/** Splits a line at **bold** and *italic* markers into an array of runs. */
function parseInline(line: string): string | Run[] {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  if (parts.length === 1 && !parts[0].startsWith("*")) return parts[0];
  return parts.map((p) => {
    if (p.startsWith("**") && p.endsWith("**")) return { text: p.slice(2, -2), bold: true };
    if (p.startsWith("*")  && p.endsWith("*"))  return { text: p.slice(1, -1), italics: true };
    return { text: p };
  });
}

function markdownToNodes(md: string): Node[] {
  const nodes: Node[]    = [];
  const listBuf: Run[][]  = [];

  const flushList = () => {
    if (!listBuf.length) return;
    nodes.push({ ul: listBuf.map((r) => ({ text: r as unknown as string | Run[] })), margin: [0, 2, 0, 8] });
    listBuf.length = 0;
  };

  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();

    if (/^### /.test(line)) {
      flushList();
      nodes.push({ text: parseInline(line.slice(4)), fontSize: 11, bold: true, margin: [0, 8, 0, 3] });
    } else if (/^## /.test(line)) {
      flushList();
      nodes.push({ text: parseInline(line.slice(3)), fontSize: 13, bold: true, margin: [0, 10, 0, 5] });
    } else if (/^# /.test(line)) {
      flushList();
      nodes.push({ text: parseInline(line.slice(2)), fontSize: 15, bold: true, margin: [0, 12, 0, 6] });
    } else if (/^[-*•]\s/.test(line)) {
      const inline = parseInline(line.replace(/^[-*•]\s+/, ""));
      listBuf.push(Array.isArray(inline) ? inline : [{ text: inline }]);
    } else if (line.trim() === "") {
      flushList();
      nodes.push({ text: " ", fontSize: 4 });
    } else {
      flushList();
      nodes.push({ text: parseInline(line), margin: [0, 0, 0, 5], lineHeight: 1.6 });
    }
  }

  flushList();
  return nodes;
}

// ── PDF download ─────────────────────────────────────────────────────────────

function buildFilename(content: string): string {
  const firstLine = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? "";

  const clean = firstLine
    .replace(/^#+\s*/, "")       // strip leading # markers
    .replace(/\*+/g, "")         // strip asterisks
    .replace(/[^\w\sáéíóúÁÉÍÓÚüÜñÑ]/g, "") // strip other special chars
    .trim()
    .slice(0, 30)
    .trim()
    .replace(/\s+/g, "_");

  return clean.length >= 3
    ? `${clean}.pdf`
    : `Documento_Megumin_${Date.now()}.pdf`;
}

async function downloadPdf(content: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMake = ((await import("pdfmake/build/pdfmake")) as any).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vfsFonts = ((await import("pdfmake/build/vfs_fonts")) as any).default;

  // In pdfmake 0.3.x vfs_fonts exports the VFS object directly
  pdfMake.vfs = vfsFonts;
  pdfMake.fonts = {
    Roboto: {
      normal:      "Roboto-Regular.ttf",
      bold:        "Roboto-Medium.ttf",
      italics:     "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  };

  const today = new Date().toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });

  // A4 width minus margins (595.28 - 2×57 ≈ 481pt)
  const RULE_WIDTH = 481;

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [57, 57, 57, 57],

    footer: (currentPage: number, pageCount: number) => ({
      text: `Documento generado y verificado por Megumin AI  —  Página ${currentPage} de ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      color: "#9ca3af",
      margin: [0, 14, 0, 0],
    }),

    content: [
      // ── Membrete ──────────────────────────────────────────────────────────
      {
        text: "MEGUMIN ESTATE",
        fontSize: 22,
        bold: true,
        alignment: "center",
        characterSpacing: 5,
        color: "#111827",
        margin: [0, 0, 0, 4],
      },
      {
        text: "& Logistics",
        fontSize: 10,
        alignment: "center",
        characterSpacing: 7,
        color: "#374151",
        margin: [0, 0, 0, 10],
      },
      {
        canvas: [
          { type: "line", x1: 0, y1: 0, x2: RULE_WIDTH, y2: 0, lineWidth: 2.5, lineColor: "#111827" },
        ],
      },
      {
        columns: [
          { text: "Asistente de Contratos IA", fontSize: 8.5, color: "#6b7280" },
          { text: today, fontSize: 8.5, color: "#6b7280", alignment: "right" },
        ],
        margin: [0, 6, 0, 22],
      },

      // ── Cuerpo del documento ──────────────────────────────────────────────
      ...markdownToNodes(content),
    ],

    defaultStyle: {
      font: "Roboto",
      fontSize: 11,
      color: "#1f2937",
      lineHeight: 1.55,
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfMake.createPdf(docDefinition as any).download(buildFilename(content));
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AiChat({ messages, setMessages }: AiChatProps) {
  const [input, setInput]       = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  const isWelcomeOnly = messages.length === 1 && messages[0].role === "ai";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const sendMessage = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || thinking) return;

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setThinking(true);

    fetch("https://megumin-estate-ai.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_message: content }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error del servidor (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: data.response ?? "Sin respuesta del servidor." },
        ]);
      })
      .catch((err: Error) => {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `⚠️ ${err.message}` },
        ]);
      })
      .finally(() => setThinking(false));
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
          <Bot size={17} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-800">Asistente IA</h1>
          <p className="text-[11px] text-slate-400">Powered by Megumin AI</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              setMessages([{ role: "ai", content: "¡Hola! Soy Megumin. ¿En qué te puedo ayudar con los contratos hoy?" }]);
              localStorage.removeItem("megumin_chat_history");
            }}
            title="Limpiar chat"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-150 cursor-pointer"
          >
            <Trash2 size={12} />
            Limpiar
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            En línea
          </span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 min-h-0"
        style={{ background: "radial-gradient(ellipse at 60% 0%, #eff6ff 0%, #f8fafc 55%)" }}
      >
        {messages.map((msg, i) =>
          msg.role === "ai" ? (
            <div key={i} className="flex items-start gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <Bot size={13} className="text-white" />
              </div>
              <div className="flex flex-col gap-1 max-w-[78%]">
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                {i > 0 && msg.content.length > 150 && <button
                  onClick={() => downloadPdf(msg.content)}
                  className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Descargar como PDF"
                >
                  <Download size={11} />
                  Descargar PDF
                </button>}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="bg-blue-600 rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[78%] shadow-sm">
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          )
        )}

        {/* Welcome suggestions */}
        {isWelcomeOnly && (
          <div className="mt-2 flex flex-col items-start gap-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">Sugerencias</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 shadow-sm cursor-pointer"
                >
                  <Sparkles size={11} className="text-blue-400" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {thinking && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
              <Bot size={13} className="text-white" />
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-md px-4 py-3.5 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms",   animationDuration: "900ms" }} />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "180ms", animationDuration: "900ms" }} />
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "360ms", animationDuration: "900ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex items-end gap-3 flex-shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          placeholder="Escribe las instrucciones para la IA..."
          rows={1}
          className="flex-1 resize-none text-sm text-slate-700 placeholder:text-slate-400 outline-none bg-transparent leading-relaxed overflow-y-auto"
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || thinking}
          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
            input.trim() && !thinking
              ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
              : "bg-slate-100 text-slate-300 cursor-not-allowed"
          }`}
        >
          <Send size={14} />
        </button>
      </div>

    </div>
  );
}
