"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

export default function AiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "سلام! من Family AI هستم 💜 تایپ کن یا روی میکروفون بزن و باهام حرف بزن." },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    if (!speechSupported) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition: SpeechRecognitionLike = new SpeechRecognition();
    recognition.lang = "fa-IR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      setInput(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [speechSupported]);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fa-IR";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const value = input.trim();
    if (!value || busy) return;
    const next = [...messages, { role: "user", content: value } as ChatMessage];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: value, history: messages.slice(-12) }),
      });
      const data = await response.json();
      const reply = data.reply || "فعلاً نتونستم پاسخ بدم؛ دوباره امتحان کن 💜";
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      speak(reply);
    } finally {
      setBusy(false);
    }
  }

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      setListening(true);
      recognition.start();
    }
  }

  return (
    <main className="shell">
      <div className="stars" />
      <header className="topbar">
        <a href="/" className="brandMark" style={{ textDecoration: "none", color: "white" }}>←</a>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>هوش مصنوعی خانواده 💜</h1>
          <p style={{ margin: "5px 0 0", color: "#aaa2c5", fontSize: 12 }}>متنی + صوتی فارسی</p>
        </div>
        <div className="avatar">🤖</div>
      </header>

      <section className="hero" style={{ textAlign: "center" }}>
        <div className="mascot" style={{ height: 160 }}>
          <div className="roof" />
          <div className="heart">♥</div>
          <div className="orb" />
          <div className="wave" />
        </div>
        <h2 style={{ margin: "4px 0 8px" }}>{listening ? "گوش می‌دم... 🎧" : "با من حرف بزن 🎙️"}</h2>
        <p style={{ color: "#bdb5d6", margin: 0 }}>برنامه‌ریزی، یادآوری، سرگرمی، سؤال و کمک‌های خانوادگی</p>
        <button className="mic" onClick={toggleListening} style={{ border: 0, margin: "18px auto 0", cursor: "pointer" }} aria-label="شروع گفت‌وگوی صوتی">
          {listening ? "◼" : "🎙️"}
        </button>
        {!speechSupported && <p style={{ color: "#ff9dbf", fontSize: 12 }}>مرورگر فعلی تشخیص گفتار داخلی ندارد؛ اتصال STT سروری در فاز Voice Provider فعال می‌شود.</p>}
      </section>

      <div className="sectionTitle"><h3>گفت‌وگو</h3><span>{busy ? "در حال فکر..." : "آنلاین"}</span></div>
      <section style={{ display: "grid", gap: 10 }}>
        {messages.map((message, index) => (
          <div key={index} style={{
            justifySelf: message.role === "user" ? "start" : "end",
            maxWidth: "86%",
            padding: "13px 15px",
            borderRadius: 18,
            background: message.role === "user" ? "linear-gradient(135deg,#653fff,#9c31c8)" : "rgba(255,255,255,.07)",
            border: "1px solid rgba(255,255,255,.08)",
            lineHeight: 1.9,
            fontSize: 14,
          }}>
            {message.content}
            {message.role === "assistant" && (
              <button onClick={() => speak(message.content)} style={{ marginRight: 8, background: "transparent", border: 0, color: "#bca9ff", cursor: "pointer" }}>🔊</button>
            )}
          </div>
        ))}
      </section>

      <form onSubmit={submit} style={{ position: "sticky", bottom: 16, marginTop: 18, display: "flex", gap: 8, padding: 8, borderRadius: 20, background: "rgba(14,10,43,.9)", border: "1px solid rgba(255,255,255,.08)", backdropFilter: "blur(20px)" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="یا تایپ کن..." style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: 0, color: "white", padding: "10px 12px", font: "inherit" }} />
        <button type="submit" disabled={busy} style={{ width: 48, borderRadius: 15, border: 0, color: "white", background: "linear-gradient(145deg,#6849ff,#d542e8)", fontSize: 20 }}>➤</button>
      </form>
    </main>
  );
}
