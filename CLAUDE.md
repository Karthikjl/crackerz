# Crackerz - Virtual Crackers Web App

A just-for-fun browser playground where users place, light, and burst Diwali crackers - from small sparklers to large sky shots - with realistic particles and sound.

**Frontend only.** No login, no accounts, no backend, no database. Do not add auth, Supabase, or any server. Anything "saved" lives in `localStorage`; anything "shared" is encoded in the URL.

> Status: **All 3 phases complete** (playground, full catalog, greeting / show builder / capture). Update this file as decisions change.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript (strict), static export (`output: "export"`) |
| Rendering | PixiJS v8 (WebGL), one additive `ParticleContainer` + a small normal-blend smoke pool |
| Physics | Custom struct-of-arrays particle engine (no physics library) |
| Audio | Procedural Web Audio API synth (`src/audio/sound.ts`) - no sound files |
| State | Zustand (volume, mute, scene, quality, reduced-flash, haptics persisted to localStorage) |
| Styling | Tailwind CSS v4 (use canonical classes, e.g. `bg-linear-to-r`), design tokens in `globals.css` |
| Icons | `lucide-react` for UI controls; custom SVG cracker illustrations in `components/CrackerIcon.tsx` |
| Fonts | Yatra One (`font-display`, headings/wordmark), Hind (`font-sans`, UI) via `next/font/google` |
| Tests | Vitest |
| Backend | None - static site |
| Hosting | Vercel / Netlify (static `out/` folder) |
| Offline | PWA: `app/manifest.ts`, `public/sw.js` (registered in production only), icons in `public/icons/` |

Decisions: **2D** rendering (not Three.js), **Diwali/Indian cracker theme**, **no login/backend**, **procedural audio** (replaced the original Howler plan - no asset licensing, nothing to download).

## Commands

```bash
npm install          # install deps
npm run dev          # next dev (http://localhost:3000)
npm run build        # next build → static site in out/
npm start            # serve the static build from out/ on :3000 (`next start` doesn't work with output: export)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run test         # vitest run (engine/physics unit tests)
```

## Folder Structure

```
src/
├─ app/
│  ├─ layout.tsx          # root layout, fonts, metadata, viewport, PwaRegister
│  ├─ page.tsx            # Landing: live ambient fireworks + Start button (unlocks audio)
│  ├─ play/page.tsx       # Playground
│  ├─ greeting/page.tsx   # Greeting: form → /greeting?to=&msg=&from= → name written in fireworks
│  ├─ show/page.tsx       # Show builder: timeline, music, save/share (/show#v1.<code>), record video
│  ├─ manifest.ts         # PWA manifest (force-static)
│  └─ icon.svg, apple-icon.png
├─ engine/
│  ├─ Engine.ts           # Pixi app, layers, input, frame loop, effects, settings, finale, ambient mode
│  ├─ entities/placed.ts  # PlacedBase lifecycle + Fountain, Spinner, Bomb, Rocket, Snake, Cake, Chain
│  ├─ entities/effects.ts # Shell, Shockwave, Timer, Finale
│  ├─ bursts.ts           # explode(): per-pattern shell bursts + flash/sound/smoke
│  ├─ bodies.ts           # cracker body drawings + fuse tip offsets
│  ├─ ParticleStore.ts    # SoA particle pool + physics step (pure, tested)
│  ├─ ParticleRenderer.ts # mirrors ParticleStore into Pixi Particles (flicker/strobe)
│  ├─ patterns.ts         # sphere/hemisphere/arms/ring/heart velocity patterns (pure, tested)
│  ├─ smoke.ts            # smoke puff pool
│  ├─ scene.ts            # sky, moon, stars + city / village / temple / beach landscapes
│  ├─ settings.ts         # EngineSettings, SCENES, QUALITIES - no Pixi import
│  ├─ textures.ts         # generated glow, smoke, sky textures
│  ├─ textPoints.ts       # rasterizes text to sample points (greeting)
│  ├─ recorder.ts         # MediaRecorder canvas + audio video capture
│  ├─ quality.ts          # quality tiers, device detection, reduced-motion
│  ├─ color.ts            # hex/RGB/BGR helpers
│  ├─ types.ts            # EngineContext, Entity, PlacedCracker
│  └─ instance.ts         # getEngine()/setEngine() for UI - no Pixi import
├─ crackers/index.ts      # Cracker catalog (pure data), SHELLS, CATEGORIES
├─ audio/sound.ts         # procedural sound engine singleton
├─ show/                  # Show types, codec (URL-safe share code, tested), demo show, localStorage list
├─ components/            # PlayClient, FireworksCanvas, AmbientBackground, TopBar, CrackerTray, CrackerIcon,
│                         # SettingsPanel, StartButton, RecordButton, GreetingClient, ShowBuilder, Timeline,
│                         # Wordmark, PwaRegister, ui.ts (shared class sets), download.ts
└─ store/game.ts          # Zustand store + hydrateStore() + engineSettings()
public/sw.js, public/icons/
```

