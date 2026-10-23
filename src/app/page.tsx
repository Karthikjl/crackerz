import { Clapperboard, Gift } from "lucide-react";
import Link from "next/link";
import AmbientBackground from "@/components/AmbientBackground";
import HomeSoundToggle from "@/components/HomeSoundToggle";
import SafetyNotice, { SafetyButton } from "@/components/SafetyNotice";
import StartButton from "@/components/StartButton";
import { secondaryButton } from "@/components/ui";
import Wordmark from "@/components/Wordmark";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-night text-cream">
      <AmbientBackground />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_40%,rgba(11,6,25,0.82)_0%,rgba(11,6,25,0.4)_55%,transparent_80%)]" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-4 sm:px-8">
        <Wordmark />
        <div className="flex items-center gap-2">
          <nav className="hidden gap-1 text-sm text-cream/70 sm:flex">
            <Link href="/greeting" className="rounded-full px-3 py-1.5 hover:bg-white/8 hover:text-cream">
              Greeting
            </Link>
            <Link href="/show" className="rounded-full px-3 py-1.5 hover:bg-white/8 hover:text-cream">
              Show builder
            </Link>
          </nav>
          <SafetyButton />
          <HomeSoundToggle />
        </div>
      </header>

      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-[18vh] text-center">
        <h1 className="font-display text-[clamp(3.25rem,11vw,7.5rem)] leading-[0.95] text-marigold [text-shadow:0_0_40px_rgba(255,122,26,0.45)]">
          Light up
          <br />
          Diwali night
        </h1>
        <p className="mt-5 max-w-[34ch] text-lg leading-relaxed text-cream/80 sm:text-xl">
          Sparklers, flower pots, 1000 walas and sky shots - burst every cracker you like, right in your browser.
        </p>
        <div className="mt-9 flex w-full max-w-xs flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
          <StartButton />
          <Link href="/greeting" className={`${secondaryButton} h-12`}>
            <Gift size={18} /> Send a greeting
          </Link>
          <Link href="/show" className={`${secondaryButton} h-12`}>
            <Clapperboard size={18} /> Build a show
          </Link>
        </div>
        <p className="mt-7 text-[13px] text-cream/50">Turn your sound on. This site has flashing lights.</p>
      </section>
      <SafetyNotice />
    </main>
  );
}
