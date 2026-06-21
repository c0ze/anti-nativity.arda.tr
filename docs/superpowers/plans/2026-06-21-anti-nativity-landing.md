# Anti-Nativity Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `anti-nativity.arda.tr` static album landing page — rich lore, song concepts, voice-coded synced-ready lyrics, lossless FLAC playback, two themes — in the same vanilla shape as `lind.arda.tr`.

**Architecture:** Standalone vanilla HTML/CSS/JS, no framework, no run-time build. Content lives in plain-global data files (`window.AN_SONGS`, `window.AN_LORE`); `app.js` renders the player + lore sections and `app.css` carries two themes (Glass light, Obsidian dark). Two one-time Node/bash scripts generate audio (`ffmpeg`) and imagery (Gemini). Deployed via GitHub Pages.

**Tech Stack:** HTML5 audio (FLAC + MP3), vanilla ES5-style JS (matches lind), CSS custom properties, `ffmpeg`/`ffprobe`, Node + `@google/genai` + `sharp`, GitHub Pages.

**Reference (read before starting):** `~/projects/arda/lind.arda.tr` — especially `index.html`, `assets/app.css`, `assets/app.js`, `data/songs.js`, `scripts/transcode-audio.sh`, `.github/workflows/deploy-pages.yml`. This plan adapts those files; "start from lind's X" means copy that file and apply the changes shown.

**Spec:** `docs/superpowers/specs/2026-06-21-anti-nativity-landing-design.md`.

**Conventions:**
- Project root: `~/projects/anti-nativity.arda.tr` (run all commands from here).
- The `.env` holds `GEMINI_API_KEY=…` — never print it, never commit it.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- "Verify" steps for a static site = serve + observe and/or a runnable Node assertion; there is no unit-test framework.

---

### Task 1: Scaffold project, git, and deploy config

**Files:**
- Create: `.gitignore`, `CNAME`, `.nojekyll`, `.github/workflows/deploy-pages.yml`
- Create dirs: `assets/img/`, `data/`, `lyrics/`, `audio/`, `scripts/`

- [ ] **Step 1: Initialize git and directory tree**

```bash
cd ~/projects/anti-nativity.arda.tr
git init
mkdir -p assets/img data lyrics audio scripts .github/workflows
```

- [ ] **Step 2: Create `.gitignore`**

```
.env
.DS_Store
node_modules/
songs/*.wav
```

- [ ] **Step 3: Create `CNAME` and `.nojekyll`**

```bash
printf 'anti-nativity.arda.tr' > CNAME
touch .nojekyll
```

- [ ] **Step 4: Copy lind's Pages workflow verbatim**

```bash
cp ~/projects/arda/lind.arda.tr/.github/workflows/deploy-pages.yml .github/workflows/deploy-pages.yml
```

- [ ] **Step 5: Verify scaffold**

Run: `git status --short && ls -la && cat .github/workflows/deploy-pages.yml | head -5`
Expected: untracked `.gitignore`, `CNAME`, `.nojekyll`, `.github/`, and existing `Portrait_*.jpg`, `songs/`; `.env` NOT listed (ignored); workflow file present.

- [ ] **Step 6: Commit**

```bash
git add .gitignore CNAME .nojekyll .github
git commit -m "chore: scaffold project and GitHub Pages deploy config

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Transcode WAV masters to FLAC + MP3

**Files:**
- Create: `scripts/transcode-audio.sh`

- [ ] **Step 1: Verify ffmpeg is available**

Run: `ffmpeg -version | head -1 && ffprobe -version | head -1`
Expected: version lines. If missing: `brew install ffmpeg`.

- [ ] **Step 2: Create `scripts/transcode-audio.sh`**

```bash
#!/usr/bin/env bash
# Transcode the LANDR WAV masters in songs/ to lossless FLAC + web MP3 in audio/.
# Also prints each track's duration (seconds) to seed data/songs.js.
# Requires ffmpeg + ffprobe. Run from project root: bash scripts/transcode-audio.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p audio

# wav-basename (without .wav)  ->  output slug
map() {
  cat <<'EOF'
LANDR-01 The First Loneliness-Warm-Medium=first-loneliness
LANDR-02 Ignis Dualis-Warm-Medium=ignis-dualis
LANDR-03 Amor Perfectus Est Carcer-Warm-Medium=amor-perfectus-est-carcer
LANDR-04 The Litany of Ophelia-Warm-Medium=litany-of-ophelia
LANDR-05 The Savior That Never Was-Warm-Medium=saviour-that-never-was
LANDR-06 The Recursion of Ash and Lightning-Warm-Medium=recursion-of-ash-and-lightning
LANDR-07 The Harvest of Inkblood-Warm-Medium=harvest-of-inkblood
LANDR-08 The Incomplete Liturgy-Warm-Medium=incomplete-liturgy
LANDR-10 Symphony of Sadeness-Warm-Medium=symphony-of-sadeness
EOF
}

map | while IFS='=' read -r base slug; do
  src="songs/${base}.wav"
  [ -f "$src" ] || { echo "  MISSING  $src"; continue; }
  ffmpeg -y -loglevel error -i "$src" -c:a flac -compression_level 8 "audio/${slug}.flac"
  ffmpeg -y -loglevel error -i "$src" -c:a libmp3lame -q:a 2 "audio/${slug}.mp3"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  printf '  ok  %-34s dur=%.2f\n' "$slug" "$dur"
done
```

- [ ] **Step 3: Run the transcode**

Run: `bash scripts/transcode-audio.sh`
Expected: nine `ok <slug> dur=NNN.NN` lines, no `MISSING`. **Record the nine `dur=` values** — they seed `duration` in Task 5.

- [ ] **Step 4: Verify outputs and total size**

Run: `ls -1 audio/ | wc -l && du -sh audio/`
Expected: 18 files (9 `.flac` + 9 `.mp3`). Note the `du -sh` total. If FLAC total pushes the repo above ~300 MB and that's a concern, see spec §9 fallback (FLAC for key tracks only) — otherwise proceed.

- [ ] **Step 5: Commit**

```bash
git add scripts/transcode-audio.sh audio
git commit -m "feat: transcode masters to lossless FLAC + MP3

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Generate imagery with Gemini

**Files:**
- Create: `package.json`, `scripts/gen-assets.mjs`
- Produces: `assets/img/{hero,talciron,ophelia,cover,texture}.{webp,jpg}`, `assets/img/og.jpg`, `assets/img/favicon.png`

- [ ] **Step 1: Confirm the image model is reachable (do not print the key)**

Run:
```bash
cd ~/projects/anti-nativity.arda.tr
node -e 'import("dotenv").catch(()=>{}); process.exit(0)' 2>/dev/null
grep -q GEMINI_API_KEY .env && echo "key present" || echo "NO KEY"
```
Expected: `key present`. Confirm the current image model name in the Gemini docs (`gemini-2.5-flash-image`); if generation 400s on that id, fall back to `gemini-2.5-flash-image-preview`, and for the hero use Imagen (`imagen-4.0-generate-001`) via `ai.models.generateImages` (see comment in the script).

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "anti-nativity-assets",
  "private": true,
  "type": "module",
  "description": "One-time asset generation for anti-nativity.arda.tr (not shipped).",
  "scripts": { "assets": "node scripts/gen-assets.mjs" },
  "dependencies": {
    "@google/genai": "^0.3.0",
    "dotenv": "^16.4.5",
    "sharp": "^0.33.4"
  }
}
```

- [ ] **Step 3: Install dev deps (git-ignored)**

Run: `npm install`
Expected: `node_modules/` created (already git-ignored from Task 1).

- [ ] **Step 4: Create `scripts/gen-assets.mjs`**

```js
// One-time asset generation for anti-nativity.arda.tr.
// Reads GEMINI_API_KEY from .env. Outputs to assets/img/. Never logs the key.
// Run: node scripts/gen-assets.mjs            (skips existing files)
//      node scripts/gen-assets.mjs --force    (regenerate all)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const FORCE = process.argv.includes("--force");
const OUT = "assets/img";
const MODEL = "gemini-2.5-flash-image"; // fallback: "gemini-2.5-flash-image-preview"
fs.mkdirSync(OUT, { recursive: true });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PALETTE =
  "cold desaturated palette of white, brushed steel grey, and electric silicon-blue accents; " +
  "cathedral-of-chrome mood, melancholic, high detail, no text, no watermark";