## Deployment (GitHub Pages)

- Repo: https://github.com/Karthikjl/crackerz → site: https://karthikjl.github.io/crackerz/
- `.github/workflows/deploy.yml` runs on every push to `main`: `npm ci` → `npm test` → build → publish `out/`. Pages source must be set to **GitHub Actions** (Settings → Pages).
- The site lives in a sub-folder, so the workflow sets `NEXT_PUBLIC_BASE_PATH=/<repo>` (empty for a `<user>.github.io` repo or when the `CUSTOM_DOMAIN` repo variable is set). `next.config.ts` uses it as `basePath`, with `trailingSlash: true`.
- `<Link>` and `router.push` add the base path automatically. Any **hand-built URL** (share links, `history.pushState`, service worker, manifest) must use `withBase()` from `src/basePath.ts`. `public/sw.js` derives its paths from its own scope.
- `public/.nojekyll` (also touched in the workflow) stops GitHub hiding `_next/`.
- Test a sub-folder build locally: in Git Bash run `MSYS_NO_PATHCONV=1 NEXT_PUBLIC_BASE_PATH=/crackerz npm run build`, copy `out/` into a `crackerz/` folder and serve its parent. Rebuild without the variable afterwards for `npm start`.

## Architecture

- **Static Next.js.** No API routes, server actions, middleware, or anything needing a Node server.
- **PixiJS and Web Audio are browser-only.** `FireworksCanvas` is always loaded via `next/dynamic(..., { ssr: false })` (from `PlayClient` and `AmbientBackground`). Never touch `window`, `document`, `AudioContext`, or Pixi at module top level. `sound.unlock()` must run inside a user gesture (Start button, canvas pointerdown).
- **Strict Mode mounts twice in dev**: `FireworksCanvas` uses a `cancelled` flag so an engine finishing async init after unmount is destroyed.
- **Store hydration:** persisted settings load via `hydrateStore()` before the engine is created (`skipHydration` avoids SSR mismatches).
- **Keep React out of the render loop.** React renders UI chrome only. The engine runs on the Pixi ticker, reads the selected cracker via `getSelected`, and reports back via `onPlacedCountChange` - only when the value changes.
- **UI → engine** goes through `getEngine()` from `engine/instance.ts` (`lightAll`, `clearPlaced`, `grandFinale`). Settings changes reach the engine through a store subscription in `FireworksCanvas` → `engine.applySettings()`.
- **Entities:** placed crackers (`PlacedCracker`, lit by tapping) live in `crackers`. Everything free-running (shells, shockwaves, timers, finale) lives in `effects`. Add them with `ctx.addEffect()` / `ctx.after()`.
- **Frame order:** scene → pointers or ambient launcher → crackers → effects → `particles.step` (death: branch/crackle/split; trail callback) → `renderer.sync` → smoke → flash decay → shake.
- **`FireworksCanvas` props:** `ambient` (auto shells, 0.7× particles), `interactive` (tap input, default `!ambient`), `fixedCracker`, `register` (becomes `getEngine()`, default `!ambient`), `onTap` (return true to override default tap behaviour - the show builder uses this), `onShowEnd`, `onEngine`.
- **Show playback runs inside the engine** (`setShowEvents`/`playShow`/`seekShow`/`getShowTime`) on game time. UI reads time via `requestAnimationFrame` and writes to DOM refs - no per-frame React state.
- **Greeting text:** `TextShell` bursts into points from `textPoints()`. Each particle gets `v = distance × k` with `k = −ln(drag)·60`, so drag stops it exactly on its letter pixel.
- **Sound settings:** pages call `syncSoundSettings()` (store → sound engine). The home page has its own toggle (`HomeSoundToggle`, persisted as `homeMuted`) that uses `sound.setPageMuted()` — a page-only mute layered on top of the global mute and reset on unmount. Don't use the global `muted` for page-specific muting.
- **Safety notice** (`SafetyNotice.tsx`): real-world cracker safety and pollution tips plus the flashing-lights note. Auto-opens once on the first visit to home, play or show (persisted `safetySeen`; closing it counts as seen). Reopen with `SafetyButton` (the "?" in the home header) or Settings → Safety tips. Not shown on greeting links, so recipients see their surprise first.
- **Never let UI around the canvas change size on interaction** (tabs, selections, hints). The canvas resizes, WebGL wipes it, and low-end phones show a black flash plus a full scene rebuild. Tray labels reserve two lines for this reason. For resizes that do happen (rotation, address bar, window drag), the canvas is CSS-sized to 100% (`autoDensity: false`) so it stretches instead of exposing black. `scheduleResize()` debounces the real resize and scene rebuild by 120ms, and `resize()` calls `app.render()` immediately. `localPoint()` scales pointer coordinates while a resize is pending.
- **No background-color transitions between transparent and a light color** (e.g. selected tab → `bg-cream`). Browsers blend through dark grey, so pills flash black mid-switch. Switch instantly. `-webkit-tap-highlight-color` is transparent globally.
- **Avoid layout shifts during a press:** don't change the size of header or controls on `pointerdown`. It moves elements between press and release and swallows the click. Do it on `click`.
- **Autoplay:** browsers block audio until a user gesture, so no page can play sound on load. `sound.unlock()` resolves `true` once audio is running. The home toggle starts audio on the first pointerdown/keydown/touchend anywhere and shows "Tap for sound" until then. Never show a sound-on state while `sound.running` is false.
- **Capture:** `screenshot()` uses `renderer.extract`; `startRecording()` combines `canvas.captureStream()` with `sound.captureStream()`. Show music goes through `sound.connectMedia()` so it obeys volume and is recorded.
- **Units:** all config speeds/gravity are px/s at a 900px-tall reference; multiply by `u` (`Engine.u`, clamped from canvas size). `groundY = 0.86 × height`.
- **Colors:** Pixi `Particle.color` is BGR + alpha in the top byte; Graphics/Sprite tints are RGB. Use `color.ts` helpers.
- **Particle flags** (`ParticleStore.ts`): `F_HOT` (white-hot start), `F_FLICKER`, `F_BRANCH` (tiny splits on death), `F_CRACKLE` (pops + crackle sound), `F_TRAIL` (leaves sparks), `F_SPLIT` (crossette 4-way split), `F_STROBE`.
- **Trails** come from velocity-stretched sprites plus `F_TRAIL` spark emission, not render-texture fades.

