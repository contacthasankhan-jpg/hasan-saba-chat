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

const NIGHT_OTHER_HASAN = "#7a1f1f";
const NIGHT_OTHER_SABA = "#0f5c3a";

const QUICK_EMOJIS = ["❤️", "😂", "😢", "😮", "🔥"];
const SUPER_HEART_THRESHOLD = 5;

const STATUS_OPTIONS = [
  { emoji: "💭", label: "Thinking of you" },
  { emoji: "🥺", label: "Missing you" },
  { emoji: "😴", label: "Sleepy" },
  { emoji: "😊", label: "Happy" },
  { emoji: "🔕", label: "Busy but thinking of you" },
  { emoji: "✈️", label: "Travelling" },
  { emoji: "😔", label: "Need a hug" },
  { emoji: "✏️", label: "Custom…" },
];

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
const isNightMode = () => true;
const STARS = Array.from({ length: 60 }, (_, i) => ({
  left: `${(i * 37.3 + 11) % 100}%`,
  top: `${(i * 53.7 + 7) % 100}%`,
  size: ((i * 7 + 3) % 3) + 1,
  delay: `${(i * 0.3) % 4}s`,
  dur: `${2.5 + (i % 3)}s`,
  opacity: 0.3 + (i % 4) * 0.15,
}));

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

const FLOAT_HEARTS = [
  { left: "8%",  delay: "0s",   size: 22, dur: "3.2s" },
  { left: "18%", delay: "0.6s", size: 16, dur: "2.8s" },
  { left: "30%", delay: "1.1s", size: 28, dur: "3.5s" },
  { left: "44%", delay: "0.3s", size: 18, dur: "2.6s" },
  { left: "58%", delay: "0.9s", size: 24, dur: "3.0s" },
  { left: "70%", delay: "0.2s", size: 14, dur: "3.8s" },
  { left: "80%", delay: "1.4s", size: 20, dur: "2.9s" },
  { left: "90%", delay: "0.7s", size: 26, dur: "3.3s" },
];

// ── NightStars ────────────────────────────────────────────────────────────────
function NightStars() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <style>{`@keyframes starTwinkle{0%,100%{opacity:var(--op);transform:scale(1)}50%{opacity:calc(var(--op)*0.3);transform:scale(0.6)}}`}</style>
      {STARS.map((s, i) => (
        <div key={i} style={{
          position: "absolute", left: s.left, top: s.top,
          width: s.size, height: s.size, borderRadius: "50%", background: "white",
          ["--op" as any]: s.opacity, opacity: s.opacity,
          animation: `starTwinkle ${s.dur} ${s.delay} ease-in-out infinite`,
          boxShadow: s.size >= 3 ? `0 0 ${s.size * 2}px rgba(255,255,255,0.8)` : "none",
        }} />
      ))}
    </div>
  );
}

