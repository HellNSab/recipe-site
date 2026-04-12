import Fuse from "fuse.js";

// Fuse.js configuration for recipe search
const fuseOptions = {
  // Keys to search in recipe objects
  keys: [
    { name: "title", weight: 0.5 },
    { name: "tags", weight: 0.2 },
    { name: "ingredients", weight: 0.2 },
    { name: "instructions", weight: 0.1 },
  ],
  // Search configuration
  threshold: 0.3, // Lower = more strict matching
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  useExtendedSearch: true,
};

let fuseInstance = null;

/**
 * Initialize or update the Fuse search index with recipes
 * @param {Array} recipes - Array of recipe objects
 * @returns {Fuse} The Fuse instance
 */
export function initializeSearch(recipes) {
  fuseInstance = new Fuse(recipes, fuseOptions);
  return fuseInstance;
}

/**
 * Search recipes with the given query
 * @param {string} query - Search query
 * @param {Array} recipes - Optional recipes array to search (will re-initialize if provided)
 * @returns {Array} Array of matching recipe objects
 */
export function searchRecipes(query, recipes = null) {
  // If recipes provided, reinitialize the index
  if (recipes) {
    initializeSearch(recipes);
  }

  // If no search query, return empty (caller should show all recipes)
  if (!query || query.trim() === "") {
    return null; // null indicates "show all"
  }

  // If no Fuse instance, return empty array
  if (!fuseInstance) {
    console.warn("Search not initialized. Call initializeSearch first.");
    return [];
  }

  // Perform the search
  const results = fuseInstance.search(query.trim());

  // Return just the recipe items (without Fuse metadata)
  return results.map((result) => result.item);
}

/**
 * Filter recipes by tag
 * @param {Array} recipes - Array of recipe objects
 * @param {string} tag - Tag to filter by
 * @returns {Array} Filtered recipes
 */
export function filterByTag(recipes, tag) {
  if (!tag || tag === "all") {
    return recipes;
  }

  return recipes.filter(
    (recipe) =>
      recipe.tags &&
      recipe.tags.some(
        (recipeTag) => recipeTag.toLowerCase() === tag.toLowerCase()
      )
  );
}

/**
 * Filter recipes by multiple tags (AND logic — recipe must have all tags)
 * @param {Array} recipes - Array of recipe objects
 * @param {Array<string>} tags - Tags to filter by
 * @returns {Array} Filtered recipes
 */
export function filterByTags(recipes, tags) {
  if (!tags || tags.length === 0) {
    return recipes;
  }

  return recipes.filter(
    (recipe) =>
      recipe.tags &&
      tags.every((tag) =>
        recipe.tags.some((recipeTag) => recipeTag.toLowerCase() === tag.toLowerCase())
      )
  );
}

/**
 * Get all unique tags from recipes, sorted by frequency descending.
 * @param {Array} recipes - Array of recipe objects
 * @returns {Array} Array of unique tag strings, most used first
 */
export function getAllTags(recipes) {
  const tagCount = {};

  recipes.forEach((recipe) => {
    if (recipe.tags && Array.isArray(recipe.tags)) {
      recipe.tags.forEach((tag) => {
        const t = tag.toLowerCase();
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    }
  });

  return Object.entries(tagCount)
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
    .map(([tag]) => tag);
}

/**
 * Combined search and filter function
 * @param {Array} recipes - Array of recipe objects
 * @param {string} query - Search query
 * @param {Array<string>} tags - Tags to filter by (AND logic)
 * @returns {Array} Filtered and searched recipes
 */
export function searchAndFilter(recipes, query, tags) {
  let results = recipes;

  // First, filter by tags if specified
  if (tags && tags.length > 0) {
    results = filterByTags(results, tags);
  }

  // Then, search within filtered results if query specified
  if (query && query.trim() !== "") {
    initializeSearch(results);
    const searchResults = fuseInstance.search(query.trim());
    results = searchResults.map((result) => result.item);
  }

  return results;
}
