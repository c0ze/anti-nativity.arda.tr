# Synced lyrics (`.lrc`)

One timed `.lrc` file per song, named by song id (the `id` in `../data/songs.js`):
`lyrics/<slug>.lrc` — e.g. `first-loneliness.lrc`. All nine album tracks are
synced, so the stage lights line by line for every song.

Produce (or re-sync) one with the **lyrics-sync** tool
(`~/projects/music/lyrics-sync`):

1. Load the song's audio (`../audio/<slug>.mp3` or the WAV master).
2. Load the matching plain-text sheet from this folder: `<slug>.txt` — one
   displayed lyric line per text line, section-spaced (the tool skips blank
   lines). Multi-voice songs prefix a line with its character handle
   (`ophelia.wrl:` / `talciron.d:` / `choir:` …) whenever the voice changes;
   single-voice songs stay clean.
3. Play, and tap **Space** as each line lands.
4. **Stamp every line** — the tool only exports lines that got a timestamp, so a
   skipped line would shift everything after it out of alignment.
5. Export the `.lrc` and save it here as `<slug>.lrc`.

The `.txt` sheets are generated from `../data/songs.js` by
`node scripts/build-lyrics-txt.mjs` (run from the project root). The synced
`.lrc` files are the source of truth — if a song's lines change in
`../data/songs.js`, re-run the script to refresh its sheet, then re-sync that
song.

**How sync works.** The page reads the `.lrc` timestamps in order and zips them
to the song's lyric lines **by index** — so the text inside the `.lrc` does not
have to match. Only the count and order of timed lines need to line up with the
lyrics in `../data/songs.js`. When the site is served over http (GitHub Pages,
or a local server), the stage lights line by line and auto-scrolls. Without an
`.lrc`, the lyrics show statically — sync is pure progressive enhancement.

> Opening `index.html` straight from disk (`file://`) blocks `fetch`, so sync
> only activates when served. Use `python3 -m http.server` locally.