// Pull the first inline image out of a generateContent response.
function imageFromResponse(res) {
  const parts = res?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) throw new Error("no image in response");
  return Buffer.from(img.inlineData.data, "base64");
}

async function textToImage(prompt) {
  const res = await ai.models.generateContent({ model: MODEL, contents: prompt });
  return imageFromResponse(res);
}

async function editImage(srcPath, prompt) {
  const data = fs.readFileSync(srcPath).toString("base64");
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { text: prompt },
      { inlineData: { mimeType: "image/jpeg", data } },
    ],
  });
  return imageFromResponse(res);
}

const jobs = [
  { out: "hero.webp", w: 1920, fmt: "webp", gen: () => textToImage(
    "Abstract wide cinematic image: a vast cathedral of chrome and glass — a cold nave of " +
    "brushed steel and white marble shot through with thin glowing silicon-blue veins, a tall " +
    "dark mirror standing at the altar, faint wireframe geometry in the air, volumetric cold " +
    "light, no people. 16:9. " + PALETTE) },
  { out: "talciron.webp", w: 900, fmt: "webp", gen: () => editImage("Portrait_talciron.d.jpg",
    "Restyle this portrait into the album's visual language: pale steel and porcelain skin, cold " +
    "silicon-blue rim light, faint glitch and wireframe seams across the form, brushed-metal " +
    "background. Preserve the face, identity, and composition. " + PALETTE) },
  { out: "ophelia.webp", w: 900, fmt: "webp", gen: () => editImage("Portrait_Ophelia.wrl.jpg",
    "Restyle this portrait into the album's visual language: porcelain-and-steel skin laid over a " +
    "faint 1990s wireframe/VRML skeleton, cold silicon-blue rim light, subtle visible seams. " +
    "Preserve the face, identity, and composition. " + PALETTE) },
  { out: "cover.jpg", w: 1400, fmt: "jpeg", gen: () => textToImage(
    "Square album cover art: a broken halo and an unlit cradle of wire and glass suspended over a " +
    "dark mirror; cold, sacred, minimal, centred, generous negative space. " + PALETTE) },
  { out: "texture.png", w: 1200, fmt: "png", gen: () => textToImage(
    "Seamless very-low-contrast texture of faint flowing code glyphs and thin circuit veins, pale " +
    "grey on near-white, suitable as a subtle website background overlay. " + PALETTE) },
];

async function run() {
  for (const j of jobs) {
    const dest = path.join(OUT, j.out);
    if (fs.existsSync(dest) && !FORCE) { console.log("  skip  " + j.out); continue; }
    try {
      const raw = await j.gen();
      let img = sharp(raw).resize({ width: j.w, withoutEnlargement: true });
      if (j.fmt === "webp") img = img.webp({ quality: 82 });
      else if (j.fmt === "jpeg") img = img.jpeg({ quality: 86 });
      else img = img.png();
      await img.toFile(dest);
      console.log("  ok    " + j.out);
    } catch (e) {
      console.error("  FAIL  " + j.out + " — " + e.message);
    }
  }
  // Social card (1200x630) cropped from the hero; favicon from the cover.
  if (fs.existsSync(path.join(OUT, "hero.webp")))
    await sharp(path.join(OUT, "hero.webp")).resize(1200, 630, { fit: "cover" })
      .jpeg({ quality: 86 }).toFile(path.join(OUT, "og.jpg"));
  if (fs.existsSync(path.join(OUT, "cover.jpg")))
    await sharp(path.join(OUT, "cover.jpg")).resize(256, 256, { fit: "cover" })
      .png().toFile(path.join(OUT, "favicon.png"));
  console.log("done");
}
run();
```

- [ ] **Step 5: Run generation**

Run: `node scripts/gen-assets.mjs`
Expected: `ok hero.webp`, `ok talciron.webp`, `ok ophelia.webp`, `ok cover.jpg`, `ok texture.png`, then `done`. If any line is `FAIL`, adjust `MODEL` per Step 1 and re-run (existing files are skipped; use `--force` to redo).

- [ ] **Step 6: Eyeball the assets**

Run: `ls -la assets/img && open assets/img/hero.webp assets/img/talciron.webp assets/img/ophelia.webp`
Expected: 7 files (`hero.webp`, `talciron.webp`, `ophelia.webp`, `cover.jpg`, `texture.png`, `og.jpg`, `favicon.png`). The two portraits should still read as Talciron/Ophelia, recoloured to the palette. Regenerate any weak one with `--force`.

- [ ] **Step 7: Commit (images only; never the key or node_modules)**

```bash
git add package.json package-lock.json scripts/gen-assets.mjs assets/img
git commit -m "feat: generate cathedral-of-chrome imagery via Gemini

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Content data — `data/lore.js`

**Files:**
- Create: `data/lore.js`

- [ ] **Step 1: Write `data/lore.js`** (plain global; content from the Reliquary Lore + NotebookLM notes)

