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
import { isAuthenticated, logout, getToken } from "../lib/auth";

/**
 * Admin page component
 * Password-gated form for adding and editing recipes
 */
export default function Admin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editSlug = searchParams.get("edit");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
    }
  }, [navigate]);

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
      if (!editSlug || !isAuthenticated()) return;

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
            instructions: recipe.instructions || "",
            notes: recipe.notes || "",
          });
          setImagePreview(recipe.image || "");
        } else {
          setError("Recette introuvable");
        }
      } catch (err) {
        console.error("Failed to load recipe:", err);
        setError("Impossible de charger la recette pour modification");
      } finally {
        setLoading(false);
      }
    }

    loadRecipe();
  }, [editSlug]);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate("/");
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
      setError("Veuillez sélectionner un fichier image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("La photo doit faire moins de 5 Mo");
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
      setError("Le titre est obligatoire");
      return;
    }

    if (!formData.ingredients.trim()) {
      setError("Les ingrédients sont obligatoires");
      return;
    }

    if (!formData.instructions.trim()) {
      setError("La préparation est obligatoire");
      return;
    }

    setSaving(true);

    try {
      const authToken = getToken();
      if (!authToken) {
        setError("Session expirée. Veuillez vous reconnecter.");
        navigate("/");
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
          setError("Échec de l'envoi de la photo. Recette enregistrée sans image.");
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
        instructions: formData.instructions.trim(),
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
          ? "Recette mise à jour !"
          : "Recette créée avec succès !"
      );

      // Clear form and redirect after a short delay
      setTimeout(() => {
        navigate(`/recipe/${slug}`);
      }, 1500);
    } catch (err) {
      console.error("Failed to save recipe:", err);
      setError(err.message || "Impossible d'enregistrer la recette. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!existingRecipe) return;

    const confirmed = window.confirm(
      `Supprimer "${existingRecipe.title}" ? Cette action est irréversible.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      const authToken = getToken();
      if (!authToken) {
        setError("Session expirée. Veuillez vous reconnecter.");
        navigate("/");
        return;
      }

      await deleteRecipe(existingRecipe.slug, authToken, existingRecipe._sha);
      setSuccess("Recette supprimée avec succès !");

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      console.error("Failed to delete recipe:", err);
      setError(err.message || "Impossible de supprimer la recette. Veuillez réessayer.");
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-sage-600">Chargement de la recette...</p>
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
              <span>Retour</span>
            </Link>

            <button
              onClick={handleLogout}
              className="text-sm text-terracotta-600 hover:text-terracotta-800 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h1 className="font-serif text-3xl font-bold text-gray-800 mb-6">
            {existingRecipe ? "Modifier la recette" : "Ajouter une recette"}
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
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Tarte aux pommes de mamie"
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
                placeholder="Une courte description de la recette..."
                className="form-textarea"
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photo
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
                    aria-label="Supprimer la photo"
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
                    Glissez-déposez une photo ici, ou cliquez pour en choisir une
                  </p>
                  <p className="text-sm text-sage-400">
                    PNG, JPG ou WebP · 5 Mo max
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
                placeholder="dessert, fêtes, recette de famille"
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Séparer les tags par des virgules
              </p>
            </div>

            {/* Time and Servings Row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="prepTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Préparation (min)
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
                  Cuisson (min)
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
                  Portions
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
                Ingrédients <span className="text-red-500">*</span>
              </label>
              <textarea
                id="ingredients"
                name="ingredients"
                value={formData.ingredients}
                onChange={handleChange}
                placeholder="2 tasses de farine
1 c. à café de sel
1 tasse de beurre froid
..."
                className="form-textarea font-mono text-sm"
                rows={8}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Un ingrédient par ligne
              </p>
            </div>

            {/* Instructions */}
            <div>
              <label
                htmlFor="instructions"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Préparation <span className="text-red-500">*</span>
              </label>
              <textarea
                id="instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                placeholder="Préchauffez le four à 190 °C. Mélangez la farine et le sel dans un grand bol. Incorporez le beurre froid jusqu'à obtenir une texture sablée..."
                className="form-textarea"
                rows={12}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Rédigez la préparation en texte libre
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
                placeholder="Conseils, variantes, astuces..."
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
                    {uploadingImage ? "Envoi de la photo..." : "Enregistrement..."}
                  </span>
                ) : existingRecipe ? (
                  "Mettre à jour"
                ) : (
                  "Enregistrer"
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
                  Supprimer
                </button>
              )}

              <Link to="/" className="btn-outline text-center">
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sage-500 text-sm">
            Les modifications seront enregistrées sur votre dépôt GitHub
          </p>
        </div>
      </footer>
    </div>
  );
}
