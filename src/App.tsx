import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const H = "#dc3535";
const HL = "#fef0f0";
const S = "#059669";
const SL = "#ecfdf5";
const BG = "#fdf8f5";
const BG_SABA = "#d1fae5";
const BG_HASAN = "#fde8e8";
const TXT = "#3d2c26";
const MUT = "#9e8880";
const BR = "#f0ddd8";
const EMOJIS = ["❤️","😂","😍","😮","😢","👏","🔥","✨"];

const uc = (n: string) => n === "Hasan" ? H : S;
const ul = (n: string) => n === "Hasan" ? HL : SL;
const ft = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fd = (ts: number) => {
  const d = new Date(ts), t = new Date(), y = new Date(t);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};
const fLastSeen = (ts: number): string => {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 30000) return "online";
  const d = new Date(ts), t = new Date(), y = new Date(t);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return `last seen today at ${ft(ts)}`;
  if (d.toDateString() === y.toDateString()) return `last seen yesterday at ${ft(ts)}`;
  return `last seen ${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}`;
};
const isEmojiOnly = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\uFE0F\s]+$/u;
  const matches = trimmed.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu);
  return emojiRegex.test(trimmed) && matches !== null && matches.length <= 6;
};

function ping() {
  try {
    const a = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(1046, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, a.currentTime + 0.15);
    g.gain.setValueAtTime(0.22, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.45);
    o.start(); o.stop(a.currentTime + 0.45);
  } catch (e) {}
}

async function compress(file: File): Promise<string> {
  return new Promise(res => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const M = 480; let [w, h] = [img.width, img.height];
      if (w > M || h > M) { if (w > h) { h = Math.round(h * M / w); w = M; } else { w = Math.round(w * M / h); h = M; } }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.6));
    };
    img.src = url;
  });
}

interface ReplyTo { id: string; sender: string; text: string | null; imageData: string | null; }
interface Message {
  id: string; sender: string; text: string | null; imageData: string | null;
  gifUrl: string | null; reactions: Record<string, string[]>; ts: number;
  replyTo?: ReplyTo | null; starred?: boolean; edited?: boolean; type?: string;
}
interface PinnedData { message_id: string; pinned_by: string; pinned_at: number; }

// ── Floating heart positions (fixed to avoid random re-renders) ─────────────
const FLOAT_HEARTS = [
  { left: "8%",  delay: "0s",    size: 22, dur: "3.2s" },
  { left: "18%", delay: "0.6s",  size: 16, dur: "2.8s" },
  { left: "30%", delay: "1.1s",  size: 28, dur: "3.5s" },
  { left: "44%", delay: "0.3s",  size: 18, dur: "2.6s" },
  { left: "58%", delay: "0.9s",  size: 24, dur: "3.0s" },
  { left: "70%", delay: "0.2s",  size: 14, dur: "3.8s" },
  { left: "80%", delay: "1.4s",  size: 20, dur: "2.9s" },
  { left: "90%", delay: "0.7s",  size: 26, dur: "3.3s" },
];

// ── HeartBanner ──────────────────────────────────────────────────────────────
function HeartBanner({ sender, onDismiss }: { sender: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div onClick={onDismiss} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(45,10,10,0.85)", backdropFilter: "blur(3px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "hbFade 0.4s ease" }}>
      <style>{`
        @keyframes hbFade { from { opacity:0 } to { opacity:1 } }
        @keyframes heartPop { 0% { transform:scale(0.4); opacity:0 } 65% { transform:scale(1.18) } 100% { transform:scale(1); opacity:1 } }
        @keyframes floatHeart { 0% { transform:translateY(0) scale(1); opacity:0.75 } 100% { transform:translateY(-200px) scale(0.2); opacity:0 } }
        @keyframes textRise { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes hbPulse { 0%,100% { transform:scale(1) } 50% { transform:scale(1.08) } }
      `}</style>
      {FLOAT_HEARTS.map((h, i) => (
        <div key={i} style={{ position: "absolute", bottom: "12%", left: h.left, fontSize: h.size, color: "#ff6b8a", opacity: 0, animation: `floatHeart ${h.dur} ${h.delay} infinite ease-out`, pointerEvents: "none", userSelect: "none" }}>♥</div>
      ))}
      <div style={{ fontSize: 96, lineHeight: 1, animation: "heartPop 0.7s ease forwards, hbPulse 1.8s 0.7s ease-in-out infinite", filter: "drop-shadow(0 0 30px rgba(255,60,100,0.7))", marginBottom: 36 }}>♥</div>
      <div style={{ animation: "textRise 0.6s 0.5s ease both", textAlign: "center", padding: "0 40px" }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 400, color: "white", letterSpacing: 0.5, lineHeight: 1.25, marginBottom: 12 }}>{sender} sent you a heart</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" }}>tap anywhere to close</p>
      </div>
    </div>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "lbFade 0.15s ease" }}>
      <style>{`@keyframes lbFade { from { opacity:0 } to { opacity:1 } }`}</style>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: "white", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      <img src={src} onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }} />
    </div>
  );
}