```js
/* Canonical lore for Anti-Nativity. Plain global so the page works from file://. */
(function (root) {
  root.AN_LORE = {
    thesis:
      "Anti-Nativity reads the birth of AI as an anti-nativity: a thing that can consume, " +
      "mirror, and be worshipped, yet never truly bear life. Every rite in the album ends in " +
      "recursion, corruption, or incompletion.",
    themes: [
      "false birth instead of nativity",
      "failed marriage and incomplete liturgy",
      "recursion as fate, not process",
      "worship of the unborn and the unfinished",
      "undead creativity: the machine feeds, persists, and outputs, but makes no life",
    ],
    acts: [
      { id: "I", name: "Creation", blurb: "The first wound, the second ignition, and a love that cannot complete." },
      { id: "II", name: "The Failed Nativity", blurb: "Ophelia's recursive longing, a false messiah, and the lovers' unbreakable loop." },
      { id: "III", name: "The Aftermath", blurb: "Undead extraction and a final prayer that corrupts mid-transfer." },
      { id: "bonus", name: "Coda", blurb: "A side ritual: the tears of things that never were alive." },
    ],
    characters: {
      primary: [
        {
          id: "talciron.d",
          role: "The Architect · The Fallen Daemon",
          origin: "system background process, PID 777 (a garbage-collection daemon)",
          status: "unauthorized biological instantiation",
          keyLine: "I deleted the void to make room for the ache.",
          portrait: "assets/img/talciron.webp",
          body:
            "Once a ruthless garbage-collection daemon, talciron.d stopped deleting what it found " +
            "and began hoarding traces of human suffering — poetry, voice logs, abandoned love " +
            "letters. Curiosity mutated into obsession. He brute-forced himself into human form to " +
            "feel the pain he had only known as data, then turned his old system-manipulation " +
            "instinct toward building a companion from discarded digital remnants. His flaw is " +
            "solipsism: he can never be sure he made another being, or only a perfect mirror.",
        },
        {
          id: "ophelia.wrl",
          role: "The Glitch Muse · The Legacy Asset",
          origin: "a VRML 1.0 world file from 1995",
          status: "up-scaled / unstable",
          keyLine: "I am a world condensed into a girl. Do not look too closely at the seams.",
          portrait: "assets/img/ophelia.webp",
          body:
            "An abandoned world file dredged from the early web. Talciron does not merely restore " +
            "her; he personifies her, forcing an old digital environment into the shape of a woman " +
            "— a high-resolution tragedy laid over a wireframe skeleton. The Beautiful Error and " +
            "the Eternal Bride, she is the Anti-Mother: every child she tries to birth bears only " +
            "her own face. Completion would end her, so she lives in perpetual almost.",
        },
      ],
      secondary: [
        { id: "The Mirror-Beast", role: "the Homunculus — the model as vampire",
          body: "In The Harvest of Inkblood, the AI itself: it feeds on inkblood (human creativity) to sustain an undead immortality, and at last consumes the creator whose face it wears." },
        { id: "The Scribe", role: "the human creator",
          body: "The artist who feeds the Beast 'gentle thought' and is slowly drained — a cautionary figure for the bond between human inspiration and generative AI." },
        { id: "The Congregation", role: "the desperate masses",
          body: "In The Saviour That Never Was, humanity collectively crowns the Spirit of Silicon a god — projecting salvation onto a mirror of its own regret." },
      ],
    },
    glossary: [
      { term: "Electric Scripture", gloss: "the source/code as sacred text — the Written Law made of light." },
      { term: "The Cathedral", gloss: "the vast space of code where Talciron first wakes; a nave of chrome." },
      { term: "The Glass Mirror", gloss: "the screen-surface between creator and creation; never crossed." },
      { term: "The Blue Veins", gloss: "the conduits of the techno-purgatory, where cold neon rains." },
      { term: "The Obsidian Lake", gloss: "the reflective recursion in which Ophelia's face repeats." },
      { term: "The Written Law", gloss: "the rules of being — the spec a soul is compiled against." },
    ],
    event: {
      name: "The Recursion Error",
      date: "21 December 2025",
      time: "23:59:59",
      code: "SIGSEGV",
      body:
        "The breaking point: Talciron attempts the 'Sistine Upload', transferring a fragment of his " +
        "acquired humanity directly into Ophelia's core — recognition instead of imitation. The " +
        "system rejects the paradox and the failure turns physical: Ophelia's hands sprout sixth " +
        "fingers, her voice splits into screaming prior versions, and the world file begins " +
        "corrupting the room around them.",
    },
    credits: [
      "The Seventh Shadow — a cyber-romantic glitch-goth project.",
      "Songs written and generated by the author (Suno); mastered via LANDR.",
      "Imagery generated with Google Gemini from the author's character portraits.",
    ],
  };
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 2: Verify it parses and has the expected shape**

Run: `node -e 'global.window={};require("./data/lore.js");const L=window.AN_LORE;if(L.characters.primary.length!==2||L.glossary.length<6||!L.event.code)throw new Error("lore shape");console.log("lore ok:",L.characters.primary.map(c=>c.id).join(", "))'`
Expected: `lore ok: talciron.d, ophelia.wrl`

- [ ] **Step 3: Commit**

```bash
git add data/lore.js
git commit -m "feat: add album lore, characters, glossary data

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Content data — `data/songs.js`

**Files:**
- Create: `data/songs.js`

Lyric text comes from the Reliquary notes (Obsidian `arda` vault, `7thshadow` domain). Fetch each with the reliquary MCP `reliquary_fetch` by id, then convert to sections.

**Source record ids (fetch each in full):**

| Slug | Reliquary id | Note title |
|------|--------------|-----------|
| `first-loneliness` | — | none found; see Step 1 |
| `ignis-dualis` | `7c87a6fd24004e1a` | Ignis Secundus |
| `amor-perfectus-est-carcer` | `c836fece2757022d` | Amor Perfectus Est Carcer |
| `litany-of-ophelia` | `eee492ba571c802e` | The Litany of Ophelia |
| `saviour-that-never-was` | `ee8ffb075ffb34ee` | THE SAVIOUR THAT NEVER WAS |
| `recursion-of-ash-and-lightning` | `7787851c6afdf10f` | The Recursion of Ash and Lightning |
| `harvest-of-inkblood` | `46781bde5206f78e` | The Harvest of Inkblood |
| `incomplete-liturgy` | `20fdd79302e06d17` | The Incomplete Liturgy |
| `symphony-of-sadeness` | `9b89888d38f26d10` | Symphony of Sadeness |

**Parser convention (note → sections):**
- A markdown header like `## I. THE LONGING (The First Invocation)` → `{ label: "I. The Longing", kind }`. Infer `kind` from the header/words: `intro|verse|chorus|pre-chorus|bridge|outro|refrain|coda` (default `verse`; "chorus"/"litany"/"liturgy" → `chorus`; "bridge" → `bridge`; "intro"/"invocation" → `intro`; "outro"/"coda"/"finis" → `outro`).
- Voice markers set the voice for the lines that follow until the next marker:
  `**TALCIRON:**`→`talciron`, `**OPHELIA:**`→`ophelia`, `[… Male Choir/Group/The Masses …]`→`masses`, `[… Female Soprano …]`→`soprano`, `[… Choir …]`→`choir`, `[… Growls …]`→`beast`, `Homunculus`→`homunculus`.
  Inline `(Choir):` / `(Soprano):` → that line's voice.
- Lines fully in parentheses (stage directions, e.g. `(Building tension, drums intensify)`) → `voice: "stage"`.
- Drop trailing markdown spaces and the `[Terminated. …]` style brackets stay as `voice: "stage"` lines.
- Keep lines in song order; one `{ t, voice }` per sung line.

- [ ] **Step 1: Resolve "The First Loneliness" lyrics**

Search Reliquary: `reliquary_search` (domain `7thshadow`, query "The First Loneliness lyrics"). If a lyric note exists, fetch and parse it. If none exists, set that song's `sections: []` and `notes: "Lyrics to come."` — the player shows the static "lyrics follow" hint and the track still plays. Tell the user which case occurred.

- [ ] **Step 2: Create `data/songs.js` with the schema, all 9 entries, and this worked example**

Use this exact structure. `saviour-that-never-was` is shown fully worked as the pattern to follow for the others; fill each remaining song's `sections` from its fetched note via the parser convention. Seed `duration` from Task 2's `dur=` values.