// ── HeartBanner ───────────────────────────────────────────────────────────────
function HeartBanner({ sender, isSuper, onDismiss }: { sender: string; isSuper?: boolean; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, isSuper ? 7000 : 5500);
    return () => clearTimeout(t);
  }, [onDismiss, isSuper]);

  return (
    <div onClick={onDismiss} style={{ position: "fixed", inset: 0, zIndex: 2000, background: isSuper ? "rgba(30,20,0,0.92)" : "rgba(45,10,10,0.85)", backdropFilter: "blur(3px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "hbFade 0.4s ease" }}>
      <style>{`
        @keyframes hbFade{from{opacity:0}to{opacity:1}}
        @keyframes heartPop{0%{transform:scale(0.4);opacity:0}65%{transform:scale(1.18)}100%{transform:scale(1);opacity:1}}
        @keyframes superHeartPop{0%{transform:scale(0.2) rotate(-15deg);opacity:0}50%{transform:scale(1.3) rotate(5deg)}75%{transform:scale(0.95) rotate(-2deg)}100%{transform:scale(1) rotate(0deg);opacity:1}}
        @keyframes floatHeart{0%{transform:translateY(0) scale(1);opacity:0.75}100%{transform:translateY(-200px) scale(0.2);opacity:0}}
        @keyframes floatSuperHeart{0%{transform:translateY(0) scale(1) rotate(0deg);opacity:0.9}100%{transform:translateY(-250px) scale(0.1) rotate(20deg);opacity:0}}
        @keyframes textRise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes hbPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        @keyframes superGlow{0%,100%{filter:drop-shadow(0 0 30px rgba(255,200,0,0.8))}50%{filter:drop-shadow(0 0 50px rgba(255,220,0,1))}}
        @keyframes starBurst{0%{transform:scale(0) rotate(0deg);opacity:1}100%{transform:scale(3) rotate(180deg);opacity:0}}
      `}</style>
      {FLOAT_HEARTS.map((h, i) => (
        <div key={i} style={{ position: "absolute", bottom: "12%", left: h.left, fontSize: h.size, color: isSuper ? "#ffd700" : "#ff6b8a", opacity: 0, animation: `${isSuper ? "floatSuperHeart" : "floatHeart"} ${h.dur} ${h.delay} infinite ease-out`, pointerEvents: "none", userSelect: "none" }}>
          {isSuper ? "★" : "♥"}
        </div>
      ))}
      {isSuper && <div style={{ position: "absolute", fontSize: 200, color: "rgba(255,215,0,0.15)", animation: "starBurst 1s ease-out forwards", pointerEvents: "none" }}>✦</div>}
      <div style={{ fontSize: isSuper ? 120 : 96, lineHeight: 1, animation: isSuper ? "superHeartPop 0.9s ease forwards, superGlow 2s 0.9s ease-in-out infinite" : "heartPop 0.7s ease forwards, hbPulse 1.8s 0.7s ease-in-out infinite", marginBottom: 36 }}>
        {isSuper ? "💛" : "♥"}
      </div>
      <div style={{ animation: "textRise 0.6s 0.5s ease both", textAlign: "center", padding: "0 40px" }}>
        {isSuper && <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "#ffd700", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>✦ Super Heart ✦</p>}
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: isSuper ? 38 : 34, fontWeight: 400, color: isSuper ? "#ffd700" : "white", letterSpacing: 0.5, lineHeight: 1.25, marginBottom: 12 }}>
          {sender} sent you a {isSuper ? "Super Heart" : "heart"}
        </p>
        <p style={{ fontSize: 12, color: isSuper ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" }}>tap anywhere to close</p>
      </div>
    </div>
  );
}

// ── BackgroundHeart ───────────────────────────────────────────────────────────
function BackgroundHeart({ count, isSuper, night }: { count: number; isSuper: boolean; night: boolean }) {
  const fillPct = Math.min(count / SUPER_HEART_THRESHOLD, 1);
  const strokeColor = night ? (isSuper ? "#ffd700" : "#ff2244") : (isSuper ? "#ffd700" : "#d4a0a8");
  const fillColor   = night ? (isSuper ? "#ffd700" : "#ff2244") : (isSuper ? "#ffd700" : "#d4a0a8");
  const strokeOpacity = night ? (isSuper ? 0.85 : 0.7) : (isSuper ? 0.7 : 0.5);
  const fillOpacity   = night ? (isSuper ? 0.7  : 0.55) : (isSuper ? 0.6 : 0.45);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <style>{`
        @keyframes heartGlow{0%,100%{opacity:0.28;filter:drop-shadow(0 0 14px rgba(212,160,168,0.6))}50%{opacity:0.38;filter:drop-shadow(0 0 30px rgba(212,160,168,0.9))}}
        @keyframes heartGlowNight{0%,100%{opacity:0.6;filter:drop-shadow(0 0 20px rgba(255,30,60,0.8)) drop-shadow(0 0 40px rgba(255,30,60,0.4))}50%{opacity:0.8;filter:drop-shadow(0 0 35px rgba(255,30,60,1)) drop-shadow(0 0 70px rgba(255,30,60,0.6))}}
        @keyframes superHeartGlow{0%,100%{filter:drop-shadow(0 0 20px rgba(255,215,0,0.7))}50%{filter:drop-shadow(0 0 40px rgba(255,215,0,1))}}
      `}</style>
      <svg width="360" height="340" viewBox="0 0 100 90"
        style={{ animation: isSuper ? "superHeartGlow 2s ease-in-out infinite" : night ? "heartGlowNight 2.5s ease-in-out infinite" : "heartGlow 3s ease-in-out infinite" }}>
        <path d="M50 85 C50 85 5 55 5 28 C5 14 16 5 28 5 C36 5 44 9 50 16 C56 9 64 5 72 5 C84 5 95 14 95 28 C95 55 50 85 50 85Z"
          fill="none" stroke={strokeColor} strokeWidth="3.5" opacity={strokeOpacity} />
        {count > 0 && (
          <>
            <defs>
              <clipPath id="heartClip">
                <path d="M50 85 C50 85 5 55 5 28 C5 14 16 5 28 5 C36 5 44 9 50 16 C56 9 64 5 72 5 C84 5 95 14 95 28 C95 55 50 85 50 85Z" />
              </clipPath>
            </defs>
            <rect x="0" y={90 - fillPct * 90} width="100" height={fillPct * 90}
              fill={fillColor} opacity={fillOpacity} clipPath="url(#heartClip)"
              style={{ transition: "y 0.8s cubic-bezier(0.34,1.56,0.64,1), height 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
          </>
        )}
      </svg>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
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
      <div onClick={onJump} style={{ background: "rgba(255,255,255,0.96)", borderRadius: 20, padding: "7px 14px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${BR}`, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 13 }}>↓</span>
        <span style={{ fontSize: 13, color: TXT }}>{count} new message{count > 1 ? "s" : ""}</span>
        <button onClick={e => { e.stopPropagation(); onDismiss(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: MUT, padding: 0, marginLeft: 2 }}>✕</button>
      </div>
    </div>
  );
}

// ── PinnedMessageBar ──────────────────────────────────────────────────────────
function PinnedMessageBar({ msg, onScrollTo, onUnpin, night }: { msg: Message; onScrollTo: () => void; onUnpin: () => void; night: boolean }) {
  const bg = night ? "#3d1020" : "white";
  const border = night ? "#5a1830" : BR;
  return (
    <div style={{ background: bg, borderBottom: `1px solid ${border}`, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, cursor: "pointer" }} onClick={onScrollTo}>
      <div style={{ width: 2, height: 28, background: "#d4a0a8", borderRadius: 1, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: night ? "rgba(255,255,255,0.5)" : MUT, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 1 }}>Pinned</div>
        <div style={{ fontSize: 12, color: night ? "rgba(255,255,255,0.85)" : TXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {msg.type === "heart" || msg.type === "superheart" ? "♥ Heart" : msg.imageData ? "📷 Photo" : msg.text || ""}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onUnpin(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: night ? "rgba(255,255,255,0.5)" : MUT, padding: "0 2px", flexShrink: 0 }}>✕</button>
    </div>
  );
}

// ── EmojiPicker ───────────────────────────────────────────────────────────────
function EmojiPicker({ onPick, onClose, existingReaction }: { onPick: (e: string) => void; onClose: () => void; existingReaction?: string }) {
  return (
    <div onPointerDown={e => e.stopPropagation()}
      style={{ background: "white", borderRadius: 20, padding: "10px 14px", boxShadow: "0 4px 24px rgba(0,0,0,0.15)", border: `1px solid ${BR}`, display: "flex", gap: 8, alignItems: "center" }}>
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => { onPick(e); onClose(); }}
          style={{ fontSize: 26, background: existingReaction === e ? "#fef0f0" : "none", border: existingReaction === e ? `2px solid ${H}` : "2px solid transparent", borderRadius: 10, padding: "4px 6px", cursor: "pointer", transition: "transform 0.1s", lineHeight: 1 }}
          onMouseEnter={ev => (ev.currentTarget as HTMLButtonElement).style.transform = "scale(1.25)"}
          onMouseLeave={ev => (ev.currentTarget as HTMLButtonElement).style.transform = "scale(1)"}>
          {e}
        </button>
      ))}
    </div>
  );
}

// ── ContextMenu ───────────────────────────────────────────────────────────────
function ContextMenu({ x, y, mine, msg, user, onEdit, onDelete, onMemoryJar, onPin, onReact, onClose }: {
  x: number; y: number; mine: boolean; msg: Message; user: string;
  onEdit?: () => void; onDelete: () => void; onMemoryJar: () => void;
  onPin: () => void; onReact: (e: string) => void; onClose: () => void;
}) {
  const existingReaction = Object.entries(msg.reactions || {}).find(([, users]) => users.includes(user))?.[0];

  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [onClose]);

  const menuW = 180;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top  = Math.min(y, window.innerHeight - 320);

  const menuItems = [
    { label: "✦ Memory Jar", action: onMemoryJar, color: TXT, both: true },...(mine && onEdit ? [{ label: "✏️ Edit",   action: onEdit!,  color: TXT,       both: false }] : []),...(mine           ? [{ label: "📌 Pin",    action: onPin,    color: TXT,       both: false }] : []),...(mine           ? [{ label: "🗑️ Delete", action: onDelete, color: "#dc3535", both: false }] : []),
  ].filter(item => item.both || mine);

  return (
    <div onPointerDown={e => e.stopPropagation()} style={{ position: "fixed", left, top, zIndex: 3000, animation: "ctxPop 0.15s ease" }}>
      <style>{`@keyframes ctxPop{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>
      {!mine && (
        <div style={{ marginBottom: 8 }}>
          <EmojiPicker onPick={onReact} onClose={onClose} existingReaction={existingReaction} />
        </div>
      )}
      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: `1px solid ${BR}`, overflow: "hidden", minWidth: menuW }}>
        {menuItems.map((item, i) => (
          <button key={i} onClick={() => { item.action(); onClose(); }}
            style={{ display: "block", width: "100%", padding: "12px 16px", background: "none", border: "none", textAlign: "left", fontSize: 14, color: item.color, cursor: "pointer", borderBottom: i < menuItems.length - 1 ? `1px solid ${BR}` : "none", fontFamily: "'DM Sans', sans-serif", fontWeight: item.color === "#dc3535" ? 600 : 400 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = item.color === "#dc3535" ? "#fff5f5" : "#fafafa"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "none"}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── DeleteConfirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 18, padding: "24px 20px", maxWidth: 300, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: TXT, marginBottom: 8 }}>Delete message?</div>
        <div style={{ fontSize: 13, color: MUT, marginBottom: 24 }}>This can't be undone.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `1.5px solid ${BR}`, background: "white", fontSize: 14, color: MUT, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "#dc3535", fontSize: 14, color: "white", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── StatusPicker ──────────────────────────────────────────────────────────────
function StatusPicker({ current, onSet, onClose }: { current: string; onSet: (s: string) => void; onClose: () => void }) {
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 20px" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "20px 20px 16px 16px", width: "100%", maxWidth: 480, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ padding: "16px 16px 8px", borderBottom: `1px solid ${BR}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: TXT }}>Set your status</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: MUT, cursor: "pointer" }}>✕</button>
        </div>
        {STATUS_OPTIONS.map((opt, i) => {
          const val = opt.label === "Custom…" ? null : `${opt.emoji} ${opt.label}`;
          const isActive = val && current === val;
          return (
            <div key={i} onClick={() => {
              if (opt.label === "Custom…") { setShowCustom(true); return; }
              if (isActive) { onSet(""); onClose(); return; }
              onSet(val!); onClose();
            }}
              style={{ padding: "14px 16px", borderBottom: i < STATUS_OPTIONS.length - 1 ? `1px solid ${BR}` : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: TXT, background: isActive ? HL : "none" }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "#fafafa"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isActive ? HL : "none"; }}>
              <span style={{ fontSize: 20 }}>{opt.emoji}</span>
              <span style={{ flex: 1 }}>{opt.label}</span>
              {isActive && <span style={{ fontSize: 16, color: H }}>✓</span>}
            </div>
          );
        })}
        {showCustom && (
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${BR}`, display: "flex", gap: 8 }}>
            <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Type your status…"
              style={{ flex: 1, border: `1.5px solid ${BR}`, borderRadius: 12, padding: "8px 12px", fontSize: 14, color: TXT, outline: "none", fontFamily: "'DM Sans', sans-serif" }}
              autoFocus onKeyDown={e => { if (e.key === "Enter" && custom.trim()) { onSet(custom.trim()); onClose(); } }} />
            <button onClick={() => { if (custom.trim()) { onSet(custom.trim()); onClose(); } }}
              style={{ padding: "8px 14px", borderRadius: 12, background: H, border: "none", color: "white", fontSize: 13, cursor: "pointer" }}>Set</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MemoryJar ─────────────────────────────────────────────────────────────────
function MemoryJar({ onBack, night }: { onBack: () => void; night: boolean }) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("messages").select("*").eq("starred", true).order("ts", { ascending: true }).then(({ data }) => { setMsgs((data || []) as Message[]); setLoading(false); });
  }, []);

  const unstar = async (id: string) => {
    await supabase.from("messages").update({ starred: false }).eq("id", id);
    setMsgs(prev => prev.filter(m => m.id !== id));
  };

  const nightBg = "linear-gradient(160deg, #2a0f1a 0%, #1e0d16 50%, #2d1020 100%)";

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: night ? nightBg : BG, position: "relative" }}>
      {night && <NightStars />}
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <div style={{ background: night ? "#3d1020" : "white", borderBottom: `1px solid ${night ? "#5a1830" : BR}`, height: 60, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0, position: "relative", zIndex: 1 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: night ? "rgba(255,255,255,0.7)" : MUT, display: "flex", alignItems: "center", padding: "0 2px" }}>←</button>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 400, color: night ? "#f0d8e0" : TXT }}>Memory Jar</div>
        <div style={{ fontSize: 16, color: "#d4a0a8", marginTop: 2 }}>✦</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", position: "relative", zIndex: 1 }}>
        {loading && <div style={{ textAlign: "center", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: night ? "rgba(255,255,255,0.5)" : MUT, padding: 40, fontSize: 18 }}>Loading…</div>}
        {!loading && msgs.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 10 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: night ? "#f0d8e0" : TXT }}>Nothing here yet</div>
            <div style={{ fontSize: 13, color: night ? "rgba(255,255,255,0.4)" : MUT }}>Hold a message and tap Memory Jar to save it here.</div>
          </div>
        )}
        {msgs.map(msg => (
          <div key={msg.id} style={{ background: night ? "rgba(61,16,32,0.8)" : "white", borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: `1px solid ${night ? "#5a1830" : BR}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: uc(msg.sender) }}>{msg.sender}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 11, color: night ? "rgba(255,255,255,0.4)" : MUT }}>{ft(msg.ts)} · {fd(msg.ts)}</div>
                <button onClick={() => unstar(msg.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 17, color: "#e0a0c0", lineHeight: 1, padding: 0 }}>★</button>
              </div>
            </div>
            {msg.imageData && <img src={msg.imageData} alt="" onClick={() => setLightboxSrc(msg.imageData!)} style={{ maxWidth: "100%", borderRadius: 8, display: "block", marginBottom: msg.text ? 6 : 0, cursor: "pointer" }} />}
            {(msg.type === "heart" || msg.type === "superheart") ? (
              <div style={{ fontSize: 13, color: "#d4a0a8", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>{msg.sender} sent a {msg.type === "superheart" ? "Super Heart ✨" : "heart ♥"}</div>
            ) : msg.text ? (
              <div style={{ fontSize: 14, color: night ? "#f0d8e0" : TXT, lineHeight: 1.5 }}>{msg.text}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FlipNumber ────────────────────────────────────────────────────────────────
function FlipNumber({ value, color, fontSize }: { value: number; color: string; fontSize?: number }) {
  const [displayed, setDisplayed] = useState(value);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const pendingValue = useRef(value);

  useEffect(() => {
    if (value === pendingValue.current) return;
    pendingValue.current = value;
    setPhase("out");
    const swap = setTimeout(() => { setDisplayed(value); setPhase("in"); }, 200);
    const reset = setTimeout(() => setPhase("idle"), 400);
    return () => { clearTimeout(swap); clearTimeout(reset); };
  }, [value]);

  const animationName = phase === "out" ? "flipOut" : phase === "in" ? "flipIn" : "none";

  return (
    <>
      <style>{`
        @keyframes flipOut{0%{transform:rotateX(0deg);opacity:1}100%{transform:rotateX(-90deg);opacity:0}}
        @keyframes flipIn{0%{transform:rotateX(90deg);opacity:0}100%{transform:rotateX(0deg);opacity:1}}
      `}</style>
      <div style={{ perspective: 400, display: "inline-block" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: fontSize ?? 20, fontWeight: 500, color, lineHeight: 1, display: "inline-block", transformOrigin: "center center", animation: animationName !== "none" ? `${animationName} 0.2s ease forwards` : "none" }}>
          {displayed}
        </div>
      </div>
    </>
  );
}

// ── TypingBubble ──────────────────────────────────────────────────────────────
function TypingBubble({ color, bubbleBg }: { color: string; bubbleBg: string }) {
  return (
    <>
      <style>{`
        @keyframes typingDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
        @keyframes bubblePop{0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1}}
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 2, width: "100%", boxSizing: "border-box", padding: "0 8px", animation: "bubblePop 0.2s ease forwards" }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
          <div style={{ background: bubbleBg, padding: "10px 16px", borderRadius: 18, borderBottomLeftRadius: 4, display: "flex", gap: 5, alignItems: "center" }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", animation: `typingDot 1.2s ${i * 0.2}s ease-in-out infinite` }} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── CountdownWidget ───────────────────────────────────────────────────────────
function CountdownWidget({ night }: { night: boolean }) {
  const [label, setLabel] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    supabase.from("countdown").select("*").eq("id", "shared").maybeSingle().then(({ data }) => {
      if (data) { setLabel(data.label || ""); setTargetDate(data.target_date || ""); }
    });
  }, []);

  const openEditor = () => { setDraftLabel(label); setDraftDate(targetDate); setShowEditor(true); };

  const saveEditor = async () => {
    if (!draftDate) return;
    const newLabel = draftLabel.trim() || "Countdown";
    setLabel(newLabel); setTargetDate(draftDate);
    await supabase.from("countdown").upsert({ id: "shared", label: newLabel, target_date: draftDate, updated_at: Date.now() }, { onConflict: "id" });
    setShowEditor(false);
  };

  const clearCountdown = async () => {
    setLabel(""); setTargetDate("");
    await supabase.from("countdown").delete().eq("id", "shared");
    setShowEditor(false);
  };

  const [y, m, d] = targetDate ? targetDate.split("-").map(Number) : [0, 0, 0];
const diff = targetDate ? new Date(y, m - 1, d + 1).getTime() - now : 0;
  const past     = diff <= 0;
  const totalSec = past ? 0 : Math.floor(diff / 1000);
  const days     = Math.floor(totalSec / 86400);
  const hours    = Math.floor((totalSec % 86400) / 3600);
  const mins     = Math.floor((totalSec % 3600) / 60);
  const secs     = totalSec % 60;
  const pad      = (n: number) => String(n).padStart(2, "0");

  const mutColor    = night ? "rgba(212,160,168,0.45)" : MUT;
  const txtColor    = night ? "#f0d8e0" : TXT;
  const borderColor = night ? "#5a1830" : BR;
  const bgCard      = night ? "rgba(61,16,32,0.6)" : "rgba(255,255,255,0.7)";
  const unitColor   = night ? "rgba(212,160,168,0.55)" : MUT;

  return (
    <>
      <style>{`
        @keyframes cdPulse{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes cdSlideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cdModalIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
      `}</style>

      {showEditor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 24px" }} onClick={() => setShowEditor(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: night ? "#2a0f1a" : "white", borderRadius: "20px 20px 16px 16px", width: "100%", maxWidth: 420, padding: "24px 20px", boxShadow: "0 -4px 32px rgba(0,0,0,0.2)", border: `1px solid ${borderColor}`, animation: "cdModalIn 0.2s ease" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: txtColor, marginBottom: 20, textAlign: "center" }}>Set Countdown ✦</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: mutColor, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>What are you counting down to?</label>
              <input value={draftLabel} onChange={e => setDraftLabel(e.target.value)} placeholder="e.g. Our Anniversary ♡" autoFocus
                style={{ width: "100%", border: `1.5px solid ${borderColor}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, color: txtColor, background: night ? "rgba(255,255,255,0.07)" : "#fdf8f5", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: mutColor, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Target date</label>
              <input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
                style={{ width: "100%", border: `1.5px solid ${borderColor}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, color: txtColor, background: night ? "rgba(255,255,255,0.07)" : "#fdf8f5", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {label && (
                <button onClick={clearCountdown} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `1.5px solid ${borderColor}`, background: "none", fontSize: 13, color: "#dc3535", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear</button>
              )}
              <button onClick={() => setShowEditor(false)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `1.5px solid ${borderColor}`, background: "none", fontSize: 13, color: mutColor, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={saveEditor} disabled={!draftDate} style={{ flex: 2, padding: "11px", borderRadius: 12, border: "none", background: draftDate ? H : borderColor, fontSize: 13, color: "white", cursor: draftDate ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, opacity: draftDate ? 1 : 0.5 }}>Save ✦</button>
            </div>
          </div>
        </div>
      )}

      <div onClick={openEditor}
        style={{ marginTop: 16, cursor: "pointer", animation: "cdSlideUp 0.5s ease", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 24px", borderRadius: 20, background: bgCard, border: `1px solid ${borderColor}`, backdropFilter: "blur(8px)", maxWidth: 320, width: "100%", boxShadow: night ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 16px rgba(0,0,0,0.06)", transition: "transform 0.15s, box-shadow 0.15s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)"; (e.currentTarget as HTMLDivElement).style.boxShadow = night ? "0 6px 28px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.1)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; (e.currentTarget as HTMLDivElement).style.boxShadow = night ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 16px rgba(0,0,0,0.06)"; }}>
        <div style={{ fontSize: 12, color: mutColor, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center" }}>
          {label || "tap to set a countdown ✦"}
        </div>
        {targetDate && !past && (
          <>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              {[{ val: days, unit: "days" }, { val: hours, unit: "hrs" }, { val: mins, unit: "min" }, { val: secs, unit: "sec" }].map(({ val, unit }, i) => (
                <div key={unit} style={{ display: "flex", alignItems: "flex-end", gap: i < 3 ? 6 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: unit === "days" ? 42 : 32, fontWeight: 500, color: txtColor, lineHeight: 1, animation: unit === "sec" ? "cdPulse 1s ease-in-out infinite" : "none", minWidth: unit === "days" ? 52 : 38, textAlign: "center" }}>
                      {unit === "days" ? days : pad(val)}
                    </div>
                    <div style={{ fontSize: 9, color: unitColor, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>{unit}</div>
                  </div>
                  {i < 3 && <div style={{ fontSize: 22, color: mutColor, paddingBottom: 14, lineHeight: 1 }}>:</div>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: mutColor, letterSpacing: "0.06em" }}>
              {new Date(targetDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </div>
          </>
        )}
        {targetDate && past && (
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: S, fontStyle: "italic" }}>The day has come ♡</div>
        )}
        {!targetDate && (
          <div style={{ fontSize: 11, color: mutColor, fontStyle: "italic" }}>— — : — — : — — : — —</div>
        )}
      </div>
    </>
  );
}

// ── LoginScreen ───────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onJar, hasanGlow, sabaGlow, hasanUnread, sabaUnread, night }: {
  onLogin: (name: string) => void; onJar: () => void;
  hasanGlow: boolean; sabaGlow: boolean;
  hasanUnread: number; sabaUnread: number;
  night: boolean;
}) {
  const nightBg = "linear-gradient(160deg, #2a0f1a 0%, #1e0d16 50%, #2d1020 100%)";

  const timeSinceItems = [
    { emoji: "✦", label: "Since we met",       days: Math.floor((Date.now() - new Date("2026-01-27T00:00:00").getTime()) / 86400000), date: "Jan 27" },
    { emoji: "♡", label: "Since Anniversary",  days: Math.floor((Date.now() - new Date("2026-03-18T00:00:00").getTime()) / 86400000), date: "Mar 18" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", background: night ? nightBg : BG, padding: "3rem 2rem 2rem", position: "relative", overflowY: "auto" }}>
      <style>{`
        @keyframes glowPulse{0%,100%{box-shadow:0 0 12px 4px currentColor,0 0 24px 8px currentColor}50%{box-shadow:0 0 20px 8px currentColor,0 0 40px 16px currentColor}}
        @keyframes nightFade{from{opacity:0}to{opacity:1}}
        @keyframes nightTitleGlow{0%,100%{text-shadow:0 0 20px rgba(212,100,140,0.4)}50%{text-shadow:0 0 40px rgba(212,100,140,0.8)}}
      `}</style>

      {night && <NightStars />}

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

        {/* Time Since strip */}
        <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 320, marginBottom: 60 }}>
          {timeSinceItems.map((item, i) => (
            <div key={i} style={{ flex: 1, background: night ? "rgba(61,16,32,0.45)" : "rgba(255,255,255,0.55)", border: `1px solid ${night ? "rgba(90,24,48,0.6)" : "rgba(240,221,216,0.8)"}`, borderRadius: 12, padding: "7px 10px", display: "flex", alignItems: "center", gap: 7, backdropFilter: "blur(8px)", boxShadow: night ? "0 2px 12px rgba(0,0,0,0.25)" : "0 1px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 11, color: night ? "rgba(255,100,130,0.7)" : H }}>{item.emoji}</div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <FlipNumber value={item.days} color={night ? "#f0d8e0" : TXT} fontSize={20} />
                  <span style={{ fontSize: 8, color: night ? "rgba(212,160,168,0.5)" : MUT, letterSpacing: "0.1em", textTransform: "uppercase" }}>days</span>
                </div>
                <div style={{ fontSize: 9, color: night ? "rgba(212,160,168,0.5)" : MUT, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", whiteSpace: "nowrap" }}>{item.label} · {item.date}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Title block */}
  
        <p style={{ fontSize: 16, color: night ? "rgba(212,160,168,0.55)" : MUT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Tickle the tism'</p>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: 320, marginBottom: 6 }}>
  <span style={{
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 32,
    color: night ? "rgba(255,100,130,0.8)" : "#d4a0a8",
    lineHeight: 1,
    animation: night ? "nightTitleGlow 3s ease-in-out infinite" : "none",
  }}>
    ♡
  </span>
  <span style={{
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 46,
    fontWeight: 400,
    color: night ? "#f0d8e0" : TXT,
    letterSpacing: -0.5,
    animation: night ? "nightTitleGlow 3s ease-in-out infinite" : "none",
    marginRight: "calc(50% + 10px)",
    whiteSpace: "nowrap",
  }}>
    Hasan
  </span>
  <span style={{
    position: "absolute",
    left: "calc(50% + 26px)",
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 46,
    fontWeight: 400,
    color: night ? "#f0d8e0" : TXT,
    letterSpacing: -0.5,
    animation: night ? "nightTitleGlow 3s ease-in-out infinite" : "none",
    whiteSpace: "nowrap",
  }}>
    Saba
  </span>
</div>
        <p style={{ fontSize: 16, color: night ? "rgba(212,160,168,0.55)" : MUT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 52 }}>The Seventh Infinity Stone</p>
        <p style={{ fontSize: 11, color: night ? "rgba(212,160,168,0.4)" : MUT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>Who are you?</p>

        {/* Login buttons */}
        <div style={{ display: "flex", gap: 14, marginBottom: 36 }}>
          {(["Hasan", "Saba"] as const).map(n => {
            const glow   = n === "Hasan" ? hasanGlow   : sabaGlow;
            const unread = n === "Hasan" ? hasanUnread : sabaUnread;
            return (
              <div key={n} style={{ position: "relative" }}>
                <button onClick={() => onLogin(n)}
                  style={{ padding: "13px 40px", borderRadius: 50, border: `2px solid ${uc(n)}`, background: night ? "rgba(255,255,255,0.06)" : "white", fontSize: 15, fontWeight: 500, color: uc(n), cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s", animation: glow ? "glowPulse 1.5s ease-in-out infinite" : "none", boxShadow: glow ? `0 0 12px 4px ${uc(n)}55, 0 0 24px 8px ${uc(n)}33` : "none" }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = night ? "rgba(255,255,255,0.1)" : ul(n)}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = night ? "rgba(255,255,255,0.06)" : "white"}>
                  {n}
                </button>
                {unread > 0 && (
                  <div style={{ position: "absolute", top: -6, right: -6, background: uc(n), color: "white", borderRadius: "50%", minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>
                    {unread}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Memory Jar */}
        <button onClick={onJar}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: night ? "rgba(212,160,168,0.5)" : MUT, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", padding: "6px 12px", borderRadius: 20 }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = night ? "#f0d8e0" : TXT}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = night ? "rgba(212,160,168,0.5)" : MUT}>
          ✦ Memory Jar
        </button>

        {/* Countdown */}
        <CountdownWidget night={night} />
      </div>
    </div>
  );
}

// ── ReplyPreview ──────────────────────────────────────────────────────────────
function ReplyPreview({ replyTo, onCancel, user, night }: { replyTo: ReplyTo; onCancel: () => void; user: string; night: boolean }) {
  return (
    <div style={{ background: night ? "#3d1020" : "white", borderTop: `1px solid ${night ? "#5a1830" : BR}`, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ width: 3, borderRadius: 2, background: uc(replyTo.sender), alignSelf: "stretch", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: uc(replyTo.sender), marginBottom: 2 }}>{replyTo.sender === user ? "You" : replyTo.sender}</div>
        <div style={{ fontSize: 12, color: night ? "rgba(255,255,255,0.5)" : MUT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{replyTo.imageData ? "📷 Photo" : replyTo.text || ""}</div>
      </div>
      <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: night ? "rgba(255,255,255,0.5)" : MUT, padding: "0 4px", flexShrink: 0 }}>✕</button>
    </div>
  );
}

// ── MsgItem ───────────────────────────────────────────────────────────────────
function MsgItem({ msg, user, isSeenLast, isFirstInRun, onReact, onDelete, onReply, onImageClick, onMemoryJar, onPin, onScrollToReply, night, otherUser }: {
  msg: Message; user: string; isSeenLast: boolean; isFirstInRun: boolean;
  onReact: (id: string, emoji: string) => Promise<void>;
  onDelete: (id: string) => void;
  onReply: (msg: Message) => void;
  onImageClick: (src: string) => void;
  onMemoryJar: (id: string) => Promise<void>;
  onPin: (msg: Message) => Promise<void>;
  onScrollToReply: (id: string) => void;
  night: boolean;
  otherUser: string;
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text || "");
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeTriggered = useRef(false);
  const holdTimer = useRef<any>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const mine      = msg.sender === user;
  const color     = uc(msg.sender);
  const light     = ul(msg.sender);
  const reactions = Object.entries(msg.reactions && typeof msg.reactions === 'object' ? msg.reactions : {}).filter(([, u]) => u.length > 0);
  const emojiOnly  = msg.text && msg.type !== "heart" && msg.type !== "superheart" ? isEmojiOnly(msg.text) : false;
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
    holdTimer.current = setTimeout(() => {
      const safeX = mine ? window.innerWidth - 220 : 12;
      const safeY = Math.min(touchStartY.current - 20, window.innerHeight - 320);
      setContextMenu({ x: safeX, y: safeY });
      try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearTimeout(holdTimer.current);
    if (Math.abs(dy) > Math.abs(dx)) { setSwiping(false); setSwipeX(0); return; }
    if (mine && dx < 0) setSwipeX(Math.max(dx, -70));
    else if (!mine && dx > 0) setSwipeX(Math.min(dx, 70));
    if (Math.abs(dx) > 50 && !swipeTriggered.current) {
      swipeTriggered.current = true;
      clearTimeout(holdTimer.current);
      onReply(msg);
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
    }
  };

  const handleTouchEnd = () => { clearTimeout(holdTimer.current); setSwipeX(0); setSwiping(false); };
  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); };

  const nightOtherBg = otherUser === "Hasan" ? NIGHT_OTHER_HASAN : NIGHT_OTHER_SABA;
  const bubbleBg  = mine ? color : (night ? nightOtherBg : light);
  const bubbleTxt = mine ? "white" : (night ? "white" : TXT);

  if (msg.type === "heart" || msg.type === "superheart") {
    const isSuper = msg.type === "superheart";
    return (
      <div id={`msg-${msg.id}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 16px", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: isSuper ? "#ffd700" : "#d4a0a8" }}>{isSuper ? "💛" : "♥"}</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 15, color: night ? "rgba(255,255,255,0.5)" : MUT }}>
            {msg.sender} sent a {isSuper ? "Super Heart ✨" : "heart"}
          </span>
          <span style={{ fontSize: 13, color: isSuper ? "#ffd700" : "#d4a0a8" }}>{isSuper ? "💛" : "♥"}</span>
        </div>
        <div style={{ fontSize: 10, color: night ? "rgba(255,255,255,0.3)" : "#c0b0a8", marginTop: 2 }}>{ft(msg.ts)}</div>
      </div>
    );
  }

  return (
    <>
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} mine={mine} msg={msg} user={user}
          onEdit={mine && msg.text ? () => { setEditText(msg.text || ""); setEditing(true); } : undefined}
          onDelete={() => onDelete(msg.id)}
          onMemoryJar={() => onMemoryJar(msg.id)}
          onPin={() => onPin(msg)}
          onReact={e => onReact(msg.id, e)}
          onClose={() => setContextMenu(null)}
        />
      )}
      <div id={`msg-${msg.id}`}
        style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginBottom: 2, width: "100%", boxSizing: "border-box", padding: "0 8px" }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {!mine && isFirstInRun && (
          <div style={{ fontSize: 11, color, fontWeight: 500, marginBottom: 3, paddingLeft: 4 }}>{msg.sender}</div>
        )}
        {msg.replyTo && (
          <div onClick={() => onScrollToReply(msg.replyTo!.id)}
            style={{ maxWidth: "75%", marginBottom: 4, background: night ? "rgba(255,255,255,0.08)" : (mine ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.05)"), borderRadius: 10, padding: "5px 10px", borderLeft: `3px solid ${uc(msg.replyTo.sender)}`, cursor: "pointer" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: uc(msg.replyTo.sender), marginBottom: 2 }}>{msg.replyTo.sender === user ? "You" : msg.replyTo.sender}</div>
            <div style={{ fontSize: 12, color: night ? "rgba(255,255,255,0.5)" : MUT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg.replyTo.imageData ? "📷 Photo" : msg.replyTo.text || ""}</div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", alignItems: "flex-end", gap: 6 }}>
          <span style={{ fontSize: 10, color: night ? "rgba(255,255,255,0.3)" : "#c0b0a8", flexShrink: 0, paddingBottom: 2, whiteSpace: "nowrap" }}>{ft(msg.ts)}</span>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, flexDirection: mine ? "row-reverse" : "row", maxWidth: "min(68vw, 300px)", transform: `translateX(${swipeX}px)`, transition: swiping ? "none" : "transform 0.2s ease" }}>
            <div style={{ maxWidth: "100%", minWidth: 0, position: "relative" }}>
              {msg.imageData && <img src={msg.imageData} alt="" onClick={() => onImageClick(msg.imageData!)} style={{ maxWidth: "100%", borderRadius: 12, display: "block", marginBottom: msg.text ? 4 : 0, cursor: "pointer" }} />}
              {msg.gifUrl && <img src={msg.gifUrl} alt="" onClick={() => onImageClick(msg.gifUrl!)} style={{ maxWidth: 200, borderRadius: 12, display: "block", marginBottom: msg.text ? 4 : 0, cursor: "pointer" }} />}
              {msg.text && !editing && (
                emojiOnly ? (
                  <div style={{ fontSize: emojiFontSize, lineHeight: 1.15, padding: "2px 4px", userSelect: "none" }}>
                    {msg.text}{msg.edited && <span style={{ fontSize: 10, color: MUT, marginLeft: 4 }}>(edited)</span>}
                  </div>
                ) : (
                  <div style={{ background: bubbleBg, color: bubbleTxt, padding: "9px 14px", paddingBottom: reactions.length > 0 ? "22px" : "9px", borderRadius: 18, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4, fontSize: 14, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap", position: "relative" }}>
                    {msg.text}{msg.edited && <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 6 }}>(edited)</span>}
                    {reactions.length > 0 && (
                      <span onClick={() => onReact(msg.id, reactions[0][0])}
                        style={{ position: "absolute", bottom: -10, [mine ? "left" : "right"]: 10, fontSize: 20, lineHeight: 1, cursor: "pointer", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))", userSelect: "none" }}>
                        {reactions[0][0]}
                      </span>
                    )}
                  </div>
                )
              )}
              {editing && (
                <div style={{ background: bubbleBg, borderRadius: 18, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4, padding: "6px 10px" }}>
                  <textarea ref={editRef} value={editText} onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") setEditing(false); }}
                    onBlur={saveEdit}
                    style={{ background: "transparent", border: "none", color: bubbleTxt, fontSize: 14, lineHeight: 1.5, resize: "none", width: "100%", outline: "none", fontFamily: "'DM Sans', sans-serif", minWidth: 100 }} rows={1} />
                </div>
              )}
            </div>
          </div>
        </div>
        {isSeenLast && mine && (
          <div style={{ fontSize: 10, color, fontWeight: 500, marginTop: 2, paddingRight: 4 }}>✓✓ Seen</div>
        )}
      </div>
    </>
  );
}
// ── StatusPopup ───────────────────────────────────────────────────────────────
function StatusPopup({ status, sender, onClose }: { status: string; sender: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  const hearts = Array.from({ length: 18 }, (_, i) => ({
    left: `${8 + (i * 13.7 + 7) % 82}%`,
    size: 10 + (i * 7) % 16,
    delay: `${(i * 0.28) % 3}s`,
    dur: `${2.2 + (i * 0.3) % 2}s`,
    wobble: `${(i % 2 === 0 ? "" : "-")}${6 + (i * 3) % 10}px`,
  }));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, background: "rgba(180,80,100,0.06)", backdropFilter: "blur(2px)", overflow: "hidden" }}>
      <style>{`
        @keyframes statusPop{0%{transform:scale(0.85);opacity:0}65%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
        @keyframes heartRise{
          0%{transform:translateY(0) translateX(0) scale(1) rotate(-10deg);opacity:0.9}
          25%{transform:translateY(-25vh) translateX(var(--wobble)) scale(0.9) rotate(5deg);opacity:0.75}
          50%{transform:translateY(-50vh) translateX(0) scale(0.75) rotate(-5deg);opacity:0.55}
          75%{transform:translateY(-75vh) translateX(var(--wobble)) scale(0.55) rotate(8deg);opacity:0.3}
          100%{transform:translateY(-102vh) translateX(0) scale(0.2) rotate(-10deg);opacity:0}
        }
      `}</style>

      {/* Filled floating hearts */}
      {hearts.map((h, i) => (
        <div key={i} style={{
          position: "fixed",
          bottom: "42%",
          left: h.left,
          fontSize: h.size,
          color: `hsl(${340 + (i * 7) % 30}, 75%, ${55 + (i * 3) % 15}%)`,
          ["--wobble" as any]: h.wobble,
          animation: `heartRise ${h.dur} ${h.delay} ease-in infinite`,
          pointerEvents: "none",
          userSelect: "none",
          lineHeight: 1,
        }}>
          ♥
        </div>
      ))}

      {/* Thought bubble */}
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", animation: "statusPop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>

        {/* SVG cloud shape */}
        <div style={{ position: "relative", width: 280 }}>
          <svg viewBox="0 0 280 180" width="280" style={{ display: "block", filter: "drop-shadow(0 8px 24px rgba(220,100,130,0.22))" }}>
            {/* Cloud path — bumpy top, flat-ish bottom, tail bottom-left */}
            <path d="
              M 60 150
              Q 30 150 25 130
              Q 10 128 10 112
              Q 8 95 22 88
              Q 18 75 28 65
              Q 35 50 52 50
              Q 55 35 70 28
              Q 88 18 108 26
              Q 118 14 135 12
              Q 155 8 168 22
              Q 182 14 198 20
              Q 218 16 228 34
              Q 246 36 252 54
              Q 264 60 262 78
              Q 272 88 268 104
              Q 270 122 254 130
              Q 250 148 228 150
              Z
            " fill="#fde8ee" stroke="rgba(210,130,155,0.5)" strokeWidth="2" strokeLinejoin="round" />
          </svg>

          {/* Content overlaid on the SVG */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 28px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, color: "#c08090", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
              {sender}'s status
            </div>
            <div style={{ fontSize: 20, color: "#e0909c", marginBottom: 8, lineHeight: 1 }}>♡</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 400, color: "#7a3040", lineHeight: 1.4, letterSpacing: "0.02em", fontStyle: "italic", textAlign: "center" }}>
              {status}
            </div>
            <div style={{ marginTop: 10, fontSize: 9, color: "#c0a0a8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              tap to close
            </div>
          </div>
        </div>

        {/* Trailing thought dots — small to large, bottom-left of bubble */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: -4, marginLeft: 48 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fde8ee", border: "1.5px solid rgba(210,130,155,0.5)", boxShadow: "0 2px 8px rgba(220,100,130,0.15)" }} />
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#fde8ee", border: "1.5px solid rgba(210,130,155,0.4)" }} />
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fde8ee", border: "1.5px solid rgba(210,130,155,0.3)" }} />
        </div>
      </div>
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
  const [heartBanner, setHeartBanner] = useState<{ sender: string; isSuper?: boolean } | null>(null);
  const [newMsgBanner, setNewMsgBanner] = useState<{ count: number; firstId: string } | null>(null);
  const [pinnedData, setPinnedData] = useState<PinnedData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [myHeartCount, setMyHeartCount] = useState(0);
  const [canSuperHeart, setCanSuperHeart] = useState(false);
  const [myStatus, setMyStatus] = useState("");
  const [otherStatus, setOtherStatus] = useState("");
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [hasanGlow, setHasanGlow] = useState(false);
  const [sabaGlow, setSabaGlow] = useState(false);
  const [hasanUnread, setHasanUnread] = useState(0);
  const [sabaUnread, setSabaUnread] = useState(0);
  const [night, setNight] = useState(isNightMode());
  const [statusPopup, setStatusPopup] = useState<{ status: string; sender: string } | null>(null);

  const bottomRef           = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLTextAreaElement>(null);
  const fileRef             = useRef<HTMLInputElement>(null);
  const countRef            = useRef(0);
  const userRef             = useRef<string | null>(null);
  const subRef              = useRef<any>(null);
  const inputFocusedRef     = useRef(false);
  const typingTimerRef      = useRef<any>(null);
  const newBannerCheckedRef = useRef(false);

  useEffect(() => { userRef.current = user; }, [user]);
 

  const other = user === "Hasan" ? "Saba" : "Hasan";

  const nightChatBg       = "linear-gradient(160deg, #2a0f1a 0%, #1e0d16 50%, #2d1020 100%)";
  const nightHeaderBg     = "#3d1020";
  const nightHeaderBorder = "#5a1830";
  const dayChatBg         = user === "Saba" ? BG_SABA : user === "Hasan" ? BG_HASAN : BG;
  const chatBg            = night ? nightChatBg : dayChatBg;
  const headerBg          = night ? nightHeaderBg : "white";
  const headerBorder      = night ? nightHeaderBorder : BR;
  const headerMut         = night ? "rgba(255,255,255,0.55)" : MUT;

  const nightOtherBg = other === "Hasan" ? NIGHT_OTHER_HASAN : NIGHT_OTHER_SABA;
  const typingBubbleBg = night ? nightOtherBg : ul(other);

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
        if (newOnes.some((m: Message) => m.sender !== u && m.type !== "heart" && m.type !== "superheart")) ping();
      }
      countRef.current = messages.length;
      setMsgs(messages);

      const otherUser = u === "Hasan" ? "Saba" : "Hasan";
      const { data: seenData } = await supabase.from("seen_status").select("last_seen").eq("username", otherUser).maybeSingle();
      if (seenData) { setSeenOther(seenData.last_seen || 0); setOtherLastSeen(seenData.last_seen || 0); }

      const { data: typingData } = await supabase.from("typing_status").select("*").eq("username", otherUser).maybeSingle();
      if (typingData) {
        const fresh = Date.now() - (typingData.updated_at || 0) < 4000;
        setOtherTyping(typingData.is_typing && fresh);
      }

      const { data: pinData } = await supabase.from("pinned_message").select("*").eq("id", "pin").maybeSingle();
      setPinnedData(pinData ? (pinData as PinnedData) : null);

      const { data: heartData } = await supabase.from("heart_pending").select("*").eq("recipient", u).maybeSingle();
      if (heartData && !heartData.seen) {
        setHeartBanner({ sender: heartData.sender, isSuper: heartData.is_super });
        await supabase.from("heart_pending").update({ seen: true }).eq("recipient", u);
      }

      const { data: hcData } = await supabase.from("heart_counts").select("count").eq("username", u).maybeSingle();
      const hc = hcData?.count ?? 0;
      setMyHeartCount(hc);
      setCanSuperHeart(hc >= SUPER_HEART_THRESHOLD);

      const { data: myStatusData } = await supabase.from("user_status").select("status").eq("username", u).maybeSingle();
      setMyStatus(myStatusData?.status || "");
      const { data: otherStatusData } = await supabase.from("user_status").select("status").eq("username", otherUser).maybeSingle();
      setOtherStatus(otherStatusData?.status || "");

      return messages;
    } catch (e) { console.error("loadMsgs error:", e); setMsgs([]); return []; }
  };

  const loadGlowState = async () => {
    try {
      const { data: hasanSeen } = await supabase.from("seen_status").select("last_seen").eq("username", "Hasan").maybeSingle();
      const { data: sabaSeen  } = await supabase.from("seen_status").select("last_seen").eq("username", "Saba").maybeSingle();
      const hasanLastSeen = hasanSeen?.last_seen || 0;
      const sabaLastSeen  = sabaSeen?.last_seen  || 0;

      const { data: allMsgs } = await supabase.from("messages").select("sender,ts,type").order("ts", { ascending: false }).limit(50);
      const ms = (allMsgs || []) as any[];

      const hasanHasUnreadHeart = ms.some(m => m.sender === "Saba"  && m.ts > hasanLastSeen && (m.type === "heart" || m.type === "superheart"));
      const sabaHasUnreadHeart  = ms.some(m => m.sender === "Hasan" && m.ts > sabaLastSeen  && (m.type === "heart" || m.type === "superheart"));

      const hasanUnreadMsgs = ms.filter(m => m.sender === "Saba"  && m.ts > hasanLastSeen && m.type !== "heart" && m.type !== "superheart");
      const sabaUnreadMsgs  = ms.filter(m => m.sender === "Hasan" && m.ts > sabaLastSeen  && m.type !== "heart" && m.type !== "superheart");

      setHasanGlow(hasanHasUnreadHeart);
      setSabaGlow(sabaHasUnreadHeart);
      setHasanUnread(hasanUnreadMsgs.length);
      setSabaUnread(sabaUnreadMsgs.length);
    } catch (e) {}
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

  const setStatus = async (status: string) => {
    const u = userRef.current;
    if (!u) return;
    try {
      await supabase.from("user_status").upsert({ username: u, status, updated_at: Date.now() }, { onConflict: "username" });
      setMyStatus(status);
    } catch (e) {}
  };

  useEffect(() => {
    if (view === "login") {
      loadGlowState();
      const t = setInterval(loadGlowState, 5000);
      return () => clearInterval(t);
    }
  }, [view]);

  useEffect(() => {
    if (!user) return;
    newBannerCheckedRef.current = false;
    setLoading(true);
    const init = async () => {
      const { data: mySeenData } = await supabase.from("seen_status").select("last_seen").eq("username", user).maybeSingle();
      const prevLastSeen = mySeenData?.last_seen || 0;
      const messages = await loadMsgs();
      setLoading(false);
      if (!newBannerCheckedRef.current && messages.length > 0) {
        newBannerCheckedRef.current = true;
        const otherUser = user === "Hasan" ? "Saba" : "Hasan";
        const fresh = messages.filter((m: Message) => m.sender === otherUser && m.ts > prevLastSeen && m.type !== "heart" && m.type !== "superheart");
        if (fresh.length > 0) setNewMsgBanner({ count: fresh.length, firstId: fresh[0].id });
      }
    };
    init();
    updateSeen();
    const pi = setInterval(() => loadMsgs(true), 3000);
    const si = setInterval(updateSeen, 5000);
    const sub = supabase.channel(`chat-${user}`).on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadMsgs(true)).on("postgres_changes", { event: "*", schema: "public", table: "typing_status" }, (payload: any) => {
        const otherUser = userRef.current === "Hasan" ? "Saba" : "Hasan";
        if (payload.new?.username === otherUser) {
          const fresh = Date.now() - (payload.new?.updated_at || 0) < 4000;
          setOtherTyping(payload.new?.is_typing && fresh);
        }
      }).subscribe();
    subRef.current = sub;
    return () => {
      clearInterval(pi); clearInterval(si);
      if (subRef.current) supabase.removeChannel(subRef.current);
      updateTyping(false);
    };
  }, [user]);

  useEffect(() => {
    if (!inputFocusedRef.current) return;
    const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    return () => clearTimeout(t);
  }, [msgs]);

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
    // Auto-resize
    const ta = inputRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = `${ta.scrollHeight}px`; }
    // Typing indicator
    updateTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => updateTyping(false), 2000);
  };

 const send = async (extra: { imageData?: string } = {}) => {
  if (sending) return;
  const text = input.trim();
  if (!text && !extra.imageData) return;
  setSending(true);
  console.log("SENDING:", { text, sending }); // ← ADD THIS
  setInput("");
  if (inputRef.current) inputRef.current.style.height = "auto";
  const currentReply = replyTo;
  setReplyTo(null);
  updateTyping(false);
  clearTimeout(typingTimerRef.current);
  const nm: Message = {
    id: crypto.randomUUID(),
    sender: user!, text: text || null, imageData: extra.imageData || null,
    gifUrl: null, reactions: {}, ts: Date.now(),
    replyTo: currentReply || null, type: "text", starred: false, edited: false,
  };
  console.log("INSERTING:", nm); // ← ADD THIS
  try {
    const { error } = await supabase.from("messages").insert(nm);
    console.log("INSERT RESULT:", error); // ← ADD THIS
    if (error) throw error;
    await loadMsgs();
  } catch (e) { console.error("send error:", e); }
  setSending(false);

  const sendHeart = async (isSuper = false) => {
    const recipient = user === "Hasan" ? "Saba" : "Hasan";
    const heartMsg: Message = {
      id: crypto.randomUUID(),
      sender: user!, text: null, imageData: null, gifUrl: null,
      reactions: {}, ts: Date.now(), type: isSuper ? "superheart" : "heart", starred: false, edited: false,
    };
    try {
      await supabase.from("messages").insert(heartMsg);
      await supabase.from("heart_pending").delete().eq("recipient", recipient);
      await supabase.from("heart_pending").insert({ recipient, sender: user!, sent_at: Date.now(), seen: false, is_super: isSuper });
      const newCount = isSuper ? 0 : myHeartCount + 1;
      await supabase.from("heart_counts").upsert({ username: user!, count: newCount }, { onConflict: "username" });
      setMyHeartCount(newCount);
      setCanSuperHeart(newCount >= SUPER_HEART_THRESHOLD);
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
      const reactions = {...msg.reactions };
      Object.keys(reactions).forEach(e => {
        reactions[e] = reactions[e].filter(u => u !== user);
        if (!reactions[e].length) delete reactions[e];
      });
      const wasReacted = msg.reactions?.[emoji]?.includes(user!) ?? false;
      if (!wasReacted) {
        if (!reactions[emoji]) reactions[emoji] = [];
        reactions[emoji] = [...reactions[emoji], user!];
      }
      await supabase.from("messages").update({ reactions }).eq("id", msgId);
      await loadMsgs();
    } catch (e) {}
  };

  const toggleMemoryJar = async (msgId: string) => {
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

  const grouped: Array<{ type: string; label?: string; key?: string; msg?: Message; isFirstInRun?: boolean }> = [];
  let lastDay: string | null = null;
  let lastSender: string | null = null;
  let newDividerAdded = false;
  for (const msg of msgs) {
    const day = fd(msg.ts);
    if (day !== lastDay) { grouped.push({ type: "day", label: day, key: `d${msg.ts}` }); lastDay = day; lastSender = null; }
    if (!newDividerAdded && newMsgBanner && msg.id === newMsgBanner.firstId) {
      grouped.push({ type: "newdivider", key: "newdivider" });
      newDividerAdded = true;
    }
    const isFirstInRun = msg.sender !== lastSender || msg.type === "heart" || msg.type === "superheart";
    grouped.push({ type: "msg", msg, isFirstInRun });
    lastSender = (msg.type === "heart" || msg.type === "superheart") ? null : msg.sender;
  }

  const myMsgs = msgs.filter(m => m.sender === user);
  let lastSeenId: string | null = null;
  for (const m of myMsgs) { if (seenOther >= m.ts) lastSeenId = m.id; }

  const pinnedMsgObj = pinnedData ? msgs.find(m => m.id === pinnedData.message_id) : null;

  if (view === "jar") return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;font-family:'DM Sans',sans-serif}`}</style>
      <MemoryJar onBack={() => setView("login")} night={night} />
    </>
  );

  if (view === "login" || !user) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;font-family:'DM Sans',sans-serif}`}</style>
      <LoginScreen
        onLogin={name => {
          if (name === "Hasan") { setHasanGlow(false); setHasanUnread(0); }
          else { setSabaGlow(false); setSabaUnread(0); }
          setUser(name);
          setView("chat");
        }}
        onJar={() => setView("jar")}
        hasanGlow={hasanGlow}
        sabaGlow={sabaGlow}
        hasanUnread={hasanUnread}
        sabaUnread={sabaUnread}
        night={night}
      />
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        textarea,input{font-family:'DM Sans',sans-serif;}
        textarea:focus,input:focus{outline:none;}
        @keyframes typingDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
        @keyframes bubblePop{0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1}}
      `}</style>

      {lightboxSrc     && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {heartBanner     && <HeartBanner sender={heartBanner.sender} isSuper={heartBanner.isSuper} onDismiss={() => setHeartBanner(null)} />}
      {deleteConfirmId && <DeleteConfirm onConfirm={() => { deleteMsg(deleteConfirmId); setDeleteConfirmId(null); }} onCancel={() => setDeleteConfirmId(null)} />}
      {showStatusPicker && <StatusPicker current={myStatus} onSet={setStatus} onClose={() => setShowStatusPicker(false)} />}
      {statusPopup && <StatusPopup status={statusPopup.status} sender={statusPopup.sender} onClose={() => setStatusPopup(null)} />}

      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: chatBg, position: "relative" }}>
        {night && <NightStars />}
        <BackgroundHeart count={myHeartCount} isSuper={canSuperHeart} night={night} />

        {/* Header */}
        <div style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}`, minHeight: 72, display: "flex", flexDirection: "column", padding: "10px 16px 8px", flexShrink: 0, position: "relative", zIndex: 1 }}>

          {/* Top row — names + heart */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>

            {/* Left — other user */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, color: uc(other) }}>
                {other}
              </div>
              <div style={{ fontSize: 11, color: otherTyping ? uc(other) : headerMut, marginTop: 1, letterSpacing: "0.02em", fontStyle: otherTyping ? "italic" : "normal" }}>
                {otherTyping ? `${other} is typing…` : fLastSeen(otherLastSeen)}
              </div>
            </div>

            {/* Centre — heart / logout */}
            <button
              onClick={() => { setUser(null); setView("login"); setMsgs([]); countRef.current = 0; }}
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: night ? "rgba(255,100,130,0.8)" : "#d4a0a8", background: "none", border: "none", cursor: "pointer", padding: "0 12px", transition: "transform 0.15s", flexShrink: 0, lineHeight: 1 }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.2)"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"}>
              ♡
            </button>

           {/* Right — current user */}
