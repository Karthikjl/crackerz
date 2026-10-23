"use client";

import { Check, Circle, FolderOpen, Music, Pause, Play, Plus, Save, Share2, SkipBack, Sparkles, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { sound } from "@/audio/sound";
import { withBase } from "@/basePath";
import { CRACKERS_BY_ID } from "@/crackers";
import type { EngineApi } from "@/engine/instance";
import { decodeShow, encodeShow } from "@/show/codec";
import { demoShow } from "@/show/demo";
import { deleteShow, listShows, loadShow, saveShow, type SavedShow } from "@/show/storage";
import { SHOW_DURATIONS, type Show } from "@/show/types";
import { hydrateStore, useGameStore } from "@/store/game";
import CrackerTray from "./CrackerTray";
import Dropdown from "./Dropdown";
import PerfHud from "./PerfHud";
import SafetyNotice from "./SafetyNotice";
import { downloadBlob } from "./download";
import Timeline, { type KeyedEvent } from "./Timeline";
import { fieldInput, iconButton, primaryButton, secondaryButton } from "./ui";
import Wordmark from "./Wordmark";

const FireworksCanvas = dynamic(() => import("./FireworksCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-cream/50">Setting up the stage…</div>,
});

let nextKey = 1;
const withKeys = (show: Show): KeyedEvent[] => show.events.map((e) => ({ ...e, key: nextKey++ }));
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

export default function ShowBuilder() {
  const engineRef = useRef<EngineApi | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const timeLabelRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("My Diwali show");
  const [duration, setDuration] = useState(60);
  const [events, setEvents] = useState<KeyedEvent[]>([]);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [music, setMusic] = useState<{ url: string; name: string } | null>(null);
  const [saved, setSaved] = useState<SavedShow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  };

  const applyShow = useCallback((show: Show) => {
    setName(show.name);
    setDuration(show.duration);
    setEvents(withKeys(show));
    setSelectedKey(null);
    setPlaying(false);
    engineRef.current?.pauseShow();
    engineRef.current?.reset();
    engineRef.current?.seekShow(0);
  }, []);

  // Load a shared show from the URL hash, otherwise start with the demo.
  useEffect(() => {
    void hydrateStore().then(() => {
      const { selectedId, select } = useGameStore.getState();
      if (selectedId === "sparkler") select("peony");
    });
    const shared = window.location.hash.length > 1 ? decodeShow(window.location.hash.slice(1)) : null;
    applyShow(shared ?? demoShow());
    setSaved(listShows());
  }, [applyShow]);

  useEffect(() => {
    if (engineReady) engineRef.current?.setShowEvents(events, duration);
  }, [events, duration, engineReady]);

  // Live time label.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (timeLabelRef.current) timeLabelRef.current.textContent = fmt(engineRef.current?.getShowTime() ?? 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedKey === null) return;
    setEvents((list) => list.filter((e) => e.key !== selectedKey));
    setSelectedKey(null);
  }, [selectedKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected]);

  const getTime = useCallback(() => engineRef.current?.getShowTime() ?? 0, []);

  const startAudio = () => {
    const audio = audioRef.current;
    if (!audio || !music) return;
    sound.connectMedia(audio);
    audio.currentTime = getTime();
    void audio.play().catch(() => {});
  };

  const play = () => {
    void sound.unlock();
    engineRef.current?.playShow();
    setPlaying(true);
    startAudio();
  };

  const pause = () => {
    engineRef.current?.pauseShow();
    audioRef.current?.pause();
    setPlaying(false);
  };

  const rewind = () => {
    pause();
    engineRef.current?.reset();
    engineRef.current?.seekShow(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const seek = (t: number) => {
    engineRef.current?.seekShow(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const finishRecording = useCallback(async () => {
    setRecording(false);
    const blob = await engineRef.current?.stopRecording();
    if (blob) downloadBlob(blob, "crackerz-show");
  }, []);

  const onShowEnd = () => {
    audioRef.current?.pause();
    setPlaying(false);
    if (engineRef.current?.isRecording()) void finishRecording();
  };

  const recordVideo = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (recording) {
      pause();
      void finishRecording();
      return;
    }
    void sound.unlock();
    rewind();
    if (!engine.startRecording()) {
      flash("This browser can't record video");
      return;
    }
    setRecording(true);
    play();
  };

  // Taps on the stage add the selected cracker at the playhead and preview it.
  const onTap = (x: number, y: number) => {
    const engine = engineRef.current;
    const stage = stageRef.current;
    if (!engine || !stage) return true;
    void sound.unlock();
    const id = useGameStore.getState().selectedId;
    if (id === "sparkler") return true;
    const fx = x / stage.clientWidth;
    const fy = y / stage.clientHeight;
    const t = Math.round(engine.getShowTime() * 10) / 10;
    engine.fireEvent(id, fx, fy);
    const key = nextKey++;
    setEvents((list) => [...list, { t, id, x: fx, y: fy, key }]);
    setSelectedKey(key);
    return true;
  };

  const show = (): Show => ({ name: name.trim() || "Untitled show", duration, events: events.map(({ t, id, x, y }) => ({ t, id, x, y })) });

  const save = () => {
    if (saveShow(show())) {
      setSaved(listShows());
      flash("Show saved on this device");
    } else {
      flash("Couldn't save: browser storage is blocked");
    }
  };

  const share = async () => {
    const url = `${window.location.origin}${withBase("/show/")}#${encodeShow(show())}`;
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied. Anyone with it can watch your show");
    } catch {
      flash("Copy the link from the address bar");
    }
  };

  const pickMusic = (file: File | undefined) => {
    if (!file) return;
    if (music) URL.revokeObjectURL(music.url);
    setMusic({ url: URL.createObjectURL(file), name: file.name });
  };

  const selected = events.find((e) => e.key === selectedKey);

  return (
    <main className="fixed inset-0 flex select-none flex-col bg-night text-cream">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-plum px-3 py-2.5 sm:px-5">
        <Wordmark compact />
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Show name" className={`${fieldInput} ml-1 h-9 min-w-0 max-w-56 flex-1 py-1.5 text-sm`} />
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={save} className={`${secondaryButton} h-9 px-3 text-sm`} title="Save on this device">
            <Save size={16} /> <span className="hidden sm:inline">Save</span>
          </button>
          <Dropdown
            label="Open a show"
            align="end"
            menuWidth="w-64"
            trigger={
              <>
                <FolderOpen size={16} /> <span className="hidden sm:inline">Open</span>
              </>
            }
            items={[
              { id: "new", label: "New empty show", icon: <Plus size={15} />, onSelect: () => applyShow({ name: "My Diwali show", duration: 60, events: [] }) },
              { id: "demo", label: "Diwali Night (demo)", icon: <Sparkles size={15} className="text-marigold" />, onSelect: () => applyShow(demoShow()) },
              ...(saved.length ? [{ type: "separator" as const, id: "saved" }] : []),
              ...saved.map((s) => ({
                id: `saved-${s.name}`,
                label: s.name,
                onSelect: () => {
                  const loaded = loadShow(s);
                  if (loaded) applyShow(loaded);
                },
                action: {
                  icon: <Trash2 size={14} />,
                  label: `Delete ${s.name}`,
                  onClick: () => {
                    deleteShow(s.name);
                    setSaved(listShows());
                  },
                },
              })),
            ]}
          />
          <button type="button" onClick={share} className={`${secondaryButton} h-9 px-3 text-sm`} title="Copy a link to this show">
            <Share2 size={16} /> <span className="hidden sm:inline">Share</span>
          </button>
          <button
            type="button"
            onClick={recordVideo}
            className={recording ? "flex h-9 items-center gap-1.5 rounded-full bg-rani px-3 text-sm font-semibold text-white" : `${secondaryButton} h-9 px-3 text-sm`}
            title="Play the show from the start and save it as a video"
          >
            <Circle size={13} className={recording ? "" : "text-rani"} fill="currentColor" />
            <span className="hidden sm:inline">{recording ? "Stop recording" : "Record video"}</span>
          </button>
        </div>
      </header>

      {/* Stage */}
      <div ref={stageRef} className="relative min-h-0 flex-1">
        <FireworksCanvas
          register
          onTap={onTap}
          onShowEnd={onShowEnd}
          onEngine={(e) => {
            engineRef.current = e;
            setEngineReady(!!e);
          }}
        />
        {events.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-cream/70">Pick a cracker below, then tap the sky or ground to add it.</p>
        )}
        {toast && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-plum-3/95 px-4 py-2 text-sm shadow-lg ring-1 ring-white/10" role="status">
            <Check size={14} className="mr-1.5 inline text-marigold" />
            {toast}
          </div>
        )}
      </div>

      {/* Transport */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/8 bg-plum px-3 py-2 sm:px-5">
        <button type="button" onClick={rewind} className={iconButton} aria-label="Back to start" title="Back to start">
          <SkipBack size={16} />
        </button>
        <button type="button" onClick={playing ? pause : play} className={`${primaryButton} h-10 w-24 px-0`}>
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          {playing ? "Pause" : "Play"}
        </button>
        <p className="text-sm tabular-nums text-cream/80">
          <span ref={timeLabelRef}>0:00.0</span>
          <span className="text-cream/40"> / {fmt(duration)}</span>
        </p>
        <Dropdown
          label="Show length"
          menuWidth="w-40"
          trigger={`${duration}s show`}
          items={[...new Set([...SHOW_DURATIONS, duration])]
            .sort((a, b) => a - b)
            .map((d) => ({ id: String(d), label: `${d} seconds`, selected: d === duration, onSelect: () => setDuration(d) }))}
        />
        <button type="button" onClick={() => fileRef.current?.click()} className={`${secondaryButton} h-9 max-w-48 px-3 text-sm`} title="Play your own song with the show">
          <Music size={15} className="shrink-0" />
          <span className="truncate">{music ? music.name : "Add music"}</span>
        </button>
        {music && (
          <button type="button" onClick={() => { URL.revokeObjectURL(music.url); setMusic(null); }} className="text-cream/50 hover:text-cream" aria-label="Remove music">
            <X size={16} />
          </button>
        )}
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => pickMusic(e.target.files?.[0])} />
        <audio ref={audioRef} src={music?.url} preload="auto" />

        <div className="ml-auto flex items-center gap-2 text-sm">
          {selected ? (
            <>
              <span className="hidden text-cream/60 sm:inline">
                {CRACKERS_BY_ID[selected.id].name} at {selected.t.toFixed(1)}s
              </span>
              <button type="button" onClick={deleteSelected} className={`${secondaryButton} h-9 px-3 text-sm`}>
                <Trash2 size={15} className="text-rani" /> Delete
              </button>
            </>
          ) : (
            <span className="hidden text-cream/50 lg:inline">Tap the stage to add the selected cracker at the playhead. Drag markers to move them.</span>
          )}
        </div>
      </div>

      <Timeline
        events={events}
        duration={duration}
        selectedKey={selectedKey}
        playing={playing}
        getTime={getTime}
        onSelect={setSelectedKey}
        onMove={(key, t) => setEvents((list) => list.map((e) => (e.key === key ? { ...e, t: Math.round(t * 10) / 10 } : e)))}
        onSeek={seek}
      />

      <CrackerTray exclude={["sparkler"]} showFinale={false} />
      <PerfHud />
      <SafetyNotice />
    </main>
  );
}
