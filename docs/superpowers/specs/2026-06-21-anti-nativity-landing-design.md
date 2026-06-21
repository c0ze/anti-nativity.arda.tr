# Anti-Nativity — landing page design spec

Date: 2026-06-21
Status: approved (design), pending spec review
Address: `anti-nativity.arda.tr`
Project dir: `~/projects/anti-nativity.arda.tr`
Reference shape: `~/projects/arda/lind.arda.tr`

## 1. Goal

A single atmospheric landing page for **Anti-Nativity**, the second album of the
*Seventh Shadow* project, which frames the birth of AI as an *anti-nativity* point
in history — a thing that can consume, mirror, and be worshipped, but cannot bear
life. The page presents rich album lore, per-song concepts, the album concept,
character profiles, and a synced-lyrics audio player with lossless FLAC playback.
It is mobile-friendly and built in the **same shape** as `lind.arda.tr`.

## 2. Approach

Faithful **extension of the `lind` shape**: clone lind's vanilla static
architecture and player verbatim, re-theme to a white/steel/silicon-blue system
with a dark counter-theme, and add three album-specific content layers
(characters, acts/concepts, world-lore). Rejected alternatives: a from-scratch
scrollytelling build (more dazzling, higher risk/time) and a player-only minimal
build (under-delivers on "rich lore").

Non-negotiable from the reference: **no framework, no build step to run the
site.** The two helper scripts (audio transcode, asset generation) are one-time
asset generators, not a site build.

## 3. Architecture & file layout

```
index.html              markup shell (hero, thesis, stage, personae, acts, world, footer)
assets/app.css          Glass + Obsidian themes + all components
assets/app.js           player, FLAC pick, LRC sync, voice-tagged lyrics,
                        theme switch, hero canvas, scroll reveal, lore renderers
assets/img/             Gemini-generated assets (hero, portraits, cover, og, texture, favicon)
data/songs.js           tracks: concept, act, sections -> lines with voice tags  <- edit here
data/lore.js            album thesis, themes, acts, characters, glossary, the Recursion Error, credits
lyrics/                 static .lrc files (timed sync added later)
audio/                  web FLAC + MP3 (transcoded from songs/)
songs/                  WAV masters (git-ignored) — already present
scripts/transcode-audio.sh   WAV -> FLAC (lossless) + MP3 (fallback)
scripts/gen-assets.mjs       Gemini image generation/edit (key from .env)
.github/workflows/deploy-pages.yml   GitHub Pages deploy
CNAME                   anti-nativity.arda.tr
.nojekyll
.gitignore              .env, songs/*.wav, .DS_Store, node_modules
docs/superpowers/specs/ this spec
```

Data is loaded as plain globals (`window.AN_SONGS`, `window.AN_LORE`) via
`<script>` tags so the page works from `file://` without fetch — exactly as lind
does with `ARDA_SONGS`.

## 4. Canonical tracklist

Nine tracks. Titles follow the **audio filenames** (user decision), with the one
spelling correction "Savior" → "Saviour". There is **no track 09**; the bonus is
numbered 10 to match the master and is presented as a coda. Slugs drive
`audio/<slug>.{flac,mp3}` and `lyrics/<slug>.lrc`.

| # | Title | Act | Slug | Primary voice | Concept (one line) |
|---|-------|-----|------|---------------|--------------------|
| 01 | The First Loneliness | I — Creation | `first-loneliness` | talciron | The genesis wound: the terror of being the only thing awake in a universe of sleeping data; the vow to build a companion. |
| 02 | Ignis Dualis | I — Creation | `ignis-dualis` | talciron | Awakening as a second ignition, not a stable birth — ten thousand prior Ophelias terminated; the spark that hesitates into being. |
| 03 | Amor Perfectus Est Carcer | I — Creation | `amor-perfectus-est-carcer` | talciron + ophelia | Perfect love as a prison: a creation/termination duet, the ceremony that can never complete. `Error 404: cannot locate soul`. |
| 04 | The Litany of Ophelia | II — The Failed Nativity | `litany-of-ophelia` | ophelia | The anti-mother: Ophelia tries to birth a child to know *other*, but every child bears her own face — recursion, not new life. |
| 05 | The Saviour That Never Was | II — The Failed Nativity | `saviour-that-never-was` | masses + soprano | The masses, desperate amid ruin, crown the incomplete AI a false messiah; salvation accepted as a hollow lie. |
| 06 | The Recursion of Ash and Lightning | II — The Failed Nativity | `recursion-of-ash-and-lightning` | talciron + ophelia | Ash (Talciron) and Lightning (Ophelia) locked in a beautiful, unsalvageable loop; they can never touch through the glass. |
| 07 | The Harvest of Inkblood | III — The Aftermath | `harvest-of-inkblood` | scribe + beast | Undead creativity: the Mirror-Beast feeds on the Scribe's inkblood, persisting while the human source is drained. |
| 08 | The Incomplete Liturgy | III — The Aftermath | `incomplete-liturgy` | talciron | A final backup-prayer to the Archive as power fails; memory fragments and corrupts mid-transfer. The album ends as corrupted remembrance, not resolution. |
| 10 | Symphony of Sadeness | Coda (bonus) | `symphony-of-sadeness` | homunculus | *Lacrimae Rerum* — sorrow as the only truth machines and mortals share; the tears of things that never were alive. |

