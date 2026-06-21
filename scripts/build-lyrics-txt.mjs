// Build plain-text lyric sheets from data/songs.js — one line per displayed line,
// in player order (the same order app.js flattens), so timestamps made in an external
// sync tool line up positionally when saved as lyrics/<slug>.lrc.
// Bracketed/parenthetical stage + SFX lines are included so positions match the player;
// delete any you don't want to time. Run from project root:
//   node scripts/build-lyrics-txt.mjs
import fs from "node:fs";
import path from "node:path";

const win = {};
new Function("window", fs.readFileSync("data/songs.js", "utf8"))(win);
const SONGS = win.AN_SONGS || [];

fs.mkdirSync("lyrics", { recursive: true });
let n = 0;
for (const s of SONGS) {
  const lines = s.sections.flatMap((sec) => sec.lines.map((l) => l.t));
  fs.writeFileSync(path.join("lyrics", s.id + ".txt"), lines.join("\n") + "\n");
  console.log("  ok  lyrics/" + s.id + ".txt  (" + lines.length + " lines)");
  n++;
}
console.log("done — " + n + " files");
