// GitHub API helper for fetching and writing recipes
// This module handles all interactions with the GitHub Contents API

const GITHUB_API_BASE = "https://api.github.com";

// These will be configured by the user
// IMPORTANT: Replace these with your actual values
const REPO_OWNER = "HellNSab"; // ← Replace with your GitHub username
const REPO_NAME = "recipe-site"; // ← Replace with your repository name (must match exactly)
const RECIPES_PATH = "recipes"; // Folder where recipes are stored
const IMAGES_PATH = "images"; // Folder where images are stored
const BRANCH = "main";

/**
 * Get the configured repository info
 */
export function getRepoConfig() {
  return {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    recipesPath: RECIPES_PATH,
    imagesPath: IMAGES_PATH,
    branch: BRANCH,
  };
}

/**
 * Create headers for GitHub API requests
 * @param {string|null} token - GitHub Personal Access Token (required for write operations)
 */
function createHeaders(token = null) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch all recipes from the repository
 * @returns {Promise<Array>} Array of recipe objects
 */
export async function fetchRecipes() {
  try {
    // First, get the list of files in the recipes directory
    const listUrl = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${RECIPES_PATH}?ref=${BRANCH}`;
    const listResponse = await fetch(listUrl, {
      headers: createHeaders(),
    });

    if (!listResponse.ok) {
      if (listResponse.status === 404) {
        // Recipes folder doesn't exist yet
        console.log("Recipes folder not found, returning empty array");
        return [];
      }
      throw new Error(`Failed to fetch recipe list: ${listResponse.status}`);
    }

    const files = await listResponse.json();

    // Filter for JSON files only
    const jsonFiles = files.filter(
      (file) => file.type === "file" && file.name.endsWith(".json"),
    );

    // Fetch each recipe file
    const recipes = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const contentResponse = await fetch(file.download_url);
          if (!contentResponse.ok) {
            console.error(`Failed to fetch recipe: ${file.name}`);
            return null;
          }
          const recipe = await contentResponse.json();
          // Add the slug from filename if not present
          if (!recipe.slug) {
            recipe.slug = file.name.replace(".json", "");
          }
          return recipe;
        } catch (error) {
          console.error(`Error parsing recipe ${file.name}:`, error);
          return null;
        }
      }),
    );

    // Filter out any failed fetches
    return recipes.filter((recipe) => recipe !== null);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    throw error;
  }
}

/**
 * Fetch a single recipe by slug
 * @param {string} slug - The recipe slug (filename without .json)
 * @returns {Promise<Object|null>} Recipe object or null if not found
 */
export async function fetchRecipe(slug) {
  try {
    const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${RECIPES_PATH}/${slug}.json?ref=${BRANCH}`;
    const response = await fetch(url, {
      headers: createHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch recipe: ${response.status}`);
    }

    const data = await response.json();
    // Content is base64 encoded — decode via TextDecoder to preserve UTF-8
    const binary = atob(data.content.replace(/\n/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const content = new TextDecoder("utf-8").decode(bytes);
    const recipe = JSON.parse(content);
    recipe.slug = slug;
    recipe._sha = data.sha; // Store SHA for updates
    return recipe;
  } catch (error) {
    console.error(`Error fetching recipe ${slug}:`, error);
    throw error;
  }
}

/**
 * Write a recipe to the repository
 * @param {string} slug - The recipe slug (will be used as filename)
 * @param {Object} data - The recipe data
 * @param {string} token - GitHub Personal Access Token
 * @param {string|null} sha - SHA of existing file (for updates)
 * @returns {Promise<Object>} GitHub API response
 */
export async function writeRecipe(slug, data, token, sha = null) {
  if (!token) {
    throw new Error("GitHub token is required for write operations");
  }

  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${RECIPES_PATH}/${slug}.json`;

  // Prepare the recipe data (remove internal fields)
  const recipeData = { ...data };
  delete recipeData._sha;

  // Add metadata
  recipeData.slug = slug;
  recipeData.updatedAt = new Date().toISOString();
  if (!recipeData.createdAt) {
    recipeData.createdAt = recipeData.updatedAt;
  }

  const content = btoa(
    unescape(encodeURIComponent(JSON.stringify(recipeData, null, 2))),
  );

  const body = {
    message: sha ? `Update recipe: ${data.title}` : `Add recipe: ${data.title}`,
    content,
    branch: BRANCH,
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: createHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Failed to write recipe: ${response.status} - ${errorData.message}`,
    );
  }

  return response.json();
}

/**
 * Delete a recipe from the repository
 * @param {string} slug - The recipe slug
 * @param {string} token - GitHub Personal Access Token
 * @param {string} sha - SHA of the file to delete
 * @returns {Promise<Object>} GitHub API response
 */
export async function deleteRecipe(slug, token, sha) {
  if (!token) {
    throw new Error("GitHub token is required for delete operations");
  }

  if (!sha) {
    throw new Error("SHA is required for delete operations");
  }

  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${RECIPES_PATH}/${slug}.json`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: createHeaders(token),
    body: JSON.stringify({
      message: `Delete recipe: ${slug}`,
      sha,
      branch: BRANCH,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Failed to delete recipe: ${response.status} - ${errorData.message}`,
    );
  }

  return response.json();
}

/**
 * Upload an image to the repository
 * @param {string} filename - The image filename
 * @param {string} base64Data - The image data as base64 (without data URL prefix)
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<string>} The URL of the uploaded image
 */
export async function uploadImage(filename, base64Data, token) {
  if (!token) {
    throw new Error("GitHub token is required for upload operations");
  }

  // Generate a unique filename to avoid collisions
  const timestamp = Date.now();
  const uniqueFilename = `${timestamp}-${filename}`;

  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${IMAGES_PATH}/${uniqueFilename}`;

  // Remove data URL prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

  const response = await fetch(url, {
    method: "PUT",
    headers: createHeaders(token),
    body: JSON.stringify({
      message: `Upload image: ${uniqueFilename}`,
      content: cleanBase64,
      branch: BRANCH,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Failed to upload image: ${response.status} - ${errorData.message}`,
    );
  }

  const data = await response.json();
  return data.content.download_url;
}

/**
 * Resolve a recipe image field to a usable URL.
 * Three formats coexist:
 *   - bare filename (oldest recipes, served from public/images/)
 *   - jsDelivr CDN URL (recipes uploaded before the raw.githubusercontent.com switch)
 *   - raw.githubusercontent.com URL (current uploadImage() output)
 * Absolute URLs are returned as-is; bare filenames are resolved against baseUrl.
 * @param {string|null} image - The image field from a recipe
 * @param {string} baseUrl - import.meta.env.BASE_URL
 * @returns {string|null}
 */
export function resolveImageUrl(image, baseUrl) {
  if (!image) return null;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `${baseUrl}images/${encodeURIComponent(image)}`;
}

/**
 * Convert a File object to base64
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 encoded string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generate a slug from a title
 * @param {string} title - The recipe title
 * @returns {string} URL-friendly slug
 */
export function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .substring(0, 50); // Limit length
}
