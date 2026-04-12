import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
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
    image: "",
    tags: "",
    ingredients: "",
    instructions: "",
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

  // Markdown editor state
  const [showPreview, setShowPreview] = useState(false);
  const instructionsRef = useRef(null);

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
            image: recipe.image || "",
            tags: recipe.tags?.join(", ") || "",
            ingredients: recipe.ingredients?.join("\n") || "",
            instructions: recipe.instructions || "",
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

  // Insert markdown syntax around selection in the instructions textarea
  const insertMarkdown = useCallback((prefix, suffix = "") => {
    const textarea = instructionsRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = formData.instructions.slice(start, end);
    const before = formData.instructions.slice(0, start);
    const after = formData.instructions.slice(end);

    let newText;
    let newCursorStart;
    let newCursorEnd;

    if (suffix) {
      // Inline format: wrap selection
      newText = before + prefix + selected + suffix + after;
      newCursorStart = start + prefix.length;
      newCursorEnd = end + prefix.length;
    } else {
      // Block format (list): prefix each line
      const lines = (selected || "élément").split("\n");
      const prefixed = lines.map((l) => prefix + l).join("\n");
      newText = before + prefixed + after;
      newCursorStart = start + prefix.length;
      newCursorEnd = start + prefixed.length;
    }

    setFormData((prev) => ({ ...prev, instructions: newText }));

    // Restore focus and selection after state update
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    });
  }, [formData.instructions]);

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
        image: imageUrl,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t),
        ingredients: formData.ingredients
          .split("\n")
          .map((i) => i.trim())
          .filter((i) => i),
        instructions: formData.instructions.trim(),
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

            {/* Instructions with Markdown toolbar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="instructions"
                  className="block text-sm font-medium text-gray-700"
                >
                  Préparation <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="text-xs text-sage-600 hover:text-sage-800 border border-sage-300 rounded px-2 py-0.5 transition-colors"
                >
                  {showPreview ? "✏️ Éditer" : "👁 Aperçu"}
                </button>
              </div>

              {/* Formatting toolbar */}
              {!showPreview && (
                <div className="flex gap-1 mb-1 p-1 bg-gray-50 border border-gray-200 rounded-t-lg border-b-0">
                  <button
                    type="button"
                    onClick={() => insertMarkdown("**", "**")}
                    className="px-2 py-1 text-sm font-bold text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    title="Gras"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("*", "*")}
                    className="px-2 py-1 text-sm italic text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    title="Italique"
                  >
                    I
                  </button>
                  <div className="w-px bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertMarkdown("- ")}
                    className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    title="Liste à puces"
                  >
                    • Liste
                  </button>
                  <div className="w-px bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertMarkdown("## ")}
                    className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    title="Titre"
                  >
                    Titre
                  </button>
                </div>
              )}

              {showPreview ? (
                <div className="form-textarea min-h-[18rem] bg-gray-50 overflow-auto">
                  {formData.instructions ? (
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="font-serif text-xl font-bold text-gray-800 mt-4 mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="font-serif text-lg font-bold text-gray-800 mt-3 mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="font-serif font-semibold text-gray-800 mt-2 mb-1">{children}</h3>,
                        p: ({ children }) => <p className="text-gray-700 leading-relaxed mb-3">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-gray-700">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-700">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      }}
                    >
                      {formData.instructions}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 italic">Rien à afficher…</p>
                  )}
                </div>
              ) : (
                <textarea
                  ref={instructionsRef}
                  id="instructions"
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  placeholder="Supporte le Markdown : **gras**, *italique*, - listes, ## titres…"
                  className="form-textarea rounded-t-none"
                  rows={12}
                  required
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                Markdown supporté — utilisez la barre ci-dessus ou écrivez directement
              </p>
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
