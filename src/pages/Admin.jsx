import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchRecipe,
  writeRecipe,
  uploadImage,
  fileToBase64,
  generateSlug,
  deleteRecipe,
} from "../lib/github";
import {
  isAuthenticated,
  login,
  logout,
  getToken,
  getUsername,
} from "../lib/auth";

/**
 * Admin page component
 * Password-gated form for adding and editing recipes
 */
export default function Admin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editSlug = searchParams.get("edit");

  // Auth state
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    tags: "",
    prepTime: "",
    cookTime: "",
    servings: "",
    ingredients: "",
    instructions: "",
    notes: "",
  });
  const [existingRecipe, setExistingRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Image upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Load existing recipe if editing
  useEffect(() => {
    async function loadRecipe() {
      if (!editSlug || !authenticated) return;

      try {
        setLoading(true);
        setError("");
        const recipe = await fetchRecipe(editSlug);

        if (recipe) {
          setExistingRecipe(recipe);
          setFormData({
            title: recipe.title || "",
            description: recipe.description || "",
            image: recipe.image || "",
            tags: recipe.tags?.join(", ") || "",
            prepTime: recipe.prepTime || "",
            cookTime: recipe.cookTime || "",
            servings: recipe.servings || "",
            ingredients: recipe.ingredients?.join("\n") || "",
            instructions: recipe.instructions?.join("\n\n") || "",
            notes: recipe.notes || "",
          });
          setImagePreview(recipe.image || "");
        } else {
          setError("Recipe not found");
        }
      } catch (err) {
        console.error("Failed to load recipe:", err);
        setError("Failed to load recipe for editing");
      } finally {
        setLoading(false);
      }
    }

    loadRecipe();
  }, [editSlug, authenticated]);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const result = await login(token);
      if (result.success) {
        setAuthenticated(true);
        setToken("");
      } else {
        setAuthError(result.error || "Authentication failed");
      }
    } catch (err) {
      setAuthError("An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setFormData({
      title: "",
      description: "",
      image: "",
      tags: "",
      prepTime: "",
      cookTime: "",
      servings: "",
      ingredients: "",
      instructions: "",
      notes: "",
    });
    setExistingRecipe(null);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle image file selection
  const handleImageSelect = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setImageFile(file);

    // Create preview
    try {
      const base64 = await fileToBase64(file);
      setImagePreview(base64);
    } catch (err) {
      console.error("Failed to create image preview:", err);
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate required fields
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    if (!formData.ingredients.trim()) {
      setError("Ingredients are required");
      return;
    }

    if (!formData.instructions.trim()) {
      setError("Instructions are required");
      return;
    }

    setSaving(true);

    try {
      const authToken = getToken();
      if (!authToken) {
        setError("Authentication expired. Please log in again.");
        setAuthenticated(false);
        return;
      }

      // Upload image if a new file was selected
      let imageUrl = formData.image;
      if (imageFile) {
        setUploadingImage(true);
        try {
          const base64 = await fileToBase64(imageFile);
          imageUrl = await uploadImage(imageFile.name, base64, authToken);
        } catch (err) {
          console.error("Failed to upload image:", err);
          setError("Failed to upload image. Recipe saved without image.");
        } finally {
          setUploadingImage(false);
        }
      }

      // Prepare recipe data
      const recipeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        image: imageUrl,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t),
        prepTime: formData.prepTime.trim(),
        cookTime: formData.cookTime.trim(),
        servings: formData.servings.trim(),
        ingredients: formData.ingredients
          .split("\n")
          .map((i) => i.trim())
          .filter((i) => i),
        instructions: formData.instructions
          .split("\n\n")
          .map((i) => i.trim())
          .filter((i) => i),
        notes: formData.notes.trim(),
      };

      // Generate slug
      const slug = existingRecipe?.slug || generateSlug(formData.title);

      // Save recipe
      await writeRecipe(
        slug,
        recipeData,
        authToken,
        existingRecipe?._sha
      );

      setSuccess(
        existingRecipe
          ? "Recipe updated successfully!"
          : "Recipe created successfully!"
      );

      // Clear form and redirect after a short delay
      setTimeout(() => {
        navigate(`/recipe/${slug}`);
      }, 1500);
    } catch (err) {
      console.error("Failed to save recipe:", err);
      setError(err.message || "Failed to save recipe. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!existingRecipe) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${existingRecipe.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      const authToken = getToken();
      if (!authToken) {
        setError("Authentication expired. Please log in again.");
        setAuthenticated(false);
        return;
      }

      await deleteRecipe(existingRecipe.slug, authToken, existingRecipe._sha);
      setSuccess("Recipe deleted successfully!");

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      console.error("Failed to delete recipe:", err);
      setError(err.message || "Failed to delete recipe. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Clear image
  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, image: "" }));
  };

  // Login form
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🔐</div>
              <h1 className="font-serif text-2xl font-bold text-gray-800 mb-2">
                Family Access
              </h1>
              <p className="text-gray-600">
                Enter your GitHub Personal Access Token to manage recipes
              </p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label
                  htmlFor="token"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  GitHub Token
                </label>
                <input
                  type="password"
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="form-input"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token needs repo scope for write access
                </p>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || !token.trim()}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link
                to="/"
                className="block text-center text-sage-600 hover:text-sage-800 transition-colors"
              >
                ← Back to recipes
              </Link>
            </div>
          </div>

          {/* Help text */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p className="mb-2">Need a token?</p>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=Recipe%20Site"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sage-600 hover:text-sage-800 underline"
            >
              Create a GitHub Personal Access Token
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-sage-600">Loading recipe...</p>
        </div>
      </div>
    );
  }

  // Recipe form
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-sage-600 hover:text-sage-800 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Back</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-sage-600">
                Signed in as <strong>{getUsername()}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-terracotta-600 hover:text-terracotta-800 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h1 className="font-serif text-3xl font-bold text-gray-800 mb-6">
            {existingRecipe ? "Edit Recipe" : "Add New Recipe"}
          </h1>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Recipe Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Grandma's Apple Pie"
                className="form-input"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="A brief description of the recipe..."
                className="form-textarea"
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipe Image
              </label>

              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Recipe preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-gray-600 hover:text-red-600 transition-colors"
                    aria-label="Remove image"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div
                  className={`upload-zone ${dragOver ? "dragover" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("image-input").click()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto text-sage-400 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sage-600 mb-1">
                    Drag and drop an image here, or click to select
                  </p>
                  <p className="text-sm text-sage-400">
                    PNG, JPG, or WebP up to 5MB
                  </p>
                </div>
              )}

              <input
                type="file"
                id="image-input"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="dessert, holiday, family favorite"
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate tags with commas
              </p>
            </div>

            {/* Time and Servings Row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="prepTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Prep Time (min)
                </label>
                <input
                  type="number"
                  id="prepTime"
                  name="prepTime"
                  value={formData.prepTime}
                  onChange={handleChange}
                  placeholder="15"
                  className="form-input"
                  min="0"
                />
              </div>
              <div>
                <label
                  htmlFor="cookTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Cook Time (min)
                </label>
                <input
                  type="number"
                  id="cookTime"
                  name="cookTime"
                  value={formData.cookTime}
                  onChange={handleChange}
                  placeholder="45"
                  className="form-input"
                  min="0"
                />
              </div>
              <div>
                <label
                  htmlFor="servings"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Servings
                </label>
                <input
                  type="text"
                  id="servings"
                  name="servings"
                  value={formData.servings}
                  onChange={handleChange}
                  placeholder="8"
                  className="form-input"
                />
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <label
                htmlFor="ingredients"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Ingredients <span className="text-red-500">*</span>
              </label>
              <textarea
                id="ingredients"
                name="ingredients"
                value={formData.ingredients}
                onChange={handleChange}
                placeholder="2 cups all-purpose flour
1 tsp salt
1 cup butter, cold
..."
                className="form-textarea font-mono text-sm"
                rows={8}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                One ingredient per line
              </p>
            </div>

            {/* Instructions */}
            <div>
              <label
                htmlFor="instructions"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Instructions <span className="text-red-500">*</span>
              </label>
              <textarea
                id="instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                placeholder="Preheat oven to 375°F (190°C).

Mix flour and salt in a large bowl.

Cut in the cold butter until mixture resembles coarse crumbs.
..."
                className="form-textarea"
                rows={12}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate each step with a blank line
              </p>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Tips, variations, or special instructions..."
                className="form-textarea"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving || uploadingImage ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {uploadingImage ? "Uploading image..." : "Saving..."}
                  </span>
                ) : existingRecipe ? (
                  "Update Recipe"
                ) : (
                  "Save Recipe"
                )}
              </button>

              {existingRecipe && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium
                           hover:bg-red-600 active:bg-red-700
                           transition-colors focus:outline-none focus:ring-2 focus:ring-red-400
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Recipe
                </button>
              )}

              <Link to="/" className="btn-outline text-center">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sage-500 text-sm">
            Changes will be saved to your GitHub repository
          </p>
        </div>
      </footer>
    </div>
  );
}
