#!/usr/bin/env node
/**
 * Convert Obsidian-style markdown recipe files to JSON.
 *
 * Usage:
 *   node scripts/md-to-json.js <input-folder> <output-folder> [options]
 *
 * Options:
 *   --images-src <dir>   Directory where images are located
 *                        (default: parent directory of input-folder)
 *   --images-out <dir>   Directory to copy images into (optional)
 *
 * The `category` field is derived from the input folder name
 * (e.g. "salé" → category: "salé", "sucré" → category: "sucré").
 *
 * Expected markdown structure (order may vary):
 *   ![[image.png]]                  ← optional Obsidian image embed
 *   #tag1 #tag2 #tag3               ← hashtag line
 *   ### Ingrédients :
 *   - ingredient 1                  ← bullet items OR plain-text lines
 *   ingredient 2
 *   ### Préparation :
 *   Paragraph 1…
 *
 *   Paragraph 2…                    ← newlines are preserved (Markdown)
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
  copyFileSync,
} from "fs";
import { join, basename, extname, dirname, resolve } from "path";

// ─── Argument parsing ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let inputDir, outputDir, imagesSrc, imagesOut;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--images-src") {
    imagesSrc = args[++i];
  } else if (args[i] === "--images-out") {
    imagesOut = args[++i];
  } else if (!inputDir) {
    inputDir = args[i];
  } else if (!outputDir) {
    outputDir = args[i];
  }
}

if (!inputDir || !outputDir) {
  console.error(
    "Usage: node scripts/md-to-json.js <input-folder> <output-folder> [--images-src <dir>] [--images-out <dir>]"
  );
  process.exit(1);
}

// Derive category from input folder name (e.g. "salé", "sucré")
const category = basename(resolve(inputDir)).normalize("NFC");

// Default images source: parent directory of input folder
if (!imagesSrc) {
  imagesSrc = dirname(resolve(inputDir));
}

mkdirSync(outputDir, { recursive: true });
if (imagesOut) {
  mkdirSync(imagesOut, { recursive: true });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Filename → URL-safe slug */
function slugify(filename) {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[\s_]+/g, "-") // spaces/underscores → dashes
    .replace(/[^a-z0-9-]/g, "") // drop non-alphanumeric
    .replace(/-+/g, "-") // collapse multiple dashes
    .replace(/^-|-$/g, ""); // trim leading/trailing dashes
}

/** Filename → human-readable title */
function titleFromFilename(filename) {
  const spaced = filename.replace(/[-_]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ─── Parser ──────────────────────────────────────────────────────────────────

function parseRecipe(content, filename) {
  const lines = content.split("\n");
  const now = new Date().toISOString();
  const slug = slugify(filename);
  const title = titleFromFilename(filename);

  let image = null;
  let tags = [];
  let ingredients = [];
  let instructionLines = [];

  let section = null; // "ingredients" | "preparation"

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Obsidian image embed: ![[filename.ext]]
    if (!image && /^!\[\[.+\]\]$/.test(trimmed)) {
      const match = trimmed.match(/^!\[\[(.+?)\]\]$/);
      if (match) image = match[1];
      continue;
    }

    // Hashtag line: #tag1 #tag2 …
    if (tags.length === 0 && /^(#[\p{L}\p{N}_-]+\s*)+$/u.test(trimmed)) {
      tags = trimmed
        .split(/\s+/)
        .filter((t) => t.startsWith("#"))
        .map((t) => t.slice(1));
      continue;
    }

    // Section headers
    if (/^#{1,4}\s*ingr[eé]dients\s*:?/i.test(trimmed)) {
      section = "ingredients";
      continue;
    }
    if (/^#{1,4}\s*pr[eé]paration\s*:?/i.test(trimmed)) {
      section = "preparation";
      continue;
    }
    // Any other markdown heading resets section
    if (/^#{1,4}\s/.test(trimmed)) {
      section = null;
      continue;
    }

    if (section === "ingredients") {
      // Skip lines that are only punctuation / lone dashes (separators)
      if (/^[-*•]+$/.test(trimmed)) continue;

      // Bullet list item → strip the bullet prefix
      const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bullet) {
        const item = bullet[1].trim();
        if (item) ingredients.push(item);
      } else if (trimmed) {
        // Plain-text line (no bullet) → include as-is
        // Strip trailing comma that sometimes appears in Obsidian lists
        ingredients.push(trimmed.replace(/,\s*$/, ""));
      }
      // Empty lines in the ingredients section are skipped
    } else if (section === "preparation") {
      // Preserve lines including blank ones (for Markdown paragraph breaks)
      // Only strip trailing whitespace from each line
      instructionLines.push(line.trimEnd());
    }
  }

  // Clean up instructions:
  // - remove leading / trailing blank lines
  // - collapse 3+ consecutive newlines into a single blank line
  const instructions = instructionLines
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "")
    .replace(/\n{3,}/g, "\n\n");

  return {
    slug,
    title,
    image,
    tags,
    category,
    ingredients,
    instructions,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Main loop ───────────────────────────────────────────────────────────────

const files = readdirSync(inputDir).filter((f) => extname(f) === ".md");

if (files.length === 0) {
  console.error(`No .md files found in: ${inputDir}`);
  process.exit(1);
}

let converted = 0;
let errors = 0;
let imagesCopied = 0;
let imagesMissing = 0;

for (const file of files) {
  try {
    const content = readFileSync(join(inputDir, file), "utf8")
      .normalize("NFC")
      .replace(/\u00A0/g, " "); // non-breaking spaces → regular spaces
    const filename = basename(file, ".md").normalize("NFC");
    const recipe = parseRecipe(content, filename);
    const outPath = join(outputDir, `${recipe.slug}.json`);
    writeFileSync(
      outPath,
      JSON.stringify(recipe, null, 2).normalize("NFC"),
      "utf8"
    );

    // Copy image to destination directory if requested
    if (recipe.image && imagesOut) {
      const srcImage = join(imagesSrc, recipe.image);
      const destImage = join(imagesOut, recipe.image);
      if (existsSync(srcImage)) {
        copyFileSync(srcImage, destImage);
        imagesCopied++;
      } else {
        console.warn(`  ⚠ Image not found: ${recipe.image}`);
        imagesMissing++;
      }
    }

    console.log(
      `✓ ${file} → ${recipe.slug}.json` +
        (recipe.image ? ` 📷 ${recipe.image}` : "")
    );
    converted++;
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
    errors++;
  }
}

console.log(`\nDone: ${converted} converted, ${errors} errors.`);
if (imagesOut) {
  console.log(`Images: ${imagesCopied} copied, ${imagesMissing} missing.`);
}