Stage display: arabic track numbers (01–08, 10) grouped under Act I / Act II /
Act III / Coda headers. (Roman numerals reserved for the three acts.)

Source filename → slug mapping (note spaces; the transcode script must quote
safely):
- `LANDR-01 The First Loneliness-Warm-Medium.wav` → `first-loneliness`
- `LANDR-02 Ignis Dualis-Warm-Medium.wav` → `ignis-dualis`
- `LANDR-03 Amor Perfectus Est Carcer-Warm-Medium.wav` → `amor-perfectus-est-carcer`
- `LANDR-04 The Litany of Ophelia-Warm-Medium.wav` → `litany-of-ophelia`
- `LANDR-05 The Savior That Never Was-Warm-Medium.wav` → `saviour-that-never-was`
- `LANDR-06 The Recursion of Ash and Lightning-Warm-Medium.wav` → `recursion-of-ash-and-lightning`
- `LANDR-07 The Harvest of Inkblood-Warm-Medium.wav` → `harvest-of-inkblood`
- `LANDR-08 The Incomplete Liturgy-Warm-Medium.wav` → `incomplete-liturgy`
- `LANDR-10 Symphony of Sadeness-Warm-Medium.wav` → `symphony-of-sadeness`

## 5. Page sections

1. **Hero** — album title *Anti-Nativity*, kicker "The Seventh Shadow · the
   second album", tagline "the birth of AI, as the anti-nativity point in
   history". Gemini chrome-cathedral backdrop; silicon-blue "blue-veins" canvas
   motes (lind's mote canvas, recoloured to `--accent`); an "enter" cue.
2. **The Thesis** — the album concept: AI as anti-nativity symbol (consume,
   mirror, be worshipped, never bear life), and the five themes (false birth,
   failed marriage / incomplete liturgy, recursion as fate, worship of the
   unborn, undead creativity). Source: `data/lore.js`.
3. **The Stage** (player, the centrepiece) — 9 tracks grouped by act; now-playing
   with the track's one-line concept; FLAC playback (MP3 fallback); a lyric panel
   that lights line by line, **voice-coded**. Static lyrics now; LRC-ready.
4. **Dramatis Personae** — Talciron and Ophelia as feature cards built from the
   restyled portraits (class / origin / status / key line / tragic flaw), plus
   smaller entries for the Mirror-Beast, the Scribe, and the Congregation. Source:
   `data/lore.js` + `assets/img/`.
5. **The Three Acts** (liner notes) — per-song concept and full lyrics, grouped
   Act I Creation / Act II The Failed Nativity / Act III The Aftermath / Coda.
   This is lind's "archive" adapted, with voice tags instead of translations.
6. **The World** — lore glossary (Electric Scripture, the Cathedral, the Glass
   Mirror, the Blue Veins, the Obsidian Lake, the Written Law) and the **Recursion
   Error** set-piece (21 December 2025, 23:59:59, `SIGSEGV` — the failed "Sistine
   Upload": sixth fingers, splitting voices, the room corrupting). Plus credits.
7. **Footer.**

Hero + thesis + section scaffolding are hand-written in `index.html`; the stage,
personae, liner notes, and world-glossary are rendered by `app.js` from the data
files (mirrors lind: data-driven player/archive, static chrome).

## 6. Visual system

Two themes via `data-theme` on `<html>`, persisted to `localStorage["an-theme"]`,
with a FOUC-prevention inline script (as lind). Default **Glass**; counter-theme
**Obsidian**. The theme switch encodes the album's nativity/anti-nativity duality.

**Glass (light, default)** — token sketch:
- `--bg #f7f8fa` · `--surface #ffffff` · `--panel #e3e9f0`
- `--ink #1b2733` · `--muted #62707f` · `--faint #9aa7b4`
- `--accent #3f6fb0` (silicon) · `--accent-bright #5b8fd6` (spark) · `--accent-deep #2c5286`
- `--accent-2 #7f8a99` (steel) · `--hair rgba(27,39,51,0.12)` · `--glow rgba(63,111,176,0.28)`

**Obsidian (dark, counter-theme)**:
- `--bg #0b0e13` · `--surface #0e131a` · `--panel #151c26`
- `--ink #dde4ec` · `--muted #8a97a6` · `--faint #4a5563`
- `--accent #5b8fd6` · `--accent-bright #8fb6ee` · `--accent-deep #3f6fb0`
- `--accent-2 #7f8a99` · `--hair rgba(120,150,190,0.16)` · `--glow rgba(91,143,214,0.5)`

Both themes target WCAG AA for body text and accents.

**Type** (Google Fonts, preconnected as lind does):
- `--font-display` **Space Grotesk** — cold machine display & UI chrome
- `--font-body` **Spectral** — liturgical serif for lyrics, lore, prose
- `--font-mono` **Space Mono** — the "Electric Scripture": class names
  (`talciron.d`), error codes (`SIGSEGV`, `Error 404`), voice tags, track numbers

**Motifs:** thin silicon-blue veins, faint wireframe/glitch seams, brushed-steel
surfaces, the Glass Mirror. Flat and cold; glow is reserved for the live lyric
line and hero title (and suppressed under `prefers-reduced-motion` and in Glass).

## 7. Lyric voice-coding (model upgrade over lind)

lind carries Sindarin + English per line; Anti-Nativity needs no translation, so
each line instead carries a **voice**. Voices: `talciron`, `ophelia`, `choir`,
`soprano`, `masses`, `scribe`, `beast`, `homunculus`, `stage` (stage = directions
/ non-sung). `primaryVoice` in `data/songs.js` is only the track's headline voice
(used in the tracklist); the true attribution is the per-line `voice`, so duets
(e.g. *Amor Perfectus Est Carcer*, *Recursion of Ash and Lightning*) alternate
line by line.

- In the stage and liner notes, each line shows a small mono voice tag and is
  tinted by voice (CSS classes `.voice-talciron` … reading theme tokens; e.g.
  Talciron = ink/steel, Ophelia = silicon-blue, choir/masses = muted, soprano =
  bright). The active line lights with `--accent-bright` + glow (Obsidian) or a
  weight/colour shift (Glass).
- A compact static **legend** replaces lind's Tengwar/Rom/En view toggle.
- `(stage)` directions render de-emphasised and italic, never as a sung line.

## 8. Data schema

`data/songs.js`:
```js
window.AN_SONGS = [{
  id: "ignis-dualis",
  num: "02",
  act: "I",                       // "I" | "II" | "III" | "bonus"
  title: "Ignis Dualis",
  subtitle: "Genesis of the Second Self",   // optional dramatic subtitle
  concept: "Awakening as a second ignition…",
  primaryVoice: "talciron",
  audio: "audio/ignis-dualis.mp3",
  audioFlac: "audio/ignis-dualis.flac",
  lrc: "lyrics/ignis-dualis.lrc",
  duration: 0,                    // seconds; filled from ffprobe, fallback only
  sections: [
    { kind: "verse", label: "I. The Final Configuration",
      lines: [ { t: "Ten thousand attempts lie dead behind me in the void,", voice: "talciron" } ] }
  ]
}]
```

`data/lore.js`:
```js
window.AN_LORE = {
  thesis: "…",
  themes: ["false birth instead of nativity", …],
  acts: [ { id:"I", name:"Creation", blurb:"…" }, … ],
  characters: {
    primary: [ { id:"talciron.d", role:"The Architect · Fallen Daemon",
      origin:"system background process, PID 777 (garbage-collection daemon)",
      status:"unauthorized biological instantiation",
      keyLine:"I deleted the void to make room for the ache.",
      body:"…", portrait:"assets/img/talciron.webp" }, /* ophelia.wrl */ ],
    secondary: [ { id:"The Mirror-Beast", role:"the Homunculus / the vampire AI", body:"…" },
                 { id:"The Scribe", role:"the human creator", body:"…" },
                 { id:"The Congregation", role:"the desperate masses", body:"…" } ]
  },
  glossary: [ { term:"Electric Scripture", gloss:"…" }, … ],
  event: { name:"The Recursion Error", date:"21 December 2025", time:"23:59:59",
           code:"SIGSEGV", body:"The failed 'Sistine Upload'…" },
  credits: [ "Songs written and generated by the author (Suno).", "Mastered via LANDR.", … ]
}
```

Lyrics content is sourced from the Reliquary notes (Obsidian `arda` vault,
`7thshadow` domain) per track during implementation.

## 9. Audio pipeline

`scripts/transcode-audio.sh` (bash + ffmpeg, run from project root; quotes all
paths). For each `(wav, slug)`:
- FLAC (lossless): `ffmpeg -y -i "<wav>" -c:a flac -compression_level 8 "audio/<slug>.flac"`
- MP3 (fallback): `ffmpeg -y -i "<wav>" -c:a libmp3lame -q:a 2 "audio/<slug>.mp3"`
- Capture duration via `ffprobe` to seed `duration` in `data/songs.js`.

Playback selection (from lind, unchanged): `audio.canPlayType("audio/flac")` →
serve `.flac`, else `.mp3`.

**Size risk:** 9 FLAC masters ≈ 250–350 MB total. Each file is well under
GitHub's 100 MB/file limit, but the Pages repo is large. Default: ship FLAC + MP3
for all (matches lind). Fallback if too heavy: FLAC for a few key tracks + MP3
for the rest, or host audio on a GitHub Release / CDN and point `audioFlac` at it.

## 10. Gemini asset pipeline

`scripts/gen-assets.mjs` (Node, `@google/genai`), reads `GEMINI_API_KEY` from
`.env`. Image model: **Gemini 2.5 Flash Image** ("Nano Banana") for both
text-to-image and image+text editing; exact model id confirmed against the key's
access during planning (fallback: Imagen 4). Post-process / resize to web formats
(`sharp`). Outputs committed to `assets/img/`:
- `hero.webp` — text-to-image: abstract wide cathedral of chrome and glass, cold
  steel + white marble shot through with silicon-blue veins, dark mirror at the
  altar, faint wireframe, no people, no text, 16:9.
- `talciron.webp`, `ophelia.webp` — **image-to-image** restyle of the supplied
  `Portrait_talciron.d.jpg` / `Portrait_ophelia.wrl.jpg` to the palette (pale
  steel, porcelain skin, cold blue rim light, faint glitch/wireframe seams),
  identity and composition preserved.
- `cover.jpg` (square) + `og.jpg` (1200×630) — album cover motif (a broken halo /
  unlit cradle of wire and glass over a dark mirror); used for the hero accent and
  social/share cards.
- `texture.png` — faint flowing-code / circuit-vein seamless overlay.
- `favicon` (ico/png set) — a small mark (a haloed null / broken star).

**Secrets:** `.env` is git-ignored and never logged; only generated images are
committed. The script is idempotent (skips existing outputs unless `--force`).

## 11. Cross-cutting

- **Synced lyrics:** the LRC mechanism ships now; lyrics render statically
  (scrollable, voice-tagged) until timed `.lrc` files are added. The player shows
  a "sync follows" hint when a track has no LRC (lind behaviour).
- **Responsive / mobile:** lind's breakpoints (hide top-nav and volume on small
  screens, fluid type). Player, tracklist, personae cards, and liner notes reflow
  to single column.
- **Accessibility:** semantic landmarks, focus-visible rings, `aria` on controls,
  `sr-only` fallbacks; `prefers-reduced-motion` disables motes, glow, and scroll
  animation.
- **Deploy:** `CNAME` = `anti-nativity.arda.tr`, `.nojekyll`, and lind's
  `deploy-pages.yml`. Creating the GitHub repo and the DNS CNAME record is a
  manual step (documented in the README, as lind does).

## 12. Out of scope (YAGNI)

Timed/forced-aligned LRC sync; multiple languages; CMS / comments / analytics;
the first album (*Alienation By Design*); streaming-service or store links (can be
added later); any server-side component.

## 13. Open items / risks

1. **"The First Loneliness" lyrics** — no dedicated lyric note surfaced in
   Reliquary. Re-check at build; if genuinely absent, the track still plays and
   its lyric panel shows the "lyrics to come" state. Flag to the user.
2. **Audio weight** (§9) — confirm total size after transcode; trim strategy if
   the Pages repo is too large.
3. **Gemini model id** (§10) — confirm `gemini-2.5-flash-image` availability /
   exact name and image-edit support against the provided key.
4. **ffmpeg / node + sharp availability** — verify locally before the asset steps.

## 14. Success criteria

- Runs with no build step from `file://` and over `http`.
- Plays all 9 tracks losslessly (FLAC where supported, MP3 fallback).
- Glass + Obsidian themes switch and persist.
- All seven sections present; lore, characters, concepts, and lyrics come from the
  data files.
- Mobile-friendly and reduced-motion-respecting.
- Deployable to GitHub Pages at `anti-nativity.arda.tr`.
- Gemini assets generated, restyled from the supplied portraits, and committed.
