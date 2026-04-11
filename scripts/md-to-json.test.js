import { describe, it, expect } from "vitest";

// Extract the pure parsing logic for testing (no file I/O)
function slugify(filename) {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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
  let section = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!image && /^!\[\[.+\]\]$/.test(trimmed)) {
      const match = trimmed.match(/^!\[\[(.+?)\]\]$/);
      if (match) image = match[1];
      continue;
    }

    if (/^(#[\p{L}\p{N}_-]+\s*)+$/u.test(trimmed) && tags.length === 0) {
      tags = trimmed.split(/\s+/).filter((t) => t.startsWith("#")).map((t) => t.slice(1));
      continue;
    }

    if (/^#{1,4}\s*ingr[eé]dients\s*:?/i.test(trimmed)) { section = "ingredients"; continue; }
    if (/^#{1,4}\s*pr[eé]paration\s*:?/i.test(trimmed)) { section = "preparation"; continue; }
    if (/^#{1,4}\s/.test(trimmed)) { section = null; continue; }

    if (section === "ingredients") {
      const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bullet) ingredients.push(bullet[1]);
    } else if (section === "preparation") {
      if (trimmed) instructions += (instructions ? " " : "") + trimmed;
    }
  }

  return { slug, title, image, tags, ingredients, instructions, createdAt: now, updatedAt: now };
}

// --- Tests ---

describe("slugify", () => {
  it("convertit en minuscules avec tirets", () => {
    expect(slugify("Tarte aux pommes")).toBe("tarte-aux-pommes");
  });

  it("supprime les accents composés", () => {
    expect(slugify("Crème brûlée")).toBe("creme-brulee");
  });

  it("remplace underscores par tirets", () => {
    expect(slugify("poulet_roti")).toBe("poulet-roti");
  });

  it("supprime les caractères spéciaux", () => {
    expect(slugify("Cake (Rita)")).toBe("cake-rita");
  });

  it("collapse les tirets multiples", () => {
    expect(slugify("soupe  froide")).toBe("soupe-froide");
  });
});

describe("titleFromFilename", () => {
  it("capitalise la première lettre", () => {
    expect(titleFromFilename("tarte-aux-pommes")).toBe("Tarte aux pommes");
  });

  it("remplace les underscores par des espaces", () => {
    expect(titleFromFilename("poulet_roti")).toBe("Poulet roti");
  });
});

describe("parseRecipe", () => {
  const sample = `![[photo.png]]
#dessert #fruit #facile
### Ingrédients :
- 3 pommes
- 100 g de farine
- 50 g de beurre

### Préparation :
Épluchez les pommes. Mélangez la farine et le beurre.`;

  it("extrait l'image", () => {
    expect(parseRecipe(sample, "tarte").image).toBe("photo.png");
  });

  it("extrait les tags", () => {
    expect(parseRecipe(sample, "tarte").tags).toEqual(["dessert", "fruit", "facile"]);
  });

  it("extrait les ingrédients", () => {
    const { ingredients } = parseRecipe(sample, "tarte");
    expect(ingredients).toHaveLength(3);
    expect(ingredients[0]).toBe("3 pommes");
  });

  it("extrait la préparation en une seule chaîne", () => {
    const { instructions } = parseRecipe(sample, "tarte");
    expect(instructions).toContain("Épluchez les pommes");
    expect(typeof instructions).toBe("string");
  });

  it("génère le slug depuis le nom de fichier", () => {
    expect(parseRecipe(sample, "Tarte aux pommes").slug).toBe("tarte-aux-pommes");
  });

  it("génère le titre depuis le nom de fichier", () => {
    expect(parseRecipe(sample, "tarte-aux-pommes").title).toBe("Tarte aux pommes");
  });

  it("retourne null pour l'image si absente", () => {
    const noImage = sample.replace("![[photo.png]]\n", "");
    expect(parseRecipe(noImage, "tarte").image).toBeNull();
  });

  it("retourne des tableaux vides si sections absentes", () => {
    const { tags, ingredients } = parseRecipe("# Juste un titre", "vide");
    expect(tags).toEqual([]);
    expect(ingredients).toEqual([]);
  });

  it("accepte la variante 'Preparation' sans accent", () => {
    const alt = sample.replace("Préparation", "Preparation");
    expect(parseRecipe(alt, "tarte").instructions).toContain("Épluchez");
  });
});
