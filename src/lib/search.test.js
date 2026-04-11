import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeSearch,
  searchRecipes,
  filterByTag,
  getAllTags,
  searchAndFilter,
} from "./search.js";

const recipes = [
  {
    slug: "tarte-aux-pommes",
    title: "Tarte aux pommes",
    tags: ["dessert", "fruit"],
    ingredients: ["pommes", "farine", "beurre"],
    instructions: "Mélangez les ingrédients.",
  },
  {
    slug: "poulet-roti",
    title: "Poulet rôti",
    tags: ["plat", "viande"],
    ingredients: ["poulet", "herbes", "huile"],
    instructions: "Enfournez à 200°C.",
  },
  {
    slug: "mousse-chocolat",
    title: "Mousse au chocolat",
    tags: ["dessert", "chocolat"],
    ingredients: ["chocolat", "oeufs", "sucre"],
    instructions: "Faites fondre le chocolat.",
  },
];

describe("getAllTags", () => {
  it("retourne tous les tags uniques triés alphabétiquement", () => {
    const tags = getAllTags(recipes);
    expect(tags).toEqual(["chocolat", "dessert", "fruit", "plat", "viande"]);
  });

  it("retourne un tableau vide si aucune recette", () => {
    expect(getAllTags([])).toEqual([]);
  });

  it("ignore les recettes sans tags", () => {
    const tags = getAllTags([{ slug: "test", title: "Test" }]);
    expect(tags).toEqual([]);
  });

  it("déduplique les tags", () => {
    const tags = getAllTags(recipes);
    const unique = new Set(tags);
    expect(tags.length).toBe(unique.size);
  });
});

describe("filterByTag", () => {
  it("filtre les recettes par tag", () => {
    const result = filterByTag(recipes, "dessert");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.slug)).toContain("tarte-aux-pommes");
    expect(result.map((r) => r.slug)).toContain("mousse-chocolat");
  });

  it("retourne toutes les recettes pour le tag 'all'", () => {
    expect(filterByTag(recipes, "all")).toHaveLength(3);
  });

  it("retourne toutes les recettes si tag vide", () => {
    expect(filterByTag(recipes, "")).toHaveLength(3);
  });

  it("est insensible à la casse", () => {
    expect(filterByTag(recipes, "DESSERT")).toHaveLength(2);
  });

  it("retourne un tableau vide si aucune recette ne correspond", () => {
    expect(filterByTag(recipes, "soupe")).toHaveLength(0);
  });
});

describe("searchRecipes", () => {
  beforeEach(() => {
    initializeSearch(recipes);
  });

  it("trouve une recette par titre", () => {
    const results = searchRecipes("poulet");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toBe("poulet-roti");
  });

  it("trouve une recette par ingrédient", () => {
    const results = searchRecipes("chocolat");
    expect(results.some((r) => r.slug === "mousse-chocolat")).toBe(true);
  });

  it("retourne null pour une requête vide", () => {
    expect(searchRecipes("")).toBeNull();
  });

  it("retourne un tableau vide si aucun résultat", () => {
    const results = searchRecipes("xyzxyzxyz");
    expect(results).toEqual([]);
  });
});

describe("searchAndFilter", () => {
  it("combine recherche et filtre par tag", () => {
    const results = searchAndFilter(recipes, "pommes", "dessert");
    expect(results.some((r) => r.slug === "tarte-aux-pommes")).toBe(true);
    expect(results.every((r) => r.tags.includes("dessert"))).toBe(true);
  });

  it("retourne toutes les recettes sans query ni tag", () => {
    expect(searchAndFilter(recipes, "", "all")).toHaveLength(3);
  });

  it("filtre par tag sans query", () => {
    const results = searchAndFilter(recipes, "", "viande");
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("poulet-roti");
  });
});