<div style={{ flex: 1, textAlign: "right", minWidth: 0 }}>
  <div style={{ fontSize: 13, fontWeight: 500, color: night ? "white" : uc(user) }}>
    {user}
  </div>
  <button
    onClick={() => setShowStatusPicker(true)}
    style={{ fontSize: 11, color: headerMut, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em", padding: 0, fontFamily: "'DM Sans', sans-serif", marginTop: 1, display: "block", width: "100%", textAlign: "right" }}>
    {myStatus ? "Edit status" : "Set status"}
  </button>
</div>
          </div>

     {/* Bottom row — statuses, full width */}
{(otherStatus || myStatus) && (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
    {otherStatus && (
      <div
        onClick={() => setStatusPopup({ status: otherStatus, sender: other })}
        style={{ fontSize: 12, color: headerMut, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", letterSpacing: "0.03em", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
        {otherStatus}
      </div>
    )}
    {myStatus && (
      <div
        onClick={() => setStatusPopup({ status: myStatus, sender: user })}
        style={{ fontSize: 12, color: headerMut, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", letterSpacing: "0.03em", textAlign: "right", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
        {myStatus}
      </div>
    )}
  </div>
)}
        </div>

        {pinnedMsgObj && <PinnedMessageBar msg={pinnedMsgObj} onScrollTo={() => scrollToMsg(pinnedMsgObj.id)} onUnpin={unpinMessage} night={night} />}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 6, position: "relative", zIndex: 1 }}>
          {newMsgBanner && (
            <NewMsgBanner count={newMsgBanner.count} onJump={() => { scrollToMsg(newMsgBanner.firstId); setNewMsgBanner(null); }} onDismiss={() => setNewMsgBanner(null)} />
          )}
          {loading && <div style={{ textAlign: "center", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: night ? "rgba(255,255,255,0.4)" : MUT, padding: 40, fontSize: 18 }}>Loading…</div>}
          {!loading && msgs.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 80 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: night ? "#f0d8e0" : TXT }}>Say hello ♡</div>
              <div style={{ fontSize: 13, color: night ? "rgba(255,255,255,0.4)" : MUT }}>Just for the two of you.</div>
            </div>
          )}
          {grouped.map(item =>
            item.type === "day" ? (
              <div key={item.key} style={{ textAlign: "center", fontSize: 11, color: night ? "rgba(255,255,255,0.35)" : MUT, letterSpacing: "0.08em", textTransform: "uppercase", margin: "4px 0" }}>{item.label}</div>
            ) : item.type === "newdivider" ? (
              <div key="newdivider" style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
                <div style={{ flex: 1, height: 1, background: night ? "rgba(255,255,255,0.1)" : BR }} />
                <span style={{ fontSize: 11, color: night ? "rgba(255,255,255,0.35)" : MUT, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>New messages</span>
                <div style={{ flex: 1, height: 1, background: night ? "rgba(255,255,255,0.1)" : BR }} />
              </div>
            ) : (
              <MsgItem key={item.msg!.id} msg={item.msg!} user={user} isSeenLast={item.msg!.id === lastSeenId}
                isFirstInRun={item.isFirstInRun!} onReact={toggleReaction}
                onDelete={id => setDeleteConfirmId(id)}
                onReply={handleReply} onImageClick={setLightboxSrc}
                onMemoryJar={toggleMemoryJar} onPin={pinMessage}
                onScrollToReply={scrollToMsg} night={night} otherUser={other}
              />
            )
          )}
          {/* Typing bubble — appears as a fake message at the bottom */}
          {otherTyping && (
            <TypingBubble color={uc(other)} bubbleBg={typingBubbleBg} />
          )}
          <div ref={bottomRef} />
        </div>

        {replyTo && <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} user={user} night={night} />}

        {/* Input bar */}
        <div style={{ background: headerBg, borderTop: `1px solid ${headerBorder}`, padding: "14px 12px 24px", display: "flex", alignItems: "flex-end", gap: 8, flexShrink: 0, position: "relative", zIndex: 1 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()}
            style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${night ? "#5a1830" : BR}`, background: night ? "rgba(255,255,255,0.08)" : "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
            📷
          </button>
          <button onClick={() => sendHeart(canSuperHeart)} title={canSuperHeart ? "Send Super Heart! ✨" : `Send heart (${myHeartCount}/${SUPER_HEART_THRESHOLD})`}
            style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${canSuperHeart ? "#ffd700" : (night ? "#5a1830" : BR)}`, background: canSuperHeart ? "rgba(255,215,0,0.15)" : (night ? "rgba(255,255,255,0.08)" : "white"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0, color: canSuperHeart ? "#ffd700" : "#e0405a", transition: "all 0.3s", boxShadow: canSuperHeart ? "0 0 12px rgba(255,215,0,0.5)" : "none" }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.15)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"}>
            {canSuperHeart ? "💛" : "♥"}
          </button>
          <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKey}
            onFocus={() => { inputFocusedRef.current = true; setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 150); }}
            onBlur={() => { inputFocusedRef.current = false; updateTyping(false); }}
            placeholder={`Message ${other}…`} rows={1}
            style={{ flex: 1, border: `1.5px solid ${night ? "#5a1830" : BR}`, borderRadius: 20, padding: "9px 14px", fontSize: 14, color: night ? "white" : TXT, background: night ? "rgba(255,255,255,0.07)" : dayChatBg, resize: "none", minHeight: 38, maxHeight: 100, lineHeight: 1.4, overflowY: "auto" }} />
          <button onMouseDown={e => e.preventDefault()} onClick={() => send()} disabled={!input.trim() || sending}
            style={{ width: 38, height: 38, borderRadius: "50%", background: uc(user), border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: input.trim() ? 1 : 0.5, transition: "opacity 0.2s" }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </div>
    </>
  );
}
