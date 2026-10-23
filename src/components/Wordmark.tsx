import Link from "next/link";

/** Diya mark + name, links home. */
export default function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="pointer-events-auto flex shrink-0 items-center gap-2" aria-label="Crackerz home">
      <svg viewBox="0 0 32 32" width={28} height={28} aria-hidden="true">
        <path d="M16 3 C20 8 20 12 16 14 C12 12 12 8 16 3 Z" fill="#ffb627" />
        <path d="M16 7 C17.8 9.5 17.6 11.5 16 12.4 C14.4 11.5 14.2 9.5 16 7 Z" fill="#fff3d6" />
        <path d="M4 17 Q16 31 28 17 Z" fill="#ff7a1a" />
        <path d="M4 17 Q16 21 28 17" stroke="#e8457a" strokeWidth={1.6} fill="none" />
      </svg>
      {/* Yatra One draws a lowercase z like a 3, so the z comes from Hind to keep "Crackerz" readable. */}
      <span className={`font-display text-xl leading-none text-cream ${compact ? "hidden sm:inline" : ""}`}>
        Cracker<span className="font-sans font-bold">z</span>
      </span>
    </Link>
  );
}
