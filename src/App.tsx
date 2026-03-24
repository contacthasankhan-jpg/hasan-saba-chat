import { useState, useEffect, useRef } from "react";
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

interface ReplyTo {
  id: string;
  sender: string;
  text: string | null;
  imageData: string | null;
}

interface Message {
  id: string;
  sender: string;
  text: string | null;
  imageData: string | null;
  gifUrl: string | null;
  reactions: Record<string, string[]>;
  ts: number;
  replyTo?: ReplyTo | null;
}

function LoginScreen({ onLogin }: { onLogin: (name: string) => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: BG, padding: "2rem" }}>
      <p style={{ fontSize: 16, color: MUT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Tickle the tism'</p>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 46, fontWeight: 400, color: TXT, marginBottom: 6, letterSpacing: -0.5 }}>Hasan & Saba</h1>
      <p style={{ fontSize: 16, color: MUT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 52 }}>The Seventh Infinity Stone</p>
      <p style={{ fontSize: 11, color: MUT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>Who are you?</p>
      <div style={{ display: "flex", gap: 14 }}>
        {["Hasan", "Saba"].map(n => (
          <button key={n} onClick={() => onLogin(n)}
            style={{ padding: "13px 40px", borderRadius: 50, border: `2px solid ${uc(n)}`, background: "white", fontSize: 15, fontWeight: 500, color: uc(n), cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = ul(n)}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "white"}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReplyPreview({ replyTo, onCancel, user }: { replyTo: ReplyTo; onCancel: () => void; user: string }) {
  const color = uc(replyTo.sender);
  return (
    <div style={{ background: "white", borderTop: `1px solid ${BR}`, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ width: 3, borderRadius: 2, background: color, alignSelf: "stretch", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 2 }}>{replyTo.sender === user ? "You" : replyTo.sender}</div>
        <div style={{ fontSize: 12, color: MUT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {replyTo.imageData ? "📷 Photo" : replyTo.text || ""}
        </div>
      </div>
      <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: MUT, padding: "0 4px", flexShrink: 0 }}>✕</button>
    </div>
  );
}

function MsgItem({ msg, user, isSeenLast, onReact, onDelete, onReply }: {
  msg: Message;
  user: string;
  isSeenLast: boolean;
  onReact: (id: string, emoji: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReply: (msg: Message) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeTriggered = useRef(false);

  const mine = msg.sender === user;
  const color = uc(msg.sender);
  const light = ul(msg.sender);
  const reactions = Object.entries(msg.reactions || {}).filter(([, u]) => u.length > 0);

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
    if (mine && dx < 0) {
      setSwipeX(Math.max(dx, -70));
    } else if (!mine && dx > 0) {
      setSwipeX(Math.min(dx, 70));
    }
    if (Math.abs(dx) > 50 && !swipeTriggered.current) {
      swipeTriggered.current = true;
      onReply(msg);
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
    }
  };

  const handleTouchEnd = () => {
    setSwipeX(0);
    setSwiping(false);
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginBottom: 2, width: "100%", boxSizing: "border-box", padding: "0 8px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPickerOpen(false); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {!mine && <div style={{ fontSize: 11, color, fontWeight: 500, marginBottom: 3, paddingLeft: 4 }}>{msg.sender}</div>}

      {msg.replyTo && (
        <div style={{ maxWidth: "75%", marginBottom: 4, background: mine ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.05)", borderRadius: 10, padding: "5px 10px", borderLeft: `3px solid ${uc(msg.replyTo.sender)}`, cursor: "default" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: uc(msg.replyTo.sender), marginBottom: 2 }}>
            {msg.replyTo.sender === user ? "You" : msg.replyTo.sender}
          </div>
          <div style={{ fontSize: 12, color: MUT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {msg.replyTo.imageData ? "📷 Photo" : msg.replyTo.text || ""}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, flexDirection: mine ? "row-reverse" : "row", maxWidth: "75%", width: "auto", transform: `translateX(${swipeX}px)`, transition: swiping ? "none" : "transform 0.2s ease" }}>
        {hovered && mine && (
          <button onClick={() => onDelete(msg.id)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#ccc", padding: "0 2px", flexShrink: 0 }}>✕</button>
        )}
        {hovered && (
          <button onClick={() => onReply(msg)} title="Reply"
            style={{ width: 22, height: 22, borderRadius: "50%", background: "white", border: "1px solid #eee", cursor: "pointer", fontSize: 12, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            ↩
          </button>
        )}
        {hovered && (
          <button onClick={e => { e.stopPropagation(); setPickerOpen(v => !v); }}
            style={{ width: 22, height: 22, borderRadius: "50%", background: "white", border: "1px solid #eee", cursor: "pointer", fontSize: 13, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            +
          </button>
        )}
        <div style={{ maxWidth: "100%", minWidth: 0 }}>
          {msg.imageData && <img src={msg.imageData} alt="" style={{ maxWidth: "100%", borderRadius: 12, display: "block", marginBottom: msg.text ? 4 : 0 }} />}
          {msg.gifUrl && <img src={msg.gifUrl} alt="" style={{ maxWidth: 200, borderRadius: 12, display: "block", marginBottom: msg.text ? 4 : 0 }} />}
          {msg.text && (
            <div style={{ background: mine ? color : light, color: mine ? "white" : TXT, padding: "9px 14px", borderRadius: 18, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4, fontSize: 14, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
            {msg.text}
          </div>
          )}
        </div>
      </div>

      {pickerOpen && (
        <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 3, padding: "4px 8px", background: "white", borderRadius: 22, border: "1px solid #eee", marginTop: 5, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => { onReact(msg.id, e); setPickerOpen(false); }}
              style={{ background: (msg.reactions?.[e] || []).includes(user) ? "#f5f5f5" : "none", border: "none", cursor: "pointer", fontSize: 18, padding: "2px 3px", borderRadius: 6 }}>
              {e}
            </button>
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
      <div style={{ fontSize: 10, color: "#c0b0a8", marginTop: 3, paddingLeft: mine ? 0 : 4, paddingRight: mine ? 4 : 0, display: "flex", alignItems: "center", gap: 4 }}>
        {ft(msg.ts)}
        {mine && <span style={{ color: isSeenLast ? color : "#d0c0b8", fontWeight: isSeenLast ? 500 : 400 }}>{isSeenLast ? "✓✓ Seen" : "✓"}</span>}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [seenOther, setSeenOther] = useState(0);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const countRef = useRef(0);
  const userRef = useRef<string | null>(null);
  const subRef = useRef<any>(null);

  useEffect(() => { userRef.current = user; }, [user]);

  const other = user === "Hasan" ? "Saba" : "Hasan";
  const chatBg = user === "Saba" ? BG_SABA : user === "Hasan" ? BG_HASAN : BG;

  const loadMsgs = async (notify = false) => {
    const u = userRef.current;
    if (!u) return;
    try {
      const { data: arr, error } = await supabase.from("messages").select("*").order("ts", { ascending: true });
      if (error) throw error;
      const messages = (arr || []) as Message[];
      if (notify && messages.length > countRef.current) {
        const newOnes = messages.slice(countRef.current);
        if (newOnes.some(m => m.sender !== u)) ping();
      }
      countRef.current = messages.length;
      setMsgs(messages);
      const otherUser = u === "Hasan" ? "Saba" : "Hasan";
      const { data: seenData, error: seenError } = await supabase.from("seen_status").select("last_seen").eq("username", otherUser).maybeSingle();
      if (!seenError && seenData) setSeenOther(seenData.last_seen || 0);
    } catch (e) {
      console.error("Error loading messages:", e);
      setMsgs([]);
    }
  };

  const updateSeen = async () => {
    const u = userRef.current;
    if (!u) return;
    try {
      await supabase.from("seen_status").upsert({ username: u, last_seen: Date.now() }, { onConflict: "username" });
    } catch (e) {
      console.error("Error updating seen status:", e);
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadMsgs().finally(() => setLoading(false));
    updateSeen();
    const pi = setInterval(() => loadMsgs(true), 3000);
    const si = setInterval(updateSeen, 5000);
    const sub = supabase.channel("messages").on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => { loadMsgs(true); }).subscribe();
    subRef.current = sub;
    return () => {
      clearInterval(pi);
      clearInterval(si);
      if (subRef.current) supabase.removeChannel(subRef.current);
    };
  }, [user]);

  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [msgs]);

  const handleReply = (msg: Message) => {
    setReplyTo({ id: msg.id, sender: msg.sender, text: msg.text, imageData: msg.imageData });
    inputRef.current?.focus();
  };

  const send = async (extra: { imageData?: string } = {}) => {
    if (sending) return;
    const text = input.trim();
    if (!text && !extra.imageData) return;
    setSending(true);
    setInput("");
    const currentReply = replyTo;
    setReplyTo(null);

    const nm: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender: user!,
      text: text || null,
      imageData: extra.imageData || null,
      gifUrl: null,
      reactions: {},
      ts: Date.now(),
      replyTo: currentReply || null
    };

    try {
      const { error } = await supabase.from("messages").insert(nm);
      if (error) throw error;
      await loadMsgs();
    } catch (e) {
      console.error("Error sending message:", e);
    }

    setSending(false);
    setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current) {
        inputRef.current.scrollIntoView({ block: "nearest" });
      }
    }, 50);
    await updateSeen();
  }; // ✅ closing brace was missing before!

  const deleteMsg = async (id: string) => {
    try {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
      await loadMsgs();
    } catch (e) {
      console.error("Error deleting message:", e);
    }
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    try {
      const msg = msgs.find(m => m.id === msgId);
      if (!msg) return;
      const reactions = {...msg.reactions };
      if (!reactions[emoji]) reactions[emoji] = [];
      if (reactions[emoji].includes(user!)) {
        reactions[emoji] = reactions[emoji].filter(u => u !== user);
        if (!reactions[emoji].length) delete reactions[emoji];
      } else {
        reactions[emoji] = [...reactions[emoji], user!];
      }
      const { error } = await supabase.from("messages").update({ reactions }).eq("id", msgId);
      if (error) throw error;
      await loadMsgs();
    } catch (e) {
      console.error("Error toggling reaction:", e);
    }
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
  if (isMobile) return; // on mobile, Enter always makes new line
  if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
    e.preventDefault();
    send();
  }
  // Ctrl+Enter makes new line on PC (default behaviour, no need to handle)
};

  const grouped: Array<{ type: string; label?: string; key?: string; msg?: Message }> = [];
  let lastDay: string | null = null;
  for (const msg of msgs) {
    const day = fd(msg.ts);
    if (day !== lastDay) { grouped.push({ type: "day", label: day, key: `d${msg.ts}` }); lastDay = day; }
    grouped.push({ type: "msg", msg });
  }

  const myMsgs = msgs.filter(m => m.sender === user);
  let lastSeenId: string | null = null;
  for (const m of myMsgs) { if (seenOther >= m.ts) lastSeenId = m.id; }

  if (!user) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;font-family:'DM Sans',sans-serif}`}</style>
      <LoginScreen onLogin={setUser} />
    </>
  );

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;}textarea,input{font-family:'DM Sans',sans-serif;}textarea:focus,input:focus{outline:none;}`}</style>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: chatBg }}>

        <div style={{ background: "white", borderBottom: `1px solid ${BR}`, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, color: uc(other) }}>{other}</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, letterSpacing: 4, color: "#d4a0a8" }}>♡</div>
          <div style={{ textAlign: "right" }}>
            <button onClick={() => setUser(null)} style={{ display: "block", background: "none", border: "none", fontSize: 11, color: MUT, cursor: "pointer", letterSpacing: "0.05em", marginLeft: "auto" }}>switch</button>
            <div style={{ fontSize: 13, fontWeight: 500, color: uc(user) }}>{user}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {loading && <div style={{ textAlign: "center", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: MUT, padding: 40, fontSize: 18 }}>Loading…</div>}
          {!loading && msgs.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 80 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: TXT }}>Say hello ♡</div>
              <div style={{ fontSize: 13, color: MUT }}>Just for the two of you.</div>
            </div>
          )}
          {grouped.map(item => item.type === "day" ? (
            <div key={item.key} style={{ textAlign: "center", fontSize: 11, color: MUT, letterSpacing: "0.08em", textTransform: "uppercase", margin: "4px 0" }}>{item.label}</div>
          ) : (
            <MsgItem key={item.msg!.id} msg={item.msg!} user={user} isSeenLast={item.msg!.id === lastSeenId} onReact={toggleReaction} onDelete={deleteMsg} onReply={handleReply} />
          ))}
          <div ref={bottomRef} />
        </div>

        {replyTo && <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} user={user} />}

        <div style={{ background: "white", borderTop: `1px solid ${BR}`, padding: "10px 12px", display: "flex", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} title="Send photo"
            style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${BR}`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
            📷
          </button>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
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