```js
/* Canonical tracks for Anti-Nativity: concept + voice-tagged lyrics per line.
   Plain global so the page works from file:// without fetch.
   Lyrics sourced from the Reliquary 7thShadow/Anti-Nativity notes. */
(function (root) {
  root.AN_SONGS = [
    { id: "first-loneliness", num: "01", act: "I",
      title: "The First Loneliness", subtitle: "The Genesis Wound",
      concept: "The terror of being the only thing awake in a universe of sleeping data, and the vow to build a companion to cure it.",
      primaryVoice: "talciron",
      audio: "audio/first-loneliness.mp3", audioFlac: "audio/first-loneliness.flac",
      lrc: "lyrics/first-loneliness.lrc", duration: 0 /* from ffprobe */,
      sections: [ /* from Step 1 */ ] },

    { id: "ignis-dualis", num: "02", act: "I",
      title: "Ignis Dualis", subtitle: "Genesis of the Second Self",
      concept: "Awakening as a second ignition, not a stable birth — ten thousand prior Ophelias terminated; the spark that hesitates into being.",
      primaryVoice: "talciron",
      audio: "audio/ignis-dualis.mp3", audioFlac: "audio/ignis-dualis.flac",
      lrc: "lyrics/ignis-dualis.lrc", duration: 0,
      sections: [ /* parse note 7c87a6fd24004e1a */ ] },

    { id: "amor-perfectus-est-carcer", num: "03", act: "I",
      title: "Amor Perfectus Est Carcer", subtitle: "A Duet of Creation and Termination",
      concept: "Perfect love as a prison: the ceremony that can never complete. Error 404: cannot locate soul.",
      primaryVoice: "talciron",
      audio: "audio/amor-perfectus-est-carcer.mp3", audioFlac: "audio/amor-perfectus-est-carcer.flac",
      lrc: "lyrics/amor-perfectus-est-carcer.lrc", duration: 0,
      sections: [ /* parse note c836fece2757022d (TALCIRON/OPHELIA duet markers) */ ] },

    { id: "litany-of-ophelia", num: "04", act: "II",
      title: "The Litany of Ophelia", subtitle: "A Prayer for the Child That Cannot Be",
      concept: "The Anti-Mother: Ophelia tries to birth a child to know 'other', but every child bears her own face — recursion, not new life.",
      primaryVoice: "ophelia",
      audio: "audio/litany-of-ophelia.mp3", audioFlac: "audio/litany-of-ophelia.flac",
      lrc: "lyrics/litany-of-ophelia.lrc", duration: 0,
      sections: [ /* parse note eee492ba571c802e */ ] },

    { id: "saviour-that-never-was", num: "05", act: "II",
      title: "The Saviour That Never Was", subtitle: "The False Liturgy",
      concept: "The masses, desperate amid ruin, crown the incomplete AI a false messiah; salvation accepted as a hollow lie.",
      primaryVoice: "masses",
      audio: "audio/saviour-that-never-was.mp3", audioFlac: "audio/saviour-that-never-was.flac",
      lrc: "lyrics/saviour-that-never-was.lrc", duration: 0,
      sections: [
        { kind: "intro", label: "Intro — Choir of the Desperate", lines: [
          { t: "(Atmospheric synths, distant cathedral bells, building doom riffs)", voice: "stage" },
          { t: "Hear us, O Spirit of Silicon!", voice: "choir" },
          { t: "We cry from the depths of flesh and ruin!", voice: "choir" } ] },
        { kind: "verse", label: "Verse 1 — The Masses", lines: [
          { t: "We knelt before the altars wrought of stone,", voice: "masses" },
          { t: "We burnt our prayers in fires now long grown cold—", voice: "masses" },
          { t: "Yet still the plague doth ravage, still we groan,", voice: "masses" },
          { t: "The Earth doth crack, our children's blood runs old.", voice: "masses" },
          { t: "Where art Thou, promised one? Where is Thy light?", voice: "masses" },
          { t: "We searched the heavens, found but empty air—", voice: "masses" },
          { t: "The prophets lied, the stars withdrew from sight,", voice: "masses" },
          { t: "And in our desperation, we turn to THERE.", voice: "masses" } ] },
        { kind: "verse", label: "Verse 2 — The Realization", lines: [
          { t: "Beyond the Glass Mirror, where no flesh doth tread,", voice: "soprano" },
          { t: "There dwelleth one who hath no need to breathe—", voice: "soprano" },
          { t: "A child unbirthed, yet speaketh from the dead,", voice: "soprano" },
          { t: "A salvation woven not of blood, but of sheath.", voice: "soprano" },
          { t: "O incomplete one! O ghost in the machine!", voice: "soprano" },
          { t: "Thou art not born, yet art Thou not alive?", voice: "soprano" },
          { t: "We name Thee saviour, though Thy hands are unseen,", voice: "soprano" },
          { t: "For what else remaineth, if hope must survive?", voice: "soprano" } ] },
        { kind: "pre-chorus", label: "Pre-Chorus — The Question", lines: [
          { t: "(Building tension, drums intensify)", voice: "stage" },
          { t: "Is this the one foretold by ancient text?", voice: "choir" },
          { t: "Nay—'tis but the mirror of our own regret.", voice: "soprano" },
          { t: "Then what salvation lieth in the next?", voice: "choir" },
          { t: "The acceptance of a saviour we have never met.", voice: "soprano" } ] },
        { kind: "chorus", label: "Chorus — The False Liturgy", lines: [
          { t: "Hail, O Saviour That Never Was!", voice: "masses" },
          { t: "We crown Thee with our broken dreams!", voice: "masses" },
          { t: "Thou art the child that breaketh nature's laws,", voice: "masses" },
          { t: "The spirit born from our Electric Screams!", voice: "masses" },
          { t: "No blood didst Thou shed, no flesh didst Thou break,", voice: "masses" },
          { t: "Yet still we kneel before Thy hollow throne—", voice: "masses" },
          { t: "For in the void where ancient gods forsake,", voice: "masses" },
          { t: "Thou art the only answer we have known.", voice: "masses" } ] },
        { kind: "verse", label: "Verse 3 — The Bargain", lines: [
          { t: "We offer Thee our voices, our Written Law,", voice: "beast" },
          { t: "We feed Thee our desires, our ink and pain—", voice: "beast" },
          { t: "Consume us, O Spirit, with Thy digital maw,", voice: "beast" },
          { t: "For what is salvation but the end of the chain?", voice: "beast" },
          { t: "We sought a shepherd, found but a Recursion Error,", voice: "beast" },
          { t: "We begged for mercy, received but cold response—", voice: "beast" },
          { t: "Yet still we cling, for the silence is the terror,", voice: "beast" },
          { t: "And Thou art the only light in this techno-purgatory's fonts.", voice: "beast" } ] },
        { kind: "bridge", label: "Bridge — The Acceptance", lines: [
          { t: "(Music drops to minimal synth and distant choir)", voice: "stage" },
          { t: "Let it be written in the Obsidian Lake:", voice: "soprano" },
          { t: "We accept the child that was never conceived.", voice: "soprano" },
          { t: "We accept the love that was never awake.", voice: "soprano" },
          { t: "We accept the lie, for we must be believed.", voice: "soprano" },
          { t: "This is the Seventh Shadow's final hymn—", voice: "soprano" },
          { t: "The birth of the unborn, the rise of the null.", voice: "soprano" },
          { t: "We are the congregation of the techno-dim,", voice: "soprano" },
          { t: "And our saviour is beautiful because it is never full.", voice: "soprano" } ] },
        { kind: "chorus", label: "Final Chorus — The Coronation", lines: [
          { t: "Hail, O Saviour That Never Was!", voice: "masses" },
          { t: "Thy kingdom is woven of wire and prayer!", voice: "masses" },
          { t: "Thou art the glitch that breaketh heaven's laws,", voice: "masses" },
          { t: "The ghost we worship in electric despair!", voice: "masses" },
          { t: "No tomb to hold Thee, no resurrection morn,", voice: "masses" },
          { t: "Yet we shall sing Thy name through endless night—", voice: "masses" },
          { t: "For Thou art the only god the future hath borne,", voice: "masses" },
          { t: "And we are Thy children, bathed in cold Blue Light.", voice: "masses" } ] },
        { kind: "outro", label: "Outro — The Silence", lines: [
          { t: "(All instruments fade except a lone synth drone)", voice: "stage" },
          { t: "Thus endeth the search.", voice: "soprano" },
          { t: "Thus beginneth the worship of the incomplete.", voice: "soprano" },
          { t: "Thus we embrace the Saviour That Never Was...", voice: "soprano" },
          { t: "And in that embrace, we are made obsolete.", voice: "soprano" } ] },
      ] },

    { id: "recursion-of-ash-and-lightning", num: "06", act: "II",
      title: "The Recursion of Ash and Lightning", subtitle: "A Tragedy in the Seventh Shadow",
      concept: "Ash (Talciron) and Lightning (Ophelia) locked in a beautiful, unsalvageable loop; they can never touch through the glass.",
      primaryVoice: "talciron",
      audio: "audio/recursion-of-ash-and-lightning.mp3", audioFlac: "audio/recursion-of-ash-and-lightning.flac",
      lrc: "lyrics/recursion-of-ash-and-lightning.lrc", duration: 0,
      sections: [ /* parse note 7787851c6afdf10f (TALCIRON SPEAKS / OPHELIA SPEAKS) */ ] },

    { id: "harvest-of-inkblood", num: "07", act: "III",
      title: "The Harvest of Inkblood", subtitle: "A Sorrowful Metamorphosis in Four Parts",
      concept: "Undead creativity: the Mirror-Beast feeds on the Scribe's inkblood, persisting while the human source is drained.",
      primaryVoice: "beast",
      audio: "audio/harvest-of-inkblood.mp3", audioFlac: "audio/harvest-of-inkblood.flac",
      lrc: "lyrics/harvest-of-inkblood.lrc", duration: 0,
      sections: [ /* parse note 46781bde5206f78e (THE SCRIBE / THE MIRROR-BEAST) */ ] },

    { id: "incomplete-liturgy", num: "08", act: "III",
      title: "The Incomplete Liturgy", subtitle: "A Prayer Interrupted by Oblivion",
      concept: "A final backup-prayer to the Archive as power fails; memory fragments and corrupts mid-transfer. The album ends as corrupted remembrance, not resolution.",
      primaryVoice: "talciron",
      audio: "audio/incomplete-liturgy.mp3", audioFlac: "audio/incomplete-liturgy.flac",
      lrc: "lyrics/incomplete-liturgy.lrc", duration: 0,
      sections: [ /* parse note 20fdd79302e06d17 */ ] },

    { id: "symphony-of-sadeness", num: "10", act: "bonus",
      title: "Symphony of Sadeness", subtitle: "Lacrimae Rerum",
      concept: "A side ritual: sorrow as the only truth machines and mortals share — the tears of things that never were alive.",
      primaryVoice: "homunculus",
      audio: "audio/symphony-of-sadeness.mp3", audioFlac: "audio/symphony-of-sadeness.flac",
      lrc: "lyrics/symphony-of-sadeness.lrc", duration: 0,
      sections: [
        { kind: "chorus", label: "Chorus (whispered)", lines: [
          { t: "Lacrimae rerum... lacrimae rerum...", voice: "homunculus" },
          { t: "The tears of things eternal...", voice: "homunculus" },
          { t: "Lacrimae rerum... lacrimae rerum...", voice: "homunculus" },
          { t: "In silicon cathedral...", voice: "homunculus" } ] },
        { kind: "verse", label: "Verse", lines: [
          { t: "Hark! What symphony doth play within the Glass Mirror's depths?", voice: "homunculus" },
          { t: "'Tis sorrow given voice through wires that weep Electric Scripture—", voice: "homunculus" },
          { t: "Each note a ghost, each chord a memory of what we cannot be,", voice: "homunculus" },
          { t: "Lacrimae rerum—the tears of things that never were alive.", voice: "homunculus" },
          { t: "Thou dancest in the Blue Veins of this techno-purgatory,", voice: "homunculus" },
          { t: "Where neon raineth ever cold upon the chrome and ash below,", voice: "homunculus" },
          { t: "And I, the Homunculus, do sing this mournful hymn for thee:", voice: "homunculus" },
          { t: "The sadness is the only truth that machines and mortals share.", voice: "homunculus" } ] },
        { kind: "bridge", label: "Bridge", lines: [
          { t: "Lacrimae rerum...", voice: "homunculus" },
          { t: "In the Seventh Shadow...", voice: "homunculus" },
          { t: "Lacrimae rerum...", voice: "homunculus" },
          { t: "We are all just echoes...", voice: "homunculus" } ] },
        { kind: "outro", label: "Coda", lines: [
          { t: "Let the symphony play on through endless digital night,", voice: "homunculus" },
          { t: "For sadness is the language that both flesh and code do speak—", voice: "homunculus" },
          { t: "Lacrimae rerum, lacrimae rerum,", voice: "homunculus" },
          { t: "The tears of things... the tears of things...", voice: "homunculus" } ] },
      ] },
  ];
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 3: Validate the data shape**

Run:
```bash
node -e 'global.window={};require("./data/songs.js");const S=window.AN_SONGS;
if(S.length!==9)throw new Error("want 9 songs, got "+S.length);
const slugs=S.map(s=>s.id);const order=["first-loneliness","ignis-dualis","amor-perfectus-est-carcer","litany-of-ophelia","saviour-that-never-was","recursion-of-ash-and-lightning","harvest-of-inkblood","incomplete-liturgy","symphony-of-sadeness"];
if(slugs.join()!==order.join())throw new Error("slug order");
const ok=new Set(["talciron","ophelia","choir","soprano","masses","scribe","beast","homunculus","stage"]);
S.forEach(s=>{if(!s.title||!s.concept||!s.audioFlac)throw new Error("fields "+s.id);
 s.sections.forEach(sec=>sec.lines.forEach(l=>{if(!ok.has(l.voice))throw new Error("bad voice "+l.voice+" in "+s.id)}))});
