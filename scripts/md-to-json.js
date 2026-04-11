#!/usr/bin/env node
/**
 * Convert Obsidian-style markdown recipe files to JSON.
 *
 * Usage:
 *   node scripts/md-to-json.js <input-folder> <output-folder>
 *
 * Example:
 *   node scripts/md-to-json.js ~/recipes/md ./recipes-json
 *
 * Expected markdown structure:
 *   ![[image.png]]            ← optional Obsidian image embed
 *   #tag1 #tag2 #tag3         ← hashtag line
 *   ### Ingrédients :
 *   - ingredient 1
 *   - ingredient 2
 *   ### Préparation :
 *   Full preparation text as one block.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { join, basename, extname } from "path";

const [, , inputDir, outputDir] = process.argv;

if (!inputDir || !outputDir) {
  console.error("Usage: node scripts/md-to-json.js <input-folder> <output-folder>");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

/** Filename → slug: lowercase, strip accents, spaces/underscores → dashes, drop non-alphanumeric */
function slugify(filename) {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip accents
    .toLowerCase()
    .replace(/[\s_]+/g, "-")           // spaces/underscores → dashes
    .replace(/[^a-z0-9-]/g, "")        // drop anything else
    .replace(/-+/g, "-")               // collapse multiple dashes
    .replace(/^-|-$/g, "");            // trim leading/trailing dashes
}

/** Filename → human title: replace dashes/underscores with spaces, capitalize first letter */
function titleFromFilename(filename) {
  const spaced = filename.replace(/[-_]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function parseRecipe(content, filename) {
  const lines = content.split("\n");
  const now = new Date().toISOString();
  const slug = slugify(filename);
  const title = titleFromFilename(filename);

  let image = null;
  let tags = [];
  let ingredients = [];
  let instructions = "";

  let section = null; // "ingredients" | "preparation"

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Obsidian image embed: ![[filename.png]]
    if (!image && /^!\[\[.+\]\]$/.test(trimmed)) {
      const match = trimmed.match(/^!\[\[(.+?)\]\]$/);
      if (match) image = match[1];
      continue;
    }

    // Hashtag line: #tag1 #tag2 ...
    if (/^(#[\p{L}\p{N}_-]+\s*)+$/u.test(trimmed) && tags.length === 0) {
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
    // Any other heading resets section
    if (/^#{1,4}\s/.test(trimmed)) {
      section = null;
      continue;
    }

    if (section === "ingredients") {
      // Bullet list item
      const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bullet) ingredients.push(bullet[1]);
    } else if (section === "preparation") {
      if (trimmed) {
        instructions += (instructions ? " " : "") + trimmed;
      }
    }
  }

  return {
    slug,
    title,
    image,
    tags,
    ingredients,
    instructions,
    createdAt: now,
    updatedAt: now,
  };
}

const files = readdirSync(inputDir).filter((f) => extname(f) === ".md");

if (files.length === 0) {
  console.error(`No .md files found in: ${inputDir}`);
  process.exit(1);
}

let converted = 0;
let errors = 0;

for (const file of files) {
  try {
    const content = readFileSync(join(inputDir, file), "utf8").normalize("NFC");
    const filename = basename(file, ".md").normalize("NFC");
    const recipe = parseRecipe(content, filename);
    const outPath = join(outputDir, `${recipe.slug}.json`);
    writeFileSync(outPath, JSON.stringify(recipe, null, 2).normalize("NFC"), "utf8");
    console.log(`✓ ${file} → ${recipe.slug}.json`);
    converted++;
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
    errors++;
  }
}

console.log(`\nDone: ${converted} converted, ${errors} errors.`);
