"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  User,
  HelpCircle,
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

const BOT_AVATAR = "/images/ai-bot.png";

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

  // Position for draggable floating button
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });
  const hasMovedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize position on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ai_bot_pos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const x = Math.min(Math.max(10, parsed.x), window.innerWidth - 75);
          const y = Math.min(Math.max(10, parsed.y), window.innerHeight - 140);
          setPosition({ x, y });
          return;
        } catch (e) {
          console.error(e);
        }
      }
      // Default initial position (bottom right, above mobile bottom bar)
      const defaultX = Math.max(10, window.innerWidth - 75);
      const defaultY = Math.max(10, window.innerHeight - 150);
      setPosition({ x: defaultX, y: defaultY });
    }
  }, []);

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

  // Handle Touch Drag (Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!position) return;
    const touch = e.touches[0];
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartRef.current.startX;
    const deltaY = touch.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      hasMovedRef.current = true;
    }

    const newX = Math.min(
      Math.max(10, dragStartRef.current.posX + deltaX),
      window.innerWidth - 70
    );
    const newY = Math.min(
      Math.max(10, dragStartRef.current.posY + deltaY),
      window.innerHeight - 80
    );

    setPosition({ x: newX, y: newY });
  }, []);

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);

    if (!hasMovedRef.current) {
      // Tap detected -> Toggle Drawer
      setIsOpen((prev) => !prev);
    } else if (position) {
      localStorage.setItem("ai_bot_pos", JSON.stringify(position));
    }
  };

  // Handle Mouse Drag (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!position) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = ev.clientX - dragStartRef.current.startX;
      const deltaY = ev.clientY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        hasMovedRef.current = true;
      }

      const newX = Math.min(
        Math.max(10, dragStartRef.current.posX + deltaX),
        window.innerWidth - 70
      );
      const newY = Math.min(
        Math.max(10, dragStartRef.current.posY + deltaY),
        window.innerHeight - 80
      );

      setPosition({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      if (!hasMovedRef.current) {
        setIsOpen((prev) => !prev);
      } else {
        setPosition((curr) => {
          if (curr) {
            localStorage.setItem("ai_bot_pos", JSON.stringify(curr));
          }
          return curr;
        });
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

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
      {/* Draggable Circular Robot Floating Button (Like Image 2) */}
      <div
        style={
          position
            ? { left: `${position.x}px`, top: `${position.y}px` }
            : { right: "16px", bottom: "140px" }
        }
        className={`fixed z-40 print:hidden select-none touch-none ${
          isDragging ? "cursor-grabbing scale-105" : "cursor-grab"
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="relative group">
          {/* Animated Glow Halo */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 opacity-60 blur-xs group-hover:opacity-100 transition-opacity animate-pulse" />

          {/* Circular Button Container */}
          <button
            type="button"
            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/95 p-1 border-2 border-white shadow-2xl shadow-cyan-500/30 ring-2 ring-teal-400/60 overflow-hidden flex items-center justify-center transition-transform active:scale-95 hover:scale-105 cursor-pointer backdrop-blur"
            title="អូសទៅកន្លែងណាក៏បាន ឬចុចដើម្បីសួរ AI"
          >
            {/* Robot Image */}
            <div className="w-full h-full rounded-full overflow-hidden relative">
              <Image
                src={BOT_AVATAR}
                alt="AI Assistant"
                fill
                sizes="(max-width: 640px) 56px, 64px"
                className="object-cover rounded-full pointer-events-none"
                priority
              />
            </div>

            {/* Unread indicator */}
            {hasUnread && (
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-white animate-bounce" />
            )}
          </button>

          {/* Tiny label badge */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-900/85 text-white font-bold text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs border border-white/20 pointer-events-none flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
            <span>សួរ AI</span>
          </div>
        </div>
      </div>

      {/* Slide-over Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden">
          {/* Drawer container */}
          <div className="bg-white w-full sm:w-[440px] h-[85vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-teal-700 via-emerald-700 to-slate-900 text-white flex items-center justify-between border-b border-teal-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/80 shadow-md relative flex-shrink-0 bg-white">
                  <Image
                    src={BOT_AVATAR}
                    alt="AI Assistant"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
                    <span>ជំនួយការ AI សាលារៀន</span>
                  </h3>
                  <p className="text-[11px] text-teal-200/90 font-medium">
                    Google Gemini ឆ្លើយជាភាសាខ្មែរ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="សម្អាតការសន្ទនា"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="បិទ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Questions Pills */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 overflow-x-auto no-scrollbar flex items-center gap-1.5 flex-nowrap text-[11px]">
              <span className="font-bold text-slate-500 whitespace-nowrap pl-1 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>សំណួររហ័ស៖</span>
              </span>
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 transition-all font-medium disabled:opacity-50 cursor-pointer shadow-2xs"
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
                    {isUser ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-xs">
                        <User className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-teal-300 shadow-xs relative flex-shrink-0 bg-white">
                        <Image
                          src={BOT_AVATAR}
                          alt="AI"
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-emerald-600 text-white rounded-tr-xs shadow-xs font-medium"
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
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-teal-300 shadow-xs relative flex-shrink-0 bg-white">
                    <Image
                      src={BOT_AVATAR}
                      alt="AI"
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-xs border border-slate-200 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce" />
                    <span
                      className="w-2 h-2 rounded-full bg-teal-600 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-teal-600 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                    <span className="ml-1 text-[11px] font-medium text-slate-600">
                      Gemini កំពុងគិត...
                    </span>
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
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white font-bold transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
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
