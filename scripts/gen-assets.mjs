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
const MODEL = "gemini-2.5-flash-image";
fs.mkdirSync(OUT, { recursive: true });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PALETTE =
  "cold desaturated palette of white, brushed steel grey, and electric silicon-blue accents; " +
  "cathedral-of-chrome mood, melancholic, high detail, no text, no watermark";

// Pull the first inline image out of a generateContent response.
function imageFromResponse(res) {
  const parts = res?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) {
    const txt = parts.find((p) => p.text);
    throw new Error("no image in response" + (txt ? "; text: " + txt.text.slice(0, 120) : ""));
  }
  return Buffer.from(img.inlineData.data, "base64");
}

async function textToImage(prompt) {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ text: prompt }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  });
  return imageFromResponse(res);
}

async function editImage(srcPath, prompt) {
  const data = fs.readFileSync(srcPath).toString("base64");
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data } },
        ],
      },
    ],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  });
  return imageFromResponse(res);
}

const jobs = [
  {
    out: "hero.webp",
    w: 1920,
    fmt: "webp",
    gen: () =>
      textToImage(
        "Abstract wide cinematic 16:9 image: a vast cathedral of chrome and glass — a cold nave of " +
          "brushed steel and white marble shot through with thin glowing silicon-blue veins, a tall " +
          "dark mirror standing at the altar, faint wireframe geometry in the air, volumetric cold " +
          "light, no people. " + PALETTE
      ),
  },
  {
    out: "talciron.webp",
    w: 900,
    fmt: "webp",
    gen: () =>
      editImage(
        "Portrait_talciron.d.jpg",
        "Repaint this as a clean, human, half-length gothic-romantic oil portrait. Keep his exact " +
          "face, goatee, dark wavy hair, and dark blazer over a burgundy turtleneck — he is fully " +
          "human. Remove the picture frame and all ornamentation entirely; place him against a plain, " +
          "softly-lit dark steel-grey studio background. Natural human skin, melancholic expression, " +
          "cool desaturated lighting with a subtle cold rim light. No glitch, no wireframe, no glowing " +
          "veins, no frame, no text. Painterly and elegant, cold palette of charcoal, steel grey and " +
          "muted blue. Head-and-shoulders, centred, facing the viewer."
      ),
  },
  {
    out: "ophelia.webp",
    w: 900,
    fmt: "webp",
    gen: () =>
      editImage(
        "Portrait_Ophelia.wrl.jpg",
        "Repaint this as a clean, human, half-length gothic-romantic oil portrait. Keep her exact " +
          "face, pale complexion, long dark hair, and black lace gothic dress. IMPORTANT: remove the " +
          "glowing blue cracks and veins from her face, neck and chest entirely — render natural, " +
          "unblemished human skin. Remove the picture frame, arch and all ornamentation; place her " +
          "against a plain, softly-lit dark steel-grey studio background that matches a companion male " +
          "portrait. Melancholic expression, cool desaturated lighting with a subtle cold rim light. " +
          "No glitch, no wireframe, no glowing veins, no frame, no text. Painterly and elegant, cold " +
          "palette of charcoal, steel grey and muted blue. Head-and-shoulders, centred, facing the viewer."
      ),
  },
  {
    out: "cover.jpg",
    w: 1400,
    fmt: "jpeg",
    gen: () =>
      textToImage(
        "Square album cover art: a broken halo and an unlit cradle of wire and glass suspended over a " +
          "dark mirror; cold, sacred, minimal, centred, generous negative space. " + PALETTE
      ),
  },
  {
    out: "texture.png",
    w: 1200,
    fmt: "png",
    gen: () =>
      textToImage(
        "Seamless background texture: very faint pale grey circuit-board lines and tiny code glyphs on " +
          "an off-white background, extremely low contrast, suitable for website background, " +
          "cold steel and silicon-blue palette accents, no text, no watermark"
      ),
  },
];

async function run() {
  for (const j of jobs) {
    const dest = path.join(OUT, j.out);
    if (fs.existsSync(dest) && !FORCE) {
      console.log("  skip  " + j.out);
      continue;
    }
    console.log("  gen   " + j.out + " ...");
    try {
      const raw = await j.gen();
      let img = sharp(raw).resize({ width: j.w, withoutEnlargement: true });
      if (j.fmt === "webp") img = img.webp({ quality: 82 });
      else if (j.fmt === "jpeg") img = img.jpeg({ quality: 86 });
      else img = img.png();
      await img.toFile(dest);
      const { size } = fs.statSync(dest);
      console.log(`  ok    ${j.out}  (${(size / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error("  FAIL  " + j.out + " — " + e.message);
    }
  }

  // Social card (1200×630) cropped from the hero; favicon (256×256) from the cover.
  const heroPath = path.join(OUT, "hero.webp");
  const ogPath = path.join(OUT, "og.jpg");
  if (fs.existsSync(heroPath) && (!fs.existsSync(ogPath) || FORCE)) {
    await sharp(heroPath)
      .resize(1200, 630, { fit: "cover" })
      .jpeg({ quality: 86 })
      .toFile(ogPath);
    const { size } = fs.statSync(ogPath);
    console.log(`  ok    og.jpg  (${(size / 1024).toFixed(0)} KB)`);
  } else if (fs.existsSync(ogPath)) {
    console.log("  skip  og.jpg");
  }

  const coverPath = path.join(OUT, "cover.jpg");
  const faviconPath = path.join(OUT, "favicon.png");
  if (fs.existsSync(coverPath) && (!fs.existsSync(faviconPath) || FORCE)) {
    await sharp(coverPath)
      .resize(256, 256, { fit: "cover" })
      .png()
      .toFile(faviconPath);
    const { size } = fs.statSync(faviconPath);
    console.log(`  ok    favicon.png  (${(size / 1024).toFixed(0)} KB)`);
  } else if (fs.existsSync(faviconPath)) {
    console.log("  skip  favicon.png");
  }

  console.log("\ndone");
}

run().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