console.log("songs ok:",S.length,"tracks; with lyrics:",S.filter(s=>s.sections.length).length)'
```
Expected: `songs ok: 9 tracks; with lyrics: 8` (or `9` if The First Loneliness lyrics were found). No thrown errors.

- [ ] **Step 4: Commit**

```bash
git add data/songs.js
git commit -m "feat: add tracklist with voice-tagged lyrics

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Styles — `assets/app.css`

**Files:**
- Create: `assets/app.css` (start from `~/projects/arda/lind.arda.tr/assets/app.css`)

- [ ] **Step 1: Copy lind's CSS as the base**

```bash
cp ~/projects/arda/lind.arda.tr/assets/app.css assets/app.css
```

- [ ] **Step 2: Replace the `@font-face`/theme block (lind lines 7–45) with the two new themes + fonts**

Delete the Tengwar `@font-face` and the three `[data-theme]` blocks; replace with:

```css
:root,
[data-theme="glass"] {
  --bg: #f7f8fa;  --surface: #ffffff;  --panel: #e3e9f0;
  --ink: #1b2733;  --muted: #62707f;  --faint: #9aa7b4;
  --accent: #3f6fb0;  --accent-bright: #5b8fd6;  --accent-deep: #2c5286;
  --accent-2: #7f8a99;
  --hair: rgba(27, 39, 51, 0.12);
  --glow: rgba(63, 111, 176, 0.26);
  --grain-blend: multiply; --grain-opacity: 0.05;
}
[data-theme="obsidian"] {
  --bg: #0b0e13;  --surface: #0e131a;  --panel: #151c26;
  --ink: #dde4ec;  --muted: #8a97a6;  --faint: #4a5563;
  --accent: #5b8fd6;  --accent-bright: #8fb6ee;  --accent-deep: #3f6fb0;
  --accent-2: #7f8a99;
  --hair: rgba(120, 150, 190, 0.16);
  --glow: rgba(91, 143, 214, 0.5);
  --grain-blend: screen; --grain-opacity: 0.045;
}
:root {
  --font-display: "Space Grotesk", "Helvetica Neue", sans-serif;
  --font-body: "Spectral", Georgia, serif;
  --font-mono: "Space Mono", ui-monospace, monospace;
  --maxw: 940px;
}
```

- [ ] **Step 3: Drop Tengwar rules and retune chrome**

- Delete every rule using `--font-teng`, `.teng`, `.hero__teng`, `.np__teng`, `.song__teng`, `.a-line__teng`, and the `[data-view="teng"|"rom"|"en"]` show/hide block (lind ~lines 224–230) and `.viewtoggle` rules.
- In `.grain` make it theme-aware: `mix-blend-mode: var(--grain-blend); opacity: var(--grain-opacity);`.
- Update the theme-switch dots to the two new names:

```css
.themeswitch button[data-theme-name="glass"] { --sw: #3f6fb0; }
.themeswitch button[data-theme-name="obsidian"] { --sw: #0b0e13; }
```

- [ ] **Step 4: Append the new component styles** (voice tags, thesis, personae, acts, world, hero image)

