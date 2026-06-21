// Build plain-text lyric sheets from data/songs.js for an external sync tool.
// - one line per displayed line, in player order, so timestamps you set align
//   positionally when saved as lyrics/<slug>.lrc (blank lines between sections
//   are ignored by sync tools and don't affect alignment);
// - multi-voice songs prefix a line with its character handle when the voice
//   changes (e.g. "ophelia.wrl:" / "talciron.d:"); single-voice songs stay clean.
// The synced lyrics/<slug>.lrc files are the source of truth — re-run this only
// to refresh the .txt for songs not yet synced.  Run from project root:
//   node scripts/build-lyrics-txt.mjs
import fs from "node:fs";
import path from "node:path";

const VOICE_LABEL = {
  talciron: "talciron.d", ophelia: "ophelia.wrl", choir: "choir", soprano: "soprano",
  masses: "the masses", scribe: "the scribe", beast: "mirror-beast",
  homunculus: "homunculus", both: "both", stage: "",
};

const win = {};
new Function("window", fs.readFileSync("data/songs.js", "utf8"))(win);
const SONGS = win.AN_SONGS || [];

fs.mkdirSync("lyrics", { recursive: true });
let n = 0;
for (const s of SONGS) {
  const voices = new Set();
  s.sections.forEach((sec) => sec.lines.forEach((l) => { if (l.voice !== "stage") voices.add(l.voice); }));
  const multi = voices.size > 1;
  const out = [];
  let prev = null;
  s.sections.forEach((sec, si) => {
    if (si > 0) out.push("");
    sec.lines.forEach((l) => {
      const tag = multi && l.voice !== "stage" && l.voice !== prev ? VOICE_LABEL[l.voice] + ": " : "";
      out.push(tag + l.t);
      prev = l.voice;
    });
  });
  fs.writeFileSync(path.join("lyrics", s.id + ".txt"), out.join("\n") + "\n");
  const count = s.sections.reduce((a, x) => a + x.lines.length, 0);
  console.log("  ok  lyrics/" + s.id + ".txt  (" + count + " lines" + (multi ? ", voiced" : "") + ")");
  n++;
}
console.log("done — " + n + " files");
