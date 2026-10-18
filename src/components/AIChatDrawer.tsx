"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  MessageSquare,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

interface Message {
  role: "user" | "model";
  text: string;
}

const QUICK_QUESTIONS = [
  "តើត្រូវផ្ញើ Link ទៅគ្រូមុខវិជ្ជាដោយរបៀបណា?",
  "តើត្រូវគណនាចំណាត់ថ្នាក់សិស្សយ៉ាងដូចម្តេច?",
  "តើត្រូវ Sync ទិន្នន័យចូល Google Sheet យ៉ាងណា?",
  "តើសិស្សត្រូវចុះឈ្មោះដោយរបៀបណា?",
];

export default function AIChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "ជម្រាបសួរលោកគ្រូ អ្នកគ្រូ! ខ្ញុំជាជំនួយការ AI សម្រាប់ប្រព័ន្ធគ្រប់គ្រងវត្តមាន និងពិន្ទុសិស្ស។ តើលោកគ្រូអ្នកគ្រូមានចម្ងល់ ឬត្រូវការជំនួយពីរបៀបប្រើប្រាស់ប្រព័ន្ធនេះដែរឬទេ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = { role: "user", text: query };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-6),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "បរាជ័យក្នុងការទទួលបានចម្លើយ");
      }

      setMessages((prev) => [
        ...prev,
        { role: "model", text: data.reply },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `សូមអភ័យទោស មានបញ្ហាបច្ចេកទេស៖ ${msg}។ សូមព្យាយាមម្តងទៀត។`,
        },
      ]);
    } finally {
      setLoading(false);
      if (!isOpen) {
        setHasUnread(true);
      }
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: "model",
        text: "ការសន្ទនាត្រូវបានសម្អាតឡើងវិញ។ តើលោកគ្រូអ្នកគ្រូចង់សួរអ្វីបន្ថែមទៀតទេ?",
      },
    ]);
  };

  return (
    <>
      {/* Floating Action Button (Sits comfortably above mobile bottom bar) */}
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 print:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/35 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          title="បើកជំនួយការ AI សាលារៀន"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-200" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </div>
          <span className="hidden sm:inline">សួរ AI ជំនួយការ</span>
          <span className="sm:hidden font-bold">AI</span>
        </button>
      </div>

      {/* Slide-over Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden">
          {/* Drawer container */}
          <div className="bg-white w-full sm:w-[440px] h-[85vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white flex items-center justify-between border-b border-emerald-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/10 shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
                    <span>ជំនួយការ AI សាលារៀន</span>
                  </h3>
                  <p className="text-[11px] text-emerald-200/80 font-medium">
                    Google Gemini Flash ឆ្លើយជាភាសាខ្មែរ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="សម្អាតការសន្ទនា"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="បិទ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Questions Pills */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 overflow-x-auto no-scrollbar flex items-center gap-1.5 flex-nowrap text-[11px]">
              <span className="font-bold text-slate-500 whitespace-nowrap pl-1 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>សំណួររហ័ស៖</span>
              </span>
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition-all font-medium disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-100/40">
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isUser
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 text-amber-300"
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-emerald-600 text-white rounded-tr-xs shadow-xs"
                          : "bg-white text-slate-800 rounded-tl-xs border border-slate-200 shadow-xs"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-amber-300 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-xs border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                    <span className="ml-1 text-[11px]">Gemini កំពុងគិត...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-white border-t border-slate-200 space-y-1.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="សួរសំណួរពីរបៀបប្រើប្រាស់ប្រព័ន្ធ..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-bold transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
                  title="ផ្ញើសំណួរ"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>ជំនួយការឆ្លាតវៃសម្រាប់គ្រូបន្ទុកថ្នាក់ & គ្រូមុខវិជ្ជា</span>
                <span>Powered by Gemini</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