### Cracker configs are data

`src/crackers/index.ts` holds `CRACKERS` (typed `CrackerConfig`). Behaviour is chosen by `kind`: `sparkler | fountain | spinner | snake | bomb | chain | rocket | cake | shell`. Extra fields: `body` (drawing), `pattern` (shell burst, or `"random"`), `shots`/`interval` (cakes, chain), `power` (bombs).

- Add new crackers as config first.
- Add a new `kind` in `entities/placed.ts` (and `createPlacedCracker`) only when the behaviour is really new.
- A new shell pattern needs a `case` in `bursts.ts`.

### Cracker catalog (23)

- **Ground:** Sparkler, Flower Pot, Color Pencil, Ground Chakkar, Snake Tablet
- **Sound:** Bijli, Atom Bomb, Laxmi Bomb (shockwave), 1000 Wala chain
- **Sky:** Rocket, Sky Shot 12 / 30 / 60 / 120
- **Shells:** Peony, Chrysanthemum, Golden Willow, Palm, Crossette, Ring, Heart, Strobe, Multi-break, Surprise (random)
- **Grand Finale** button: lights all placed crackers, ~9s accelerating barrage, then a 10-shell volley.

## Performance Rules (non-negotiable)

- **No allocation in the hot loop.** Particles live in `ParticleStore` typed arrays (pool of `MAX_PARTICLES`); Pixi `Particle` sprites and smoke sprites are pre-allocated once. No `new`, array spreads, or per-particle closures per frame.
- One `ParticleContainer` with the shared glow texture - no per-particle `Graphics`.
- Quality tier (`quality.ts`: cores, `deviceMemory`, touch) sets the starting `particles.limit`, `spawnScale`, smoke and render resolution. Always multiply spawn counts by `ctx.spawnScale`.
- **Adaptive quality** (`perf.ts`, `PerfGovernor`, unit-tested; only when quality is "auto"): steps through `PERF_LEVELS` (resolution, spawn, smoke) — down after ~1.2s of slow busy frames (or very slow idle frames), back up after 8s of fast frames. `Engine.applyQuality()` applies a level. Resolution drops early because pixel fill is the main cost on weak GPUs.
- **Fill-rate matters most:** hide full-screen layers when invisible (`flashRect.visible`), avoid big overlapping translucent sprites, and never use CSS `backdrop-filter`/`backdrop-blur` (it re-blurs every frame over the canvas). Star twinkle is off on low tier.
- Update entity lists in place (compaction loops), not with `filter()` every frame.
- Use `dt` in all physics. Drag is a per-1/60s factor applied as `pow(drag, dt*60)`.
- **Check performance** with `?debug` on `/play` or `/show` (`PerfHud`: fps, tier, adaptive level, resolution, spark count).
- **Keep things on screen:** rockets pick a burst height in the visible sky and burst when the nose reaches it. Sideways motion is a bounded wobble steered inward near edges. Cake shells near edges fan inward. Never use unbounded random walks for positions.

