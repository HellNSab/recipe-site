import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchRecipe } from "../lib/github";

/**
 * Recipe detail page component
 * Displays full recipe with image, ingredients, and instructions
 */
export default function Recipe() {
  const { slug } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);

  // Fetch recipe on mount
  useEffect(() => {
    async function loadRecipe() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRecipe(slug);
        if (!data) {
          setError("Recipe not found");
        } else {
          setRecipe(data);
        }
      } catch (err) {
        console.error("Failed to load recipe:", err);
        setError("Failed to load recipe. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadRecipe();
    }
  }, [slug]);

  // Adjust ingredient quantity based on servings multiplier
  const adjustQuantity = (quantity) => {
    if (!quantity || isNaN(parseFloat(quantity))) return quantity;
    const adjusted = parseFloat(quantity) * servingsMultiplier;
    // Round to 2 decimal places and remove trailing zeros
    return parseFloat(adjusted.toFixed(2)).toString();
  };

  // Parse ingredient string to extract quantity
  const parseIngredient = (ingredient) => {
    // Try to match patterns like "2 cups flour" or "1/2 tsp salt"
    const match = ingredient.match(/^([\d./]+)\s*(.*)$/);
    if (match) {
      return {
        quantity: match[1],
        rest: match[2],
      };
    }
    return { quantity: null, rest: ingredient };
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: recipe.description,
          url: window.location.href,
        });
      } catch {
        console.log("Share cancelled or failed");
      }
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
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

  const {
    title,
    description,
    image,
    tags = [],
    prepTime,
    cookTime,
    servings,
    ingredients = [],
    instructions = "",
    notes,
    createdAt,
    updatedAt,
  } = recipe;

  const totalTime =
    prepTime && cookTime
      ? `${parseInt(prepTime) + parseInt(cookTime)} min`
      : null;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 no-print">
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
              <button
                onClick={handleShare}
                className="p-2 text-sage-600 hover:text-sage-800 hover:bg-sage-100 rounded-full transition-colors"
                aria-label="Partager la recette"
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
              <button
                onClick={handlePrint}
                className="p-2 text-sage-600 hover:text-sage-800 hover:bg-sage-100 rounded-full transition-colors"
                aria-label="Imprimer la recette"
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
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
              </button>
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
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title and Meta */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            {title}
          </h1>

          {description && (
            <p className="text-lg text-gray-600 mb-4">{description}</p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
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

          {/* Time and Servings Info */}
          <div className="flex flex-wrap gap-4 text-sage-700">
            {prepTime && (
              <div className="flex items-center gap-2">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <strong>Prép. :</strong> {prepTime} min
                </span>
              </div>
            )}
            {cookTime && (
              <div className="flex items-center gap-2">
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
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                  />
                </svg>
                <span>
                  <strong>Cuisson :</strong> {cookTime} min
                </span>
              </div>
            )}
            {totalTime && (
              <div className="flex items-center gap-2 text-terracotta-600 font-medium">
                <span>
                  <strong>Total :</strong> {totalTime}
                </span>
              </div>
            )}
            {servings && (
              <div className="flex items-center gap-2">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span>
                  <strong>Portions :</strong> {servings}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout for Ingredients and Instructions */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-md sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-2xl font-bold text-gray-800">
                  Ingrédients
                </h2>
                {/* Servings Adjuster */}
                {servings && (
                  <div className="flex items-center gap-1 no-print">
                    <button
                      onClick={() =>
                        setServingsMultiplier(Math.max(0.5, servingsMultiplier - 0.5))
                      }
                      className="w-6 h-6 rounded-full bg-sage-100 text-sage-700 hover:bg-sage-200 flex items-center justify-center transition-colors"
                      aria-label="Réduire les portions"
                    >
                      -
                    </button>
                    <span className="text-sm font-medium text-sage-700 min-w-[2rem] text-center">
                      {servingsMultiplier}x
                    </span>
                    <button
                      onClick={() => setServingsMultiplier(servingsMultiplier + 0.5)}
                      className="w-6 h-6 rounded-full bg-sage-100 text-sage-700 hover:bg-sage-200 flex items-center justify-center transition-colors"
                      aria-label="Augmenter les portions"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              <ul className="ingredient-list space-y-2">
                {ingredients.map((ingredient, index) => {
                  const { quantity, rest } = parseIngredient(ingredient);
                  return (
                    <li key={index} className="text-gray-700">
                      {quantity ? (
                        <>
                          <span className="font-medium">
                            {adjustQuantity(quantity)}
                          </span>{" "}
                          {rest}
                        </>
                      ) : (
                        ingredient
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Instructions */}
          <div className="md:col-span-2">
            <h2 className="font-serif text-2xl font-bold text-gray-800 mb-4">
              Préparation
            </h2>

            <p className="text-gray-700 leading-relaxed">{instructions}</p>

            {/* Notes */}
            {notes && (
              <div className="mt-8 p-4 bg-terracotta-50 rounded-xl border border-terracotta-200">
                <h3 className="font-serif text-lg font-semibold text-terracotta-800 mb-2">
                  📝 Notes & astuces
                </h3>
                <p className="text-terracotta-700">{notes}</p>
              </div>
            )}

            {/* Metadata */}
            {(createdAt || updatedAt) && (
              <div className="mt-8 pt-4 border-t border-sage-200 text-sm text-sage-500">
                {createdAt && (
                  <p>Ajoutée le {new Date(createdAt).toLocaleDateString("fr-FR")}</p>
                )}
                {updatedAt && updatedAt !== createdAt && (
                  <p>Mise à jour le {new Date(updatedAt).toLocaleDateString("fr-FR")}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-sage-200 py-8 mt-12 no-print">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Link to="/" className="text-sage-600 hover:text-sage-800">
            ← Toutes les recettes
          </Link>
        </div>
      </footer>
    </div>
  );
}