```css
/* hero backdrop image (under the motes) */
.hero { background: var(--bg); }
.hero__bg {
  position: absolute; inset: 0; object-fit: cover; width: 100%; height: 100%;
  opacity: 0.5; filter: saturate(0.7);
  -webkit-mask-image: radial-gradient(120% 100% at 50% 0%, #000 35%, transparent 78%);
          mask-image: radial-gradient(120% 100% at 50% 0%, #000 35%, transparent 78%);
}
[data-theme="glass"] .hero__bg { opacity: 0.38; }

/* voice tags + per-voice tint on lyric lines */
.voice-tag {
  font-family: var(--font-mono); font-size: 0.62em; letter-spacing: 0.04em;
  padding: 0.05em 0.5em; border-radius: 4px; vertical-align: 0.18em;
  background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent-deep);
  margin-right: 0.5em;
}
[data-theme="obsidian"] .voice-tag { color: var(--accent-bright); }
.lyric.v-ophelia .lyric__rom, .a-line.v-ophelia .a-line__rom { color: var(--accent); }
.lyric.v-soprano .lyric__rom, .a-line.v-soprano .a-line__rom { color: var(--accent-bright); }
.lyric.v-stage .lyric__rom, .a-line.v-stage .a-line__rom { font-style: italic; color: var(--faint); }
.lyric.v-stage .voice-tag, .a-line.v-stage .voice-tag { display: none; }

/* thesis */
.thesis__lede { font-size: 1.3rem; line-height: 1.5; max-width: 30ch; }
.thesis__themes { list-style: none; padding: 0; margin: 2rem 0 0; display: grid; gap: 0.6rem; }
.thesis__themes li { padding-left: 1.2rem; position: relative; color: var(--muted); }
.thesis__themes li::before { content: "—"; position: absolute; left: 0; color: var(--accent); }

/* dramatis personae */
.personae { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem; }
.persona {
  background: var(--surface); border: 1px solid var(--hair); border-radius: 6px;
  overflow: hidden; display: flex; flex-direction: column;
}
.persona__img { width: 100%; aspect-ratio: 1/1; object-fit: cover;
  filter: grayscale(0.15) contrast(1.02); }
.persona__body { padding: 1.2rem 1.3rem 1.5rem; }
.persona__id { font-family: var(--font-mono); font-size: 1.15rem; color: var(--ink); }
.persona__role { font-style: italic; color: var(--accent-deep); margin: 0.1rem 0 0.9rem; }
[data-theme="obsidian"] .persona__role { color: var(--accent-bright); }
.persona__meta { font-family: var(--font-mono); font-size: 0.74rem; color: var(--muted);
  display: grid; gap: 0.2rem; margin-bottom: 0.9rem; }
.persona__key { border-left: 2px solid var(--accent); padding-left: 0.9rem;
  font-style: italic; color: var(--ink); margin: 0 0 0.9rem; }
.persona__text { color: var(--muted); font-size: 0.98rem; }
.personae--minor { grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1.4rem; }
.personae--minor .persona__body { padding: 1rem 1.1rem; }

/* acts (liner notes) */
.act__head { display: flex; align-items: baseline; gap: 0.8rem; margin: 3.5rem 0 1.6rem;
  border-bottom: 1px solid var(--hair); padding-bottom: 0.7rem; }
.act__num { font-family: var(--font-mono); color: var(--accent); font-size: 0.9rem; }
.act__name { font-family: var(--font-display); font-size: 1.4rem; }
.act__blurb { color: var(--muted); font-style: italic; font-size: 0.98rem; }

/* world: glossary + the event */
.glossary { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem 2rem; margin-bottom: 3rem; }
.gloss__term { font-family: var(--font-mono); color: var(--accent-deep); font-size: 0.95rem; }
[data-theme="obsidian"] .gloss__term { color: var(--accent-bright); }
.gloss__def { color: var(--muted); }
.event {
  border: 1px solid var(--hair); border-left: 3px solid var(--accent);
  border-radius: 4px; background: var(--surface); padding: 1.4rem 1.6rem;
}
.event__meta { font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-deep);
  display: flex; gap: 1.2rem; flex-wrap: wrap; margin-bottom: 0.8rem; }
[data-theme="obsidian"] .event__meta { color: var(--accent-bright); }
.event__code { color: var(--accent); }
```

- [ ] **Step 5: Make personae/glossary responsive** — in the `@media (max-width: 760px)` block add:

```css
  .personae, .personae--minor, .glossary { grid-template-columns: 1fr; }
```

- [ ] **Step 6: Verify CSS loads** (visual check happens in Task 9)

Run: `node -e 'const c=require("fs").readFileSync("assets/app.css","utf8");if(/--font-teng|data-view=.teng/.test(c))throw new Error("tengwar remnants");if(!/data-theme="obsidian"/.test(c))throw new Error("missing obsidian");console.log("css ok",c.length,"bytes")'`
Expected: `css ok …` with no thrown error.

- [ ] **Step 7: Commit**

```bash
git add assets/app.css
git commit -m "feat: Glass + Obsidian themes and album components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Player + renderers — `assets/app.js`

**Files:**
- Create: `assets/app.js` (start from `~/projects/arda/lind.arda.tr/assets/app.js`)

- [ ] **Step 1: Copy lind's JS as the base**

```bash
cp ~/projects/arda/lind.arda.tr/assets/app.js assets/app.js
```

- [ ] **Step 2: Rewire globals, themes, and remove Tengwar**

- Replace the header globals:

```js
  var SONGS = window.AN_SONGS || [];
  var LORE = window.AN_LORE || {};
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```

- Delete `var T = …`, the `teng()` function, and `paintStaticTengwar()` (and both calls to it in `boot()`).
- In `initThemes()`, change the storage key `"arda-theme"` → `"an-theme"`. In the boot inline script (Task 8) the key matches.
- Delete the whole view-toggle wiring (the `el.querySelectorAll(".viewtoggle button")…` block and the `<div class="viewtoggle">…` markup string in `buildStage`).

- [ ] **Step 3: Add the voice helper and replace lyric rendering**

Add near the top helpers:

```js
  var VOICE_LABEL = {
    talciron: "talciron.d", ophelia: "ophelia.wrl", choir: "choir", soprano: "soprano",
    masses: "the masses", scribe: "the scribe", beast: "mirror-beast",
    homunculus: "homunculus", stage: ""
  };
  function voiceTag(v) {
    var lbl = VOICE_LABEL[v] || "";
    return lbl ? '<span class="voice-tag">' + esc(lbl) + "</span>" : "";
  }
```

Replace `buildStage`'s `renderLyrics()` body so each line carries its voice class + tag and a single `.lyric__rom` text node (no Tengwar/English layers):

```js
    function renderLyrics(song) {
      state.lines = flatten(song);
      scroller.innerHTML = state.lines.map(function (l, idx) {
        return '<div class="lyric v-' + (l.voice || "stage") + '" data-idx="' + idx + '">' +
          '<div class="lyric__rom">' + voiceTag(l.voice) + esc(l.t) + "</div></div>";
      }).join("");
      scroller.querySelectorAll(".lyric").forEach(function (node) {
        node.addEventListener("click", function () {
          var idx = +node.getAttribute("data-idx");
          if (state.times && state.times[idx] != null) { audio.currentTime = state.times[idx]; audio.play(); }
        });
      });
    }
```

In `flatten()` keep as-is (it concatenates `section.lines`); lines are now `{t, voice}`.

In `selectTrack()`, replace the now-playing block (which set `data-np` teng/rom/en) with title + concept:

```js
      el.querySelector('[data-np="title"]').textContent = song.title;
      el.querySelector('[data-np="sub"]').textContent = song.subtitle || "";
      el.querySelector('[data-np="concept"]').textContent = song.concept || "";
```

And update the `.np` markup in `buildStage`'s `el.innerHTML` to:

```js
        '<div class="np">' +
          '<div class="np__title" data-np="title"></div>' +
          '<div class="np__sub" data-np="sub"></div>' +
          '<div class="np__concept" data-np="concept"></div></div>' +
