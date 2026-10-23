"use client";

import { Check, Copy, Flame, Gift, PenLine, RotateCcw, Send, Share2, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { sound } from "@/audio/sound";
import { withBase } from "@/basePath";
import type { EngineApi } from "@/engine/instance";
import { fieldInput, panel, primaryButton, secondaryButton } from "./ui";
import Wordmark from "./Wordmark";

const FireworksCanvas = dynamic(() => import("./FireworksCanvas"), { ssr: false });

const MESSAGES = ["Happy Diwali", "Shubh Deepavali", "Happy New Year", "Happy Birthday", "Congratulations"];
const MAX_LEN = 24;
const REPEAT_MS = 9000;

interface Greeting {
  to: string;
  msg: string;
  from: string;
}

function readGreeting(): Greeting | null {
  const p = new URLSearchParams(window.location.search);
  const to = (p.get("to") ?? "").trim().slice(0, MAX_LEN);
  if (!to) return null;
  return { to, msg: (p.get("msg") ?? MESSAGES[0]).trim().slice(0, MAX_LEN) || MESSAGES[0], from: (p.get("from") ?? "").trim().slice(0, MAX_LEN) };
}

function greetingUrl(g: Greeting): string {
  const p = new URLSearchParams({ to: g.to, msg: g.msg });
  if (g.from) p.set("from", g.from);
  return `${window.location.origin}${withBase("/greeting/")}?${p.toString()}`;
}

export default function GreetingClient() {
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => {
      setGreeting(readGreeting());
      setLoaded(true);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const open = (g: Greeting | null) => {
    window.history.pushState(null, "", g ? greetingUrl(g) : withBase("/greeting/"));
    setGreeting(g);
  };

  if (!loaded) return <main className="min-h-dvh bg-night" />;
  return greeting ? <GreetingView greeting={greeting} onEdit={() => open(null)} /> : <GreetingForm onCreate={open} />;
}

function GreetingForm({ onCreate }: { onCreate: (g: Greeting) => void }) {
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState(MESSAGES[0]);
  const [from, setFrom] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (to.trim()) onCreate({ to: to.trim(), msg: msg.trim() || MESSAGES[0], from: from.trim() });
  };

  return (
    <main className="relative flex min-h-dvh flex-col bg-night text-cream">
      <FireworksCanvas ambient />
      <header className="relative z-10 px-5 pt-4 sm:px-8">
        <Wordmark />
      </header>
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <form onSubmit={submit} className={`${panel} w-full max-w-md p-6 sm:p-7`}>
          <h1 className="font-display text-3xl text-marigold">Send a fireworks greeting</h1>
          <p className="mt-2 text-[15px] text-cream/70">Their name bursts across the night sky. Share the link on WhatsApp or anywhere else.</p>

          <label className="mt-6 block">
            <span className="mb-1.5 block text-sm font-medium text-cream/80">Their name</span>
            <input value={to} onChange={(e) => setTo(e.target.value)} maxLength={MAX_LEN} required placeholder="Priya" className={fieldInput} autoFocus />
          </label>

          <fieldset className="mt-5">
            <legend className="mb-1.5 text-sm font-medium text-cream/80">Message</legend>
            <div className="flex flex-wrap gap-1.5">
              {MESSAGES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMsg(m)}
                  aria-pressed={msg === m}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition ${msg === m ? "bg-cream font-semibold text-ink" : "bg-plum-2 text-cream/75 hover:bg-plum-3"}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={MAX_LEN} placeholder="Or write your own" className={`${fieldInput} mt-2`} aria-label="Message" />
          </fieldset>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium text-cream/80">Your name (optional)</span>
            <input value={from} onChange={(e) => setFrom(e.target.value)} maxLength={MAX_LEN} placeholder="Arjun" className={fieldInput} />
          </label>

          <button type="submit" disabled={!to.trim()} className={`${primaryButton} mt-7 h-12 w-full text-base`}>
            <Send size={18} /> Create greeting
          </button>
        </form>
      </div>
    </main>
  );
}

function GreetingView({ greeting, onEdit }: { greeting: Greeting; onEdit: () => void }) {
  const engineRef = useRef<EngineApi | null>(null);
  const [started, setStarted] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const play = useCallback(() => engineRef.current?.writeText([greeting.msg, greeting.to]), [greeting]);

  useEffect(() => {
    if (!started) return;
    play();
    const text = setInterval(play, REPEAT_MS);
    // A few background shells between text bursts.
    const shells = setInterval(() => engineRef.current?.fireEvent("random", 0.1 + Math.random() * 0.8, 0.12 + Math.random() * 0.2), 2600);
    return () => {
      clearInterval(text);
      clearInterval(shells);
    };
  }, [started, play]);

  return (
    <main className="fixed inset-0 select-none bg-night text-cream">
      <FireworksCanvas interactive fixedCracker="random" onEngine={(e) => (engineRef.current = e)} />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-linear-to-b from-night/80 to-transparent px-4 pb-8 pt-3 sm:px-6">
        <Wordmark compact />
        {started && (
          <div className="pointer-events-auto flex gap-2">
            <button type="button" onClick={play} className={`${secondaryButton} h-9 px-3.5 text-sm`}>
              <RotateCcw size={15} /> Replay
            </button>
            <button type="button" onClick={() => setShareOpen(true)} className={`${primaryButton} h-9 px-3.5 text-sm`}>
              <Share2 size={15} /> Share
            </button>
          </div>
        )}
      </header>

      {!started ? (
        <div className="absolute inset-0 grid place-items-center bg-night/65 px-6">
          <div className="text-center">
            <p className="font-display text-3xl text-marigold sm:text-4xl">{greeting.from ? `${greeting.from} sent you a surprise` : "You have a surprise"}</p>
            <p className="mt-2 text-cream/70">Turn your sound on, then tap to open it.</p>
            <button
              type="button"
              onClick={() => {
                void sound.unlock();
                setStarted(true);
              }}
              className={`${primaryButton} mt-7 h-14 px-8 text-lg`}
            >
              <Gift size={20} /> Open greeting
            </button>
          </div>
        </div>
      ) : (
        <footer className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-linear-to-t from-night/85 to-transparent px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-16">
          {greeting.from && <p className="text-cream/80">With love from <span className="font-semibold text-cream">{greeting.from}</span></p>}
          <p className="text-[13px] text-cream/50">Tap the sky to add more fireworks</p>
          <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onEdit} className={`${secondaryButton} h-10 text-sm`}>
              <PenLine size={16} /> Make your own
            </button>
            <Link href="/play" className={`${secondaryButton} h-10 text-sm`}>
              <Flame size={16} /> Burst crackers
            </Link>
          </div>
        </footer>
      )}

      {shareOpen && <ShareSheet greeting={greeting} onClose={() => setShareOpen(false)} />}
    </main>
  );
}

function ShareSheet({ greeting, onClose }: { greeting: Greeting; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = greetingUrl(greeting);
  const text = `${greeting.msg}, ${greeting.to}! 🎆 Open your fireworks greeting:`;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/80 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Share greeting" onClick={(e) => e.stopPropagation()} className={`${panel} w-full max-w-md rounded-b-none p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-b-3xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Share this greeting</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-plum-2 hover:bg-plum-3" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-2">
          <input readOnly value={url} className={`${fieldInput} min-w-0 text-sm`} onFocus={(e) => e.target.select()} aria-label="Greeting link" />
          <button type="button" onClick={copy} className={`${secondaryButton} h-11 shrink-0 px-4 text-sm`}>
            {copied ? <Check size={16} className="text-marigold" /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer" className={`${primaryButton} h-11 text-sm`}>
            <Send size={16} /> Send on WhatsApp
          </a>
          {canShare && (
            <button type="button" onClick={() => navigator.share({ title: "Crackerz greeting", text, url }).catch(() => {})} className={`${secondaryButton} h-11 text-sm`}>
              <Share2 size={16} /> More options
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