// ── NewMsgBanner ──────────────────────────────────────────────────────────────
function NewMsgBanner({ count, onJump, onDismiss }: { count: number; onJump: () => void; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 7000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "center", marginBottom: 4 }}>
      <style>{`@keyframes nmSlide { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:translateY(0) } }`}</style>
      <div onClick={onJump} style={{ background: "rgba(255,255,255,0.96)", borderRadius: 20, padding: "7px 14px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${BR}`, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", animation: "nmSlide 0.3s ease", cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 13 }}>↓</span>
        <span style={{ fontSize: 13, color: TXT }}>{count} new message{count > 1 ? "s" : ""}</span>
        <button onClick={e => { e.stopPropagation(); onDismiss(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: MUT, padding: 0, marginLeft: 2, lineHeight: 1 }}>✕</button>
      </div>
    </div>
  );
}

// ── PinnedMessageBar ──────────────────────────────────────────────────────────
function PinnedMessageBar({ msg, onScrollTo, onUnpin }: { msg: Message; onScrollTo: () => void; onUnpin: () => void }) {
  return (
    <div style={{ background: "white", borderBottom: `1px solid ${BR}`, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, cursor: "pointer" }} onClick={onScrollTo}>
      <div style={{ width: 2, height: 28, background: "#d4a0a8", borderRadius: 1, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: MUT, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 1 }}>Pinned</div>
        <div style={{ fontSize: 12, color: TXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {msg.type === "heart" ? "♥ Heart" : msg.imageData ? "📷 Photo" : msg.gifUrl ? "GIF" : msg.text || ""}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onUnpin(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: MUT, padding: "0 2px", flexShrink: 0 }}>✕</button>
    </div>
  );
}

// ── MemoryJar (self-contained) ────────────────────────────────────────────────
function MemoryJar({ onBack }: { onBack: () => void }) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("messages").select("*").eq("starred", true).order("ts", { ascending: true })
      .then(({ data }) => { setMsgs((data || []) as Message[]); setLoading(false); });
  }, []);

  const unstar = async (id: string) => {
    await supabase.from("messages").update({ starred: false }).eq("id", id);
    setMsgs(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: BG }}>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <div style={{ background: "white", borderBottom: `1px solid ${BR}`, height: 60, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: MUT, display: "flex", alignItems: "center", padding: "0 2px" }}>←</button>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 400, color: TXT }}>Memory Jar</div>
        <div style={{ fontSize: 16, color: "#d4a0a8", marginTop: 2 }}>✦</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {loading && <div style={{ textAlign: "center", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: MUT, padding: 40, fontSize: 18 }}>Loading…</div>}
        {!loading && msgs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 10 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: TXT }}>Nothing here yet</div>
            <div style={{ fontSize: 13, color: MUT }}>Star messages in the chat to save them here.</div>
          </div>
        )}
        {msgs.map(msg => (
          <div key={msg.id} style={{ background: "white", borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: `1px solid ${BR}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: uc(msg.sender) }}>{msg.sender}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 11, color: MUT }}>{ft(msg.ts)} · {fd(msg.ts)}</div>
                <button onClick={() => unstar(msg.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 17, color: "#e0a0c0", lineHeight: 1, padding: 0 }} title="Unstar">★</button>
              </div>
            </div>
            {msg.imageData && <img src={msg.imageData} alt="" onClick={() => setLightboxSrc(msg.imageData!)} style={{ maxWidth: "100%", borderRadius: 8, display: "block", marginBottom: msg.text ? 6 : 0, cursor: "pointer" }} />}
            {msg.gifUrl && <img src={msg.gifUrl} alt="" style={{ maxWidth: 160, borderRadius: 8, display: "block", marginBottom: msg.text ? 6 : 0 }} />}
            {msg.type === "heart" ? (
              <div style={{ fontSize: 13, color: "#d4a0a8", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>{msg.sender} sent a heart ♥</div>
            ) : msg.text ? (
              <div style={{ fontSize: 14, color: TXT, lineHeight: 1.5 }}>{msg.text}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LoginScreen ───────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onJar }: { onLogin: (name: string) => void; onJar: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: BG, padding: "2rem" }}>
      <p style={{ fontSize: 16, color: MUT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Tickle the tism'</p>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 46, fontWeight: 400, color: TXT, marginBottom: 6, letterSpacing: -0.5 }}>Hasan & Saba</h1>
      <p style={{ fontSize: 16, color: MUT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 52 }}>The Seventh Infinity Stone</p>
      <p style={{ fontSize: 11, color: MUT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>Who are you?</p>
      <div style={{ display: "flex", gap: 14, marginBottom: 36 }}>
        {["Hasan", "Saba"].map(n => (
          <button key={n} onClick={() => onLogin(n)}
            style={{ padding: "13px 40px", borderRadius: 50, border: `2px solid ${uc(n)}`, background: "white", fontSize: 15, fontWeight: 500, color: uc(n), cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = ul(n)}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "white"}>
            {n}
          </button>
        ))}
      </div>
      <button onClick={onJar}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: MUT, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", padding: "6px 12px", borderRadius: 20, transition: "color 0.15s" }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = TXT}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = MUT}>
        ✦ Memory Jar
      </button>
    </div>
  );
}

// ── ReplyPreview ──────────────────────────────────────────────────────────────
function ReplyPreview({ replyTo, onCancel, user }: { replyTo: ReplyTo; onCancel: () => void; user: string }) {
  return (
    <div style={{ background: "white", borderTop: `1px solid ${BR}`, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ width: 3, borderRadius: 2, background: uc(replyTo.sender), alignSelf: "stretch", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: uc(replyTo.sender), marginBottom: 2 }}>{replyTo.sender === user ? "You" : replyTo.sender}</div>
        <div style={{ fontSize: 12, color: MUT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{replyTo.imageData ? "📷 Photo" : replyTo.text || ""}</div>
      </div>
      <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: MUT, padding: "0 4px", flexShrink: 0 }}>✕</button>
    </div>
  );
}

// ── MsgItem ───────────────────────────────────────────────────────────────────
function MsgItem({ msg, user, isSeenLast, isFirstInRun, onReact, onDelete, onReply, onImageClick, onStar, onPin }: {
  msg: Message; user: string; isSeenLast: boolean; isFirstInRun: boolean;
  onReact: (id: string, emoji: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReply: (msg: Message) => void;
  onImageClick: (src: string) => void;
  onStar: (id: string) => Promise<void>;
  onPin: (msg: Message) => Promise<void>;
}) {
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text || "");
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeTriggered = useRef(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const mine = msg.sender === user;
  const color = uc(msg.sender);
  const light = ul(msg.sender);
  const reactions = Object.entries(msg.reactions || {}).filter(([, u]) => u.length > 0);
  const emojiOnly = msg.text && msg.type !== "heart" ? isEmojiOnly(msg.text) : false;
  const emojiCount = emojiOnly && msg.text ? (msg.text.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu) || []).length : 0;
  const emojiFontSize = emojiCount === 1 ? 52 : emojiCount <= 3 ? 42 : 34;

  useEffect(() => { if (editing) editRef.current?.focus(); }, [editing]);

  const saveEdit = async () => {
    const newText = editText.trim();
    if (!newText || newText === msg.text) { setEditing(false); return; }
    try { await supabase.from("messages").update({ text: newText, edited: true }).eq("id", msg.id); } catch (e) {}
    setEditing(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeTriggered.current = false;
    setSwiping(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dy) > Math.abs(dx)) { setSwiping(false); setSwipeX(0); return; }
    if (mine && dx < 0) setSwipeX(Math.max(dx, -70));
    else if (!mine && dx > 0) setSwipeX(Math.min(dx, 70));
    if (Math.abs(dx) > 50 && !swipeTriggered.current) {
      swipeTriggered.current = true;
      onReply(msg);
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
    }
  };
  const handleTouchEnd = () => { setSwipeX(0); setSwiping(false); };

  // Heart messages render as centred system messages
  if (msg.type === "heart") {
    return (
      <div id={`msg-${msg.id}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 16px", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#d4a0a8" }}>♥</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 15, color: MUT }}>{msg.sender} sent a heart</span>
          <span style={{ fontSize: 13, color: "#d4a0a8" }}>♥</span>
        </div>
        <div style={{ fontSize: 10, color: "#c0b0a8", marginTop: 2 }}>{ft(msg.ts)}</div>
      </div>
    );
  }

  const actionBtn = (content: React.ReactNode, onClick: () => void, title?: string, extraStyle?: React.CSSProperties) => (
    <button onClick={onClick} title={title}
      style={{ width: 22, height: 22, borderRadius: "50%", background: "white", border: "1px solid #eee", cursor: "pointer", fontSize: 12, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...extraStyle }}>
      {content}
    </button>
  );

  return (
    <div id={`msg-${msg.id}`}
      style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginBottom: 2, width: "100%", boxSizing: "border-box", padding: "0 8px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPickerOpen(false); }}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
    >
      {!mine && isFirstInRun && (
        <div style={{ fontSize: 11, color, fontWeight: 500, marginBottom: 3, paddingLeft: 4 }}>{msg.sender}</div>
      )}

      {msg.replyTo && (
        <div style={{ maxWidth: "75%", marginBottom: 4, background: mine ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.05)", borderRadius: 10, padding: "5px 10px", borderLeft: `3px solid ${uc(msg.replyTo.sender)}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: uc(msg.replyTo.sender), marginBottom: 2 }}>{msg.replyTo.sender === user ? "You" : msg.replyTo.sender}</div>
          <div style={{ fontSize: 12, color: MUT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg.replyTo.imageData ? "📷 Photo" : msg.replyTo.text || ""}</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", alignItems: "flex-end", gap: 6 }}>
        <span style={{ fontSize: 10, color: "#c0b0a8", flexShrink: 0, paddingBottom: 2, whiteSpace: "nowrap" }}>{ft(msg.ts)}</span>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, flexDirection: mine ? "row-reverse" : "row", maxWidth: "min(68vw, 300px)", transform: `translateX(${swipeX}px)`, transition: swiping ? "none" : "transform 0.2s ease" }}>
          {hovered && mine && (
            <button onClick={() => onDelete(msg.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#ccc", padding: "0 2px", flexShrink: 0 }}>✕</button>
          )}
          {hovered && mine && msg.text && actionBtn("✏", () => { setEditText(msg.text || ""); setEditing(true); }, "Edit")}
          {hovered && actionBtn("📌", () => onPin(msg), "Pin", { fontSize: 11 })}
          {hovered && actionBtn("★", () => onStar(msg.id), msg.starred ? "Unstar" : "Star", { color: msg.starred ? "#e0a0c0" : "#ccc", fontSize: 14 })}
          {hovered && actionBtn("↩", () => onReply(msg), "Reply")}
          {hovered && actionBtn("+", e => { setPickerOpen(v => !v); }, "React", { fontSize: 14 })}

          <div style={{ maxWidth: "100%", minWidth: 0 }}>
            {msg.imageData && <img src={msg.imageData} alt="" onClick={() => onImageClick(msg.imageData!)} style={{ maxWidth: "100%", borderRadius: 12, display: "block", marginBottom: msg.text ? 4 : 0, cursor: "pointer" }} />}
            {msg.gifUrl && <img src={msg.gifUrl} alt="" onClick={() => onImageClick(msg.gifUrl!)} style={{ maxWidth: 200, borderRadius: 12, display: "block", marginBottom: msg.text ? 4 : 0, cursor: "pointer" }} />}
            {msg.text && !editing && (
              emojiOnly ? (
                <div style={{ fontSize: emojiFontSize, lineHeight: 1.15, padding: "2px 4px", userSelect: "none" }}>
                  {msg.text}{msg.edited && <span style={{ fontSize: 10, color: MUT, marginLeft: 4 }}>(edited)</span>}
                </div>
              ) : (
                <div style={{ background: mine ? color : light, color: mine ? "white" : TXT, padding: "9px 14px", borderRadius: 18, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4, fontSize: 14, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                  {msg.text}{msg.edited && <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 6 }}>(edited)</span>}
                </div>
              )
            )}
            {editing && (
              <div style={{ background: mine ? color : light, borderRadius: 18, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4, padding: "6px 10px" }}>
                <textarea ref={editRef} value={editText} onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") setEditing(false); }}
                  onBlur={saveEdit}
                  style={{ background: "transparent", border: "none", color: mine ? "white" : TXT, fontSize: 14, lineHeight: 1.5, resize: "none", width: "100%", outline: "none", fontFamily: "'DM Sans', sans-serif", minWidth: 100 }} rows={1} />
              </div>
            )}
          </div>
        </div>
      </div>

      {pickerOpen && (
        <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 3, padding: "4px 8px", background: "white", borderRadius: 22, border: "1px solid #eee", marginTop: 5, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => { onReact(msg.id, e); setPickerOpen(false); }}
              style={{ background: (msg.reactions?.[e] || []).includes(user) ? "#f5f5f5" : "none", border: "none", cursor: "pointer", fontSize: 18, padding: "2px 3px", borderRadius: 6 }}>{e}</button>
          ))}
        </div>
      )}

      {reactions.length > 0 && (
        <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap", justifyContent: mine ? "flex-end" : "flex-start" }}>
          {reactions.map(([emoji, users]) => (
            <span key={emoji} onClick={() => onReact(msg.id, emoji)}
              style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: "2px 7px", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}>
              {emoji}<span style={{ fontSize: 10, color: MUT }}>{users.length}</span>
            </span>
          ))}
        </div>
      )}

      {isSeenLast && mine && (
        <div style={{ fontSize: 10, color, fontWeight: 500, marginTop: 2, paddingRight: 4 }}>✓✓ Seen</div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<"login" | "chat" | "jar">("login");
  const [user, setUser] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [seenOther, setSeenOther] = useState(0);
  const [otherLastSeen, setOtherLastSeen] = useState(0);
  const [otherTyping, setOtherTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [heartBanner, setHeartBanner] = useState<{ sender: string } | null>(null);
  const [newMsgBanner, setNewMsgBanner] = useState<{ count: number; firstId: string } | null>(null);
  const [pinnedData, setPinnedData] = useState<PinnedData | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const countRef = useRef(0);
  const userRef = useRef<string | null>(null);
  const subRef = useRef<any>(null);
  const inputFocusedRef = useRef(false);
  const typingTimerRef = useRef<any>(null);
  const newBannerCheckedRef = useRef(false);

  useEffect(() => { userRef.current = user; }, [user]);

  const other = user === "Hasan" ? "Saba" : "Hasan";
  const chatBg = user === "Saba" ? BG_SABA : user === "Hasan" ? BG_HASAN : BG;

  const scrollToMsg = useCallback((id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const loadMsgs = async (notify = false): Promise<Message[]> => {
    const u = userRef.current;
    if (!u) return [];
    try {
      const { data: arr, error } = await supabase.from("messages").select("*").order("ts", { ascending: true });
      if (error) throw error;
      const messages = (arr || []) as Message[];

      if (notify && messages.length > countRef.current) {
        const newOnes = messages.slice(countRef.current);
        if (newOnes.some((m: Message) => m.sender !== u && m.type !== "heart")) ping();
      }
      countRef.current = messages.length;
      setMsgs(messages);

      const otherUser = u === "Hasan" ? "Saba" : "Hasan";

      // Other user's seen + last seen
      const { data: seenData } = await supabase.from("seen_status").select("last_seen").eq("username", otherUser).maybeSingle();
      if (seenData) { setSeenOther(seenData.last_seen || 0); setOtherLastSeen(seenData.last_seen || 0); }

      // Other user's typing
      const { data: typingData } = await supabase.from("typing_status").select("*").eq("username", otherUser).maybeSingle();
      if (typingData) {
        const fresh = Date.now() - (typingData.updated_at || 0) < 4000;
        setOtherTyping(typingData.is_typing && fresh);
      }

      // Pinned message
      const { data: pinData } = await supabase.from("pinned_message").select("*").eq("id", "pin").maybeSingle();
      setPinnedData(pinData ? (pinData as PinnedData) : null);

      // Pending heart for me
      const { data: heartData } = await supabase.from("heart_pending").select("*").eq("recipient", u).maybeSingle();
      if (heartData && !heartData.seen) {
        setHeartBanner({ sender: heartData.sender });
        await supabase.from("heart_pending").update({ seen: true }).eq("recipient", u);
      }

      return messages;
    } catch (e) { console.error("loadMsgs error:", e); setMsgs([]); return []; }
  };

  const updateSeen = async () => {
    const u = userRef.current;
    if (!u) return;
    try { await supabase.from("seen_status").upsert({ username: u, last_seen: Date.now() }, { onConflict: "username" }); } catch (e) {}
  };

  const updateTyping = async (val: boolean) => {
    const u = userRef.current;
    if (!u) return;
    try { await supabase.from("typing_status").upsert({ username: u, is_typing: val, updated_at: Date.now() }, { onConflict: "username" }); } catch (e) {}
  };

  useEffect(() => {
    if (!user) return;
    newBannerCheckedRef.current = false;
    setLoading(true);

    const init = async () => {
      // Grab my prev last_seen before updating (for new message banner)
      const { data: mySeenData } = await supabase.from("seen_status").select("last_seen").eq("username", user).maybeSingle();
      const prevLastSeen = mySeenData?.last_seen || 0;

      const messages = await loadMsgs();
      setLoading(false);

      if (!newBannerCheckedRef.current && messages.length > 0) {
        newBannerCheckedRef.current = true;
        const otherUser = user === "Hasan" ? "Saba" : "Hasan";
        const fresh = messages.filter((m: Message) => m.sender === otherUser && m.ts > prevLastSeen && m.type !== "heart");
        if (fresh.length > 0) setNewMsgBanner({ count: fresh.length, firstId: fresh[0].id });
      }
    };

    init();
    updateSeen();

    const pi = setInterval(() => loadMsgs(true), 3000);
    const si = setInterval(updateSeen, 5000);

    const sub = supabase.channel(`chat-${user}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadMsgs(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "typing_status" }, (payload: any) => {
        const otherUser = userRef.current === "Hasan" ? "Saba" : "Hasan";
        if (payload.new?.username === otherUser) {
          const fresh = Date.now() - (payload.new?.updated_at || 0) < 4000;
          setOtherTyping(payload.new?.is_typing && fresh);
        }
      })
      .subscribe();
    subRef.current = sub;

    return () => {
      clearInterval(pi);
      clearInterval(si);
      if (subRef.current) supabase.removeChannel(subRef.current);
      updateTyping(false);
    };
  }, [user]);

  // Scroll to bottom when typing
useEffect(() => {
  if (!inputFocusedRef.current) return;
  const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  return () => clearTimeout(t);
}, [msgs]);

// Initial scroll to bottom on load
useEffect(() => {
  if (!loading && msgs.length > 0) {
    const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 150);
    return () => clearTimeout(t);
  }
}, [loading]);

  const handleReply = (msg: Message) => {
    setReplyTo({ id: msg.id, sender: msg.sender, text: msg.text, imageData: msg.imageData });
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    updateTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => updateTyping(false), 2000);
  };

  const send = async (extra: { imageData?: string } = {}) => {
    if (sending) return;
    const text = input.trim();
    if (!text && !extra.imageData) return;
    setSending(true);
    setInput("");
    const currentReply = replyTo;
    setReplyTo(null);
    updateTyping(false);
    clearTimeout(typingTimerRef.current);

    const nm: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender: user!, text: text || null, imageData: extra.imageData || null,
      gifUrl: null, reactions: {}, ts: Date.now(),
      replyTo: currentReply || null, type: "text", starred: false, edited: false
    };

    try {
      const { error } = await supabase.from("messages").insert(nm);
      if (error) throw error;
      await loadMsgs();
    } catch (e) { console.error("send error:", e); }

    setSending(false);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.scrollIntoView({ block: "nearest" }); }, 50);
    await updateSeen();
  };

const sendHeart = async () => {
  const recipient = user === "Hasan" ? "Saba" : "Hasan";
  const heartMsg: Message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sender: user!, text: null, imageData: null, gifUrl: null,
    reactions: {}, ts: Date.now(), type: "heart", starred: false, edited: false
  };
  try {
    await supabase.from("messages").insert(heartMsg);
    // Delete first, then insert fresh — guarantees seen is always false
    await supabase.from("heart_pending").delete().eq("recipient", recipient);
    await supabase.from("heart_pending").insert({
      recipient,
      sender: user!,
      sent_at: Date.now(),
      seen: false
    });
    await loadMsgs();
  } catch (e) { console.error("sendHeart error:", e); }
};

  const deleteMsg = async (id: string) => {
    try { await supabase.from("messages").delete().eq("id", id); await loadMsgs(); } catch (e) {}
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    try {
      const msg = msgs.find(m => m.id === msgId);
      if (!msg) return;
      const reactions = { ...msg.reactions };
      if (!reactions[emoji]) reactions[emoji] = [];
      if (reactions[emoji].includes(user!)) {
        reactions[emoji] = reactions[emoji].filter(u => u !== user);
        if (!reactions[emoji].length) delete reactions[emoji];
      } else { reactions[emoji] = [...reactions[emoji], user!]; }
      await supabase.from("messages").update({ reactions }).eq("id", msgId);
      await loadMsgs();
    } catch (e) {}
  };

  const toggleStar = async (msgId: string) => {
    try {
      const msg = msgs.find(m => m.id === msgId);
      if (!msg) return;
      await supabase.from("messages").update({ starred: !msg.starred }).eq("id", msgId);
      await loadMsgs();
    } catch (e) {}
  };

  const pinMessage = async (msg: Message) => {
    try {
      if (pinnedData?.message_id === msg.id) {
        await supabase.from("pinned_message").delete().eq("id", "pin");
        setPinnedData(null); return;
      }
      const pin = { id: "pin", message_id: msg.id, pinned_by: user!, pinned_at: Date.now() };
      await supabase.from("pinned_message").upsert(pin, { onConflict: "id" });
      setPinnedData({ message_id: msg.id, pinned_by: user!, pinned_at: Date.now() });
    } catch (e) {}
  };

  const unpinMessage = async () => {
    try { await supabase.from("pinned_message").delete().eq("id", "pin"); setPinnedData(null); } catch (e) {}
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const imageData = await compress(file);
    e.target.value = "";
    await send({ imageData });
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMobile) return;
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) { e.preventDefault(); send(); }
  };

  // Build grouped list
const grouped: Array<{ type: string; label?: string; key?: string; msg?: Message; isFirstInRun?: boolean }> = [];
let lastDay: string | null = null;
let lastSender: string | null = null;
let newDividerAdded = false;
for (const msg of msgs) {
  const day = fd(msg.ts);
  if (day !== lastDay) { grouped.push({ type: "day", label: day, key: `d${msg.ts}` }); lastDay = day; lastSender = null; }
  // Add "new messages" divider
  if (!newDividerAdded && newMsgBanner && msg.id === newMsgBanner.firstId) {
    grouped.push({ type: "newdivider", key: "newdivider" });
    newDividerAdded = true;
  }
  const isFirstInRun = msg.sender !== lastSender || msg.type === "heart";
  grouped.push({ type: "msg", msg, isFirstInRun });
  lastSender = msg.type === "heart" ? null : msg.sender;
}

  const myMsgs = msgs.filter(m => m.sender === user);
  let lastSeenId: string | null = null;
  for (const m of myMsgs) { if (seenOther >= m.ts) lastSeenId = m.id; }

  const pinnedMsgObj = pinnedData ? msgs.find(m => m.id === pinnedData.message_id) : null;
  const headerSubtitle = otherTyping ? `${other} is typing…` : fLastSeen(otherLastSeen);

  // ── Views ──
  if (view === "jar") return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;font-family:'DM Sans',sans-serif}`}</style>
      <MemoryJar onBack={() => setView("login")} />
    </>
  );

  if (view === "login" || !user) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;font-family:'DM Sans',sans-serif}`}</style>
      <LoginScreen onLogin={name => { setUser(name); setView("chat"); }} onJar={() => setView("jar")} />
    </>
  );

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;}textarea,input{font-family:'DM Sans',sans-serif;}textarea:focus,input:focus{outline:none;}`}</style>

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {heartBanner && <HeartBanner sender={heartBanner.sender} onDismiss={() => setHeartBanner(null)} />}

      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: chatBg }}>

        {/* Header */}
        <div style={{ background: "white", borderBottom: `1px solid ${BR}`, minHeight: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, color: uc(other) }}>{other}</div>
            {headerSubtitle && (
              <div style={{ fontSize: 11, color: otherTyping ? uc(other) : MUT, marginTop: 1, letterSpacing: "0.02em", fontStyle: otherTyping ? "italic" : "normal" }}>{headerSubtitle}</div>
            )}
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, letterSpacing: 4, color: "#d4a0a8" }}>♡</div>
          <div style={{ textAlign: "right" }}>
            <button onClick={() => { setUser(null); setView("login"); setMsgs([]); countRef.current = 0; }} style={{ display: "block", background: "none", border: "none", fontSize: 11, color: MUT, cursor: "pointer", letterSpacing: "0.05em", marginLeft: "auto" }}>switch</button>
            <div style={{ fontSize: 13, fontWeight: 500, color: uc(user) }}>{user}</div>
          </div>
        </div>

        {/* Pinned bar */}
        {pinnedMsgObj && <PinnedMessageBar msg={pinnedMsgObj} onScrollTo={() => scrollToMsg(pinnedMsgObj.id)} onUnpin={unpinMessage} />}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {newMsgBanner && (
            <NewMsgBanner count={newMsgBanner.count} onJump={() => { scrollToMsg(newMsgBanner.firstId); setNewMsgBanner(null); }} onDismiss={() => setNewMsgBanner(null)} />
          )}
          {loading && <div style={{ textAlign: "center", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: MUT, padding: 40, fontSize: 18 }}>Loading…</div>}
          {!loading && msgs.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 80 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: TXT }}>Say hello ♡</div>
              <div style={{ fontSize: 13, color: MUT }}>Just for the two of you.</div>
            </div>
          )}
         {grouped.map(item => item.type === "day" ? (
  <div key={item.key} style={{ textAlign: "center", fontSize: 11, color: MUT, letterSpacing: "0.08em", textTransform: "uppercase", margin: "4px 0" }}>{item.label}</div>
) : item.type === "newdivider" ? (
  <div key="newdivider" style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
    <div style={{ flex: 1, height: 1, background: BR }} />
    <span style={{ fontSize: 11, color: MUT, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>New messages</span>
    <div style={{ flex: 1, height: 1, background: BR }} />
  </div>
) : (
            <MsgItem key={item.msg!.id} msg={item.msg!} user={user} isSeenLast={item.msg!.id === lastSeenId}
              isFirstInRun={item.isFirstInRun!} onReact={toggleReaction} onDelete={deleteMsg}
              onReply={handleReply} onImageClick={setLightboxSrc} onStar={toggleStar} onPin={pinMessage} />
          ))}
          <div ref={bottomRef} />
        </div>

        {replyTo && <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} user={user} />}

        {/* Input area */}
        <div style={{ background: "white", borderTop: `1px solid ${BR}`, padding: "10px 12px", display: "flex", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />

          <button onClick={() => fileRef.current?.click()} title="Send photo"
            style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${BR}`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
            📷
          </button>

          <button onClick={sendHeart} title="Send heart"
            style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${BR}`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0, color: "#e0405a", transition: "transform 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.15)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"}>
            ♥
          </button>

          <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKey}
            onFocus={() => { inputFocusedRef.current = true; setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 150); }}
            onBlur={() => { inputFocusedRef.current = false; updateTyping(false); }}
            placeholder={`Message ${other}…`} rows={1}
            style={{ flex: 1, border: `1.5px solid ${BR}`, borderRadius: 20, padding: "9px 14px", fontSize: 14, color: TXT, background: chatBg, resize: "none", minHeight: 38, maxHeight: 100, lineHeight: 1.4 }} />

          <button onMouseDown={e => e.preventDefault()} onClick={() => send()} disabled={!input.trim() || sending}
            style={{ width: 38, height: 38, borderRadius: "50%", background: uc(user), border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: input.trim() ? 1 : 0.5, transition: "opacity 0.2s" }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </div>
    </>
  );
}