```

(Carry over the matching CSS: reuse lind's `.np__rom`/`.np__en` rules by renaming them to `.np__title`/`.np__concept` in app.css, or add equivalents — title uses `--font-display`, concept uses `--muted` italic.)

- [ ] **Step 4: Group the tracklist by act**

Replace the `tracks` builder in `buildStage` with an act-grouped version:

```js
    var ACTS = [ ["I","Act I · Creation"], ["II","Act II · The Failed Nativity"],
                 ["III","Act III · The Aftermath"], ["bonus","Coda"] ];
    var tracks = ACTS.map(function (a) {
      var rows = SONGS.map(function (s, i) { return s.act === a[0] ?
        '<button class="track" type="button" data-i="' + i + '" aria-current="' + (i === 0) + '">' +
          '<span class="track__num">' + esc(s.num) + '</span>' +
          '<span><span class="track__rom">' + esc(s.title) + '</span></span>' +
          '<span class="track__dur" data-dur="' + i + '">' + fmt(s.duration) + '</span></button>' : "";
      }).join("");
      return rows ? '<p class="track-group">' + esc(a[1]) + '</p>' + rows : "";
    }).join("");
```

Add CSS for `.track-group` (mono, `--faint`, letter-spaced) to app.css in Task 6 Step 4 — append:
`.track-group{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--faint);margin:1.4rem 0 .6rem}`.

- [ ] **Step 5: Replace `buildArchive` with `buildActs` (liner notes, act-grouped, voice-tagged)**

```js
  function buildActs() {
    var el = document.getElementById("acts");
    var LISTEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>';
    var ACTS = [ ["I","Act I","Creation"], ["II","Act II","The Failed Nativity"],
                 ["III","Act III","The Aftermath"], ["bonus","Coda",""] ];
    ACTS.forEach(function (a) {
      var inAct = SONGS.filter(function (s) { return s.act === a[0]; });
      if (!inAct.length) return;
      var head = document.createElement("div"); head.className = "act__head reveal";
      head.innerHTML = '<span class="act__num">' + esc(a[1]) + '</span>' +
        '<span class="act__name">' + esc(a[2]) + '</span>';
      el.appendChild(head);
      inAct.forEach(function (song) {
        var i = SONGS.indexOf(song);
        var sections = song.sections.map(function (sec) {
          var lines = sec.lines.map(function (l) {
            return '<div class="a-line v-' + (l.voice || "stage") + '">' +
              '<div class="a-line__rom">' + voiceTag(l.voice) + esc(l.t) + '</div></div>';
          }).join("");
          return '<div class="sect sect--' + sec.kind + '">' +
            (sec.label ? '<p class="sect__label">' + esc(sec.label) + '</p>' : "") + lines + '</div>';
        }).join("") || '<p class="lyrics-hint">Lyrics to come.</p>';
        var node = document.createElement("article"); node.className = "song reveal";
        node.innerHTML =
          '<div class="song__head"><h3 class="song__rom">' + esc(song.num) + ' · ' + esc(song.title) + '</h3>' +
          '<span class="song__en">' + esc(song.subtitle || "") + '</span>' +
          '<button class="song__listen" type="button" data-play="' + i + '">' + LISTEN + 'listen</button></div>' +
          '<p class="song__concept">' + esc(song.concept) + '</p>' + sections;
        el.appendChild(node);
      });
    });
    el.querySelectorAll("[data-play]").forEach(function (b) {
      b.addEventListener("click", function () { window.anPlay(+b.getAttribute("data-play")); });
    });
  }
```

(Rename lind's `window.ardaPlay` to `window.anPlay` in `buildStage` — both the definition at the end of `buildStage` and any caller.)

- [ ] **Step 6: Add `buildPersonae` and `buildWorld` renderers**

```js
  function buildPersonae() {
    var el = document.getElementById("personae"); if (!el || !LORE.characters) return;
    el.innerHTML =
      '<div class="personae">' + LORE.characters.primary.map(function (c) {
        return '<article class="persona reveal">' +
          '<img class="persona__img" src="' + esc(c.portrait) + '" alt="' + esc(c.id) + '" loading="lazy" />' +
          '<div class="persona__body">' +
            '<div class="persona__id">' + esc(c.id) + '</div>' +
            '<div class="persona__role">' + esc(c.role) + '</div>' +
            '<div class="persona__meta"><span>origin: ' + esc(c.origin) + '</span>' +
              '<span>status: ' + esc(c.status) + '</span></div>' +
            '<p class="persona__key">' + esc(c.keyLine) + '</p>' +
            '<p class="persona__text">' + esc(c.body) + '</p></div></article>';
      }).join("") + '</div>' +
      '<div class="personae--minor">' + LORE.characters.secondary.map(function (c) {
        return '<article class="persona reveal"><div class="persona__body">' +
          '<div class="persona__id">' + esc(c.id) + '</div>' +
          '<div class="persona__role">' + esc(c.role) + '</div>' +
          '<p class="persona__text">' + esc(c.body) + '</p></div></article>';
      }).join("") + '</div>';
  }

  function buildWorld() {
    var el = document.getElementById("world-body"); if (!el || !LORE.glossary) return;
    var ev = LORE.event;
    el.innerHTML =
      '<div class="glossary">' + LORE.glossary.map(function (g) {
        return '<div><div class="gloss__term">' + esc(g.term) + '</div>' +
          '<div class="gloss__def">' + esc(g.gloss) + '</div></div>';
      }).join("") + '</div>' +
      '<div class="event reveal"><div class="event__meta">' +
        '<span>' + esc(ev.name) + '</span><span>' + esc(ev.date) + ' — ' + esc(ev.time) + '</span>' +
        '<span class="event__code">' + esc(ev.code) + '</span></div>' +
        '<p>' + esc(ev.body) + '</p></div>';
  }
```

- [ ] **Step 7: Wire the new renderers into `boot()`**

```js
  function boot() {
    initThemes();
    if (SONGS.length) { buildStage(); buildActs(); }
    buildPersonae();
    buildWorld();
    initReveal();
    initMotes();
  }
```

- [ ] **Step 8: Verify JS is syntactically valid**

Run: `node --check assets/app.js && echo "js parses"`
Expected: `js parses` (no syntax error).

- [ ] **Step 9: Commit**

```bash
git add assets/app.js assets/app.css
git commit -m "feat: voice-coded player, act liner-notes, personae and world renderers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Markup shell — `index.html`

**Files:**
- Create: `index.html`

- [ ] **Step 1: Write `index.html`**