## Design System

- **Palette** (Tailwind tokens): `night` #0b0619 background, `plum` / `plum-2` / `plum-3` surfaces, `marigold` #ffb627 primary, `saffron`, `rani` #e8457a (finale, recording, destructive), `cream` #f6ecd9 text, `ink` (text on marigold).
- **Controls:** reuse `iconButton`, `primaryButton`, `secondaryButton`, `panel`, `fieldInput`, `sectionTitle` from `components/ui.ts`. Don't hand-roll new button styles.
- **Dropdowns:** always use `components/Dropdown.tsx`, never a native `<select>` or a hand-built popover. It covers action menus (items with `onSelect`, optional trailing `action` such as delete) and value pickers (set `selected` on every item → radio items with a check). Keyboard: arrows/Home/End move, Enter selects, Esc closes, Delete triggers an item's action.
- **Sliders:** always use `components/Slider.tsx` (styled by `.slider` in `globals.css`; the filled part comes from the `--fill` CSS variable). Never a bare `<input type="range">`.
- **Scrollbars** are themed globally (thin, dark, no arrow buttons) in `globals.css`. Don't add per-element scrollbar styles.
- **Global base styles** live in `@layer base` in `globals.css` so Tailwind utilities can override them.
- **Icons:** no emoji in the UI. New crackers need an entry in `CrackerIcon.tsx` (48×48 viewBox, same flat palette).
- **Copy:** sentence case, plain verbs, no all-caps labels.

## UX & Accessibility

- Interactions: pick a tab and a cracker → tap ground to place → tap the cracker to light. Sky shells burst at the tapped height; hold to keep firing. Sparkler: press and drag. Multi-touch works. "Light all" lights placed crackers left-to-right with a stagger.
- **Reduced flashing** (setting, or automatic with `prefers-reduced-motion`): sky flash ×0.25, no shake, no flicker/strobe blinking.
- **Settings panel:** scene, volume, quality (Auto/Low/Medium/High), reduced flashing, vibration, fullscreen.
- The landing page shows a flashing-lights notice.
- Mobile-first: canvas fills the area above the bottom tray. Canvas has `touch-action: none`.

## Roadmap

1. ✅ **MVP:** Playground, particle engine, 6 crackers, procedural sound, mobile touch, haptics
2. ✅ **Full catalog:** 23 crackers, Grand Finale, smoke, 4 scenes, settings panel, PWA/offline, live landing page
3. ✅ **Extras:** Greeting mode (URL params, WhatsApp/native share), Show Builder (tap-to-record timeline, drag markers, music, localStorage saves, share links, demo show, export video), screenshot + video recording with sound, professional UI pass (custom cracker icons, lucide controls, Yatra One + Hind)

Out of scope: login, accounts, backend, database, gallery, multiplayer.

## Conventions

- TypeScript strict mode; no `any` in `engine/`.
- `src/engine`, `src/crackers`, `src/audio` must not import React. `instance.ts`, `settings.ts`, `quality.ts` and `crackers/` must not import Pixi (UI imports them).
- After changing `public/sw.js` caching, bump its `CACHE` name.
- The app was renamed from CrackerVerse to Crackerz. `storageMigration.ts` moves old `crackerverse-*` localStorage keys to `crackerz-*` on first load. Keep it so returning visitors keep their settings and saved shows. If a storage key changes again, migrate it the same way.
- Unit-test pure logic (`ParticleStore`, `patterns`, `show/codec`) with Vitest (`vitest.config.ts` maps `@/`). Pixi-dependent code is verified in the browser.
- Share codes are versioned (`v1.`). If the format changes, add `v2.` and keep decoding `v1.`.
- Keep tunable numbers in cracker configs where practical.
