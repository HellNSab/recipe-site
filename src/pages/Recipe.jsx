import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { fetchRecipe, deleteRecipe } from "../lib/github";
import { isAuthenticated, logout, getToken } from "../lib/auth";
import AdminLoginModal from "../components/AdminLoginModal";

// Tailwind-styled components for ReactMarkdown
const markdownComponents = {
  h1: ({ children }) => <h1 className="font-serif text-2xl font-bold text-gray-800 mt-6 mb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="font-serif text-xl font-bold text-gray-800 mt-5 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="font-serif text-lg font-semibold text-gray-800 mt-4 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-gray-700 leading-relaxed mb-3">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-gray-700">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-700">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
};

/**
 * Recipe detail page component
 * Displays full recipe with image, ingredients, and instructions
 */
export default function Recipe() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(isAuthenticated);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Fetch recipe on mount
  useEffect(() => {
    async function loadRecipe() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRecipe(slug);
        if (!data) {
          setError("Recette introuvable");
        } else {
          setRecipe(data);
        }
      } catch (err) {
        console.error("Failed to load recipe:", err);
        setError("Impossible de charger la recette. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadRecipe();
    }
  }, [slug]);

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer "${recipe.title}" ? Cette action est irréversible.`)) return;
    try {
      await deleteRecipe(recipe.slug, getToken(), recipe._sha);
      navigate("/");
    } catch (err) {
      console.error("Failed to delete recipe:", err);
    }
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

  // Error state
  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">
            {error || "Recette introuvable"}
          </h2>
          <p className="text-gray-600 mb-6">
            Nous n'avons pas trouvé la recette que vous cherchez.
          </p>
          <Link to="/" className="btn-primary inline-block">
            Retour aux recettes
          </Link>
        </div>
      </div>
    );
  }

  const { title, image, tags = [], ingredients = [], instructions = "" } = recipe;

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
              <span>Retour aux recettes</span>
            </Link>

            <div className="flex items-center gap-2">
              {isAdmin && recipe && (
                <>
                  <Link
                    to={`/admin?edit=${recipe.slug}`}
                    className="text-sm text-sage-600 hover:text-sage-800 transition-colors px-2 py-1 rounded hover:bg-sage-100"
                  >
                    Modifier
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="text-sm text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </>
              )}
              {isAdmin ? (
                <button
                  onClick={() => { logout(); setIsAdmin(false); }}
                  className="text-sm text-terracotta-600 hover:text-terracotta-800 transition-colors px-2 py-1"
                >
                  Se déconnecter
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="text-sm text-sage-500 hover:text-sage-700 transition-colors px-2 py-1"
                >
                  Connexion
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Recipe Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Image */}
        {image && (
          <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8 shadow-lg">
            <img
              src={`${import.meta.env.BASE_URL}images/${encodeURIComponent(image)}`}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          {title}
        </h1>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {tags.map((tag) => (
              <Link
                key={tag}
                to={`/?tag=${encodeURIComponent(tag)}`}
                className="tag-pill"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Two Column Layout for Ingredients and Instructions */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-md sticky top-24">
              <h2 className="font-serif text-2xl font-bold text-gray-800 mb-4">
                Ingrédients
              </h2>
              <ul className="ingredient-list space-y-2">
                {ingredients.map((ingredient, index) => (
                  <li key={index} className="text-gray-700">
                    {ingredient}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Instructions */}
          <div className="md:col-span-2">
            <h2 className="font-serif text-2xl font-bold text-gray-800 mb-4">
              Préparation
            </h2>
            <ReactMarkdown components={markdownComponents}>
              {instructions}
            </ReactMarkdown>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-sage-200 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Link to="/" className="text-sage-600 hover:text-sage-800">
            ← Toutes les recettes
          </Link>
        </div>
      </footer>

      {showLoginModal && (
        <AdminLoginModal
          onSuccess={() => { setIsAdmin(true); setShowLoginModal(false); }}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
}