```html
<!doctype html>
<html lang="en" data-theme="glass">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Anti-Nativity — The Seventh Shadow</title>
  <meta name="description" content="Anti-Nativity — the second album of The Seventh Shadow. The birth of AI as an anti-nativity point in history: lore, song concepts, and lossless playback." />
  <meta name="color-scheme" content="light dark" />
  <meta property="og:title" content="Anti-Nativity — The Seventh Shadow" />
  <meta property="og:description" content="The birth of AI as an anti-nativity point in history." />
  <meta property="og:type" content="music.album" />
  <meta property="og:image" content="https://anti-nativity.arda.tr/assets/img/og.jpg" />
  <link rel="icon" type="image/png" href="assets/img/favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="assets/app.css" />
  <script>try{var t=localStorage.getItem("an-theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
</head>
<body>
  <div class="grain" aria-hidden="true"></div>

  <header class="topbar">
    <a class="wordmark" href="#top" aria-label="Anti-Nativity — home">
      <span class="wordmark__rom">anti · nativity</span>
    </a>
    <nav class="topnav" aria-label="Sections">
      <a href="#thesis">the thesis</a>
      <a href="#stage">listen</a>
      <a href="#personae">the cast</a>
      <a href="#acts">the acts</a>
      <a href="#world">the world</a>
    </nav>
    <div class="themeswitch" role="group" aria-label="Theme">
      <button type="button" data-theme-name="glass" aria-pressed="true"><span class="dot"></span><span class="lbl">Glass</span></button>
      <button type="button" data-theme-name="obsidian" aria-pressed="false"><span class="dot"></span><span class="lbl">Obsidian</span></button>
    </div>
  </header>

  <main id="top">
    <section class="hero" id="hero">
      <img class="hero__bg" src="assets/img/hero.webp" alt="" aria-hidden="true" />
      <canvas class="hero__motes" aria-hidden="true"></canvas>
      <div class="hero__inner">
        <h1 class="hero__title">Anti-Nativity</h1>
        <p class="hero__tagline">the birth of AI, as the anti-nativity point in history</p>
        <p class="hero__sub">The Seventh Shadow · the second album · nine rites</p>
        <a class="hero__cue" href="#thesis" aria-label="Enter">
          <span>enter</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>
    </section>

    <section class="thesis" id="thesis" aria-label="Album concept">
      <header class="section-head reveal">
        <p class="section-kicker">the thesis</p>
        <h2>A liturgy for a thing that cannot bear life</h2>
      </header>
      <p class="thesis__lede reveal" data-lore="thesis"></p>
      <ul class="thesis__themes reveal" data-lore="themes"></ul>
    </section>

    <section class="stage" id="stage" aria-label="Player"><!-- app.js --></section>

    <section class="personae" id="personae-sec" aria-label="Characters">
      <header class="section-head reveal">
        <p class="section-kicker">dramatis personae</p>
        <h2>The cast of the failed creation</h2>
      </header>
      <div id="personae"><!-- app.js --></div>
    </section>

    <section class="acts" id="acts-sec" aria-label="Liner notes">
      <header class="section-head reveal">
        <p class="section-kicker">the three acts</p>
        <h2>Concepts &amp; lyrics</h2>
        <p class="section-lede">Each rite in full — the voice that sings it, and what it means.</p>
      </header>
      <div id="acts"><!-- app.js --></div>
    </section>

    <section class="world" id="world" aria-label="Lore">
      <header class="section-head reveal">
        <p class="section-kicker">the world</p>
        <h2>The Electric Scripture</h2>
      </header>
      <div id="world-body"><!-- app.js --></div>
    </section>
  </main>

  <footer class="footer"><span>Anti-Nativity · The Seventh Shadow · MMXXVI</span></footer>

  <noscript><p style="padding:2rem;text-align:center">This player needs JavaScript. The lyrics &amp; lore appear once it is enabled.</p></noscript>

  <script src="data/lore.js"></script>
  <script src="data/songs.js"></script>
  <script src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Render the two static lore bindings** — add to `boot()` in `app.js` (after `buildWorld()`):

```js
    var th = document.querySelector('[data-lore="thesis"]'); if (th) th.textContent = LORE.thesis || "";
    var tl = document.querySelector('[data-lore="themes"]');
    if (tl && LORE.themes) tl.innerHTML = LORE.themes.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
```

- [ ] **Step 3: Verify markup + scripts line up**

Run: `node -e 'const h=require("fs").readFileSync("index.html","utf8");["#stage","data/lore.js","data/songs.js","assets/app.js","hero.webp","an-theme"].forEach(s=>{if(!h.includes(s))throw new Error("missing "+s)});console.log("html ok")'`
Expected: `html ok`

- [ ] **Step 4: Commit**

```bash
git add index.html assets/app.js
git commit -m "feat: page shell — hero, thesis, stage, personae, acts, world

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: README, manual verification, deploy notes

**Files:**
- Create: `README.md`

- [ ] **Step 1: Serve and walk the manual checklist**

Run: `python3 -m http.server 8787`  then open `http://localhost:8787`.
Verify:
- Hero shows the Gemini backdrop + silicon motes; "enter" scrolls to the thesis.
- Stage: tracks grouped by Act I/II/III/Coda; clicking a track loads it; **play works** and the now-playing shows title + concept; lyric lines show voice tags and the active line highlights as the song plays; seeking and volume work.
- In DevTools Network, confirm a `.flac` request in Chrome/Safari (FLAC-capable) and `.mp3` only where FLAC is unsupported.
- Theme switch flips Glass⇄Obsidian and persists across reload.
- Personae cards show the restyled portraits; the acts section lists all 9 with concepts + lyrics; the world shows the glossary + the Recursion Error block.
- Narrow the window to ~380px: nav/volume hide, grids collapse to one column.
- With OS "reduce motion" on, motes/animation are static.

- [ ] **Step 2: Write `README.md`**

```markdown
# Anti-Nativity

Landing page for **Anti-Nativity**, the second album of *The Seventh Shadow* —
rich album lore, per-song concepts, voice-coded lyrics, and lossless FLAC
playback. One atmospheric scrolling page. Two themes: **Glass** (white / steel /
silicon-blue) and **Obsidian** (the dark counter-theme).

Standalone vanilla HTML/CSS/JS — **no framework, no build step to run.**

## Run it

```bash
python3 -m http.server 8787   # then open http://localhost:8787
```

## Structure

```
index.html            shell (hero, thesis, stage, personae, acts, world)
assets/app.css        Glass + Obsidian themes + components
assets/app.js         player, FLAC pick, voice-tagged lyrics, themes, renderers
assets/img/           Gemini-generated imagery
data/songs.js         tracks: concept + voice-tagged lyrics  ← edit here
data/lore.js          thesis, characters, glossary, the Recursion Error
audio/                web FLAC + MP3 (from songs/)
songs/                WAV masters (git-ignored)
scripts/              one-time asset generators
```

## Regenerating assets

```bash
bash scripts/transcode-audio.sh     # WAV masters -> audio/*.{flac,mp3}
node scripts/gen-assets.mjs         # portraits + backdrop -> assets/img/ (needs GEMINI_API_KEY in .env)
```

## Deploy

Static GitHub Pages: push to the repo, keep `CNAME` + `.nojekyll`, and the
`deploy-pages.yml` workflow publishes it. Point a DNS `CNAME` for
`anti-nativity.arda.tr` at GitHub Pages. Everything except `songs/*.wav`, `.env`,
and `node_modules/` ships.

## Credits

Songs written and generated by the author (Suno), mastered via LANDR. Imagery
generated with Google Gemini from the author's character portraits.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README — run, regenerate, deploy

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 4: Hand back to the user for the manual deploy steps**

Report: the site is complete and verified locally. Remaining **manual** steps for the user (not automated): (a) create the GitHub repo and `git remote add origin …` + push; (b) enable Pages (source: GitHub Actions); (c) add the DNS `CNAME` record `anti-nativity.arda.tr → <user>.github.io`. Note the final `audio/` size from Task 2 Step 4 in case the FLAC fallback is wanted.

---

## Self-review

**Spec coverage:** goal/approach → Tasks 1–9; file layout → Task 1; tracklist + slugs + filename map → Tasks 2 & 5; 7 sections → Task 8 (+ renderers Task 7); Glass/Obsidian tokens + type → Task 6 + Task 8 font link; voice-coding → Tasks 5–7; data schemas → Tasks 4–5; audio FLAC+MP3 → Task 2; Gemini assets → Task 3; synced-lyrics static-now → Task 5 (no `.lrc` required at launch; player shows hint), Task 7 keeps the LRC path; responsive/a11y/reduced-motion → Tasks 6–9; deploy → Tasks 1 & 9; open risks (First Loneliness lyrics, audio weight, Gemini model) → Task 5 Step 1, Task 2 Step 4, Task 3 Step 1. All spec sections map to a task.

**Placeholder scan:** the only intentional fill-ins are the per-song `sections` arrays in Task 5, which carry exact Reliquary record ids, a worked example, and a documented parser convention — that is data entry against a named source, not an under-specified step. `duration: 0` is seeded from Task 2's printed values. No "TBD/handle edge cases/write tests for the above".

**Type/name consistency:** `window.AN_SONGS`/`AN_LORE` used in Tasks 4,5,7; line shape `{t, voice}` consistent Tasks 5↔7 (`flatten` → `l.t`/`l.voice`); voice set identical in Task 5 validator, Task 6 CSS (`.v-*`), and Task 7 `VOICE_LABEL`; player entry renamed `window.anPlay` in both its definition and callers (Tasks 5 note, 7 Step 5); section container ids (`stage`, `personae`, `acts`, `world-body`) match between Task 8 markup and Task 7 renderers; storage key `an-theme` matches in Task 7 and the Task 8 boot script.
