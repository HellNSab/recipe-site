import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchRecipes } from "../lib/github";
import { searchAndFilter, getAllTags, initializeSearch } from "../lib/search";
import { isAuthenticated, logout } from "../lib/auth";
import SearchBar from "../components/SearchBar";
import TagFilter from "../components/TagFilter";
import RecipeCard from "../components/RecipeCard";
import AdminLoginModal from "../components/AdminLoginModal";

/**
 * Home page component
 * Displays a grid of recipes with search and tag filtering
 */
export default function Home() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [isAdmin, setIsAdmin] = useState(isAuthenticated);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Fetch recipes on mount
  useEffect(() => {
    async function loadRecipes() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRecipes();
        setRecipes(data);
        // Initialize search index
        initializeSearch(data);
      } catch (err) {
        console.error("Failed to load recipes:", err);
        setError("Impossible de charger les recettes. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    }

    loadRecipes();
  }, []);

  // Get all unique tags from recipes
  const allTags = useMemo(() => getAllTags(recipes), [recipes]);

  // Filter and search recipes
  const filteredRecipes = useMemo(() => {
    return searchAndFilter(recipes, searchQuery, activeTag);
  }, [recipes, searchQuery, activeTag]);

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Handle tag selection
  const handleTagSelect = (tag) => {
    setActiveTag(tag);
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <span className="text-3xl">🍳</span>
              <h1 className="font-serif text-2xl font-bold text-sage-700">
                Le Livre de Recettes
              </h1>
            </Link>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-sage-600 hover:text-sage-800 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Ajouter une recette</span>
                </Link>
              )}
              {isAdmin ? (
                <button
                  onClick={() => { logout(); setIsAdmin(false); }}
                  className="text-sm text-terracotta-600 hover:text-terracotta-800 transition-colors"
                >
                  Se déconnecter
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="text-sm text-sage-600 hover:text-sage-800 transition-colors"
                >
                  Connexion
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-sage-100 to-cream py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-sage-800 mb-4">
            Nos Recettes
          </h2>
          <p className="text-sage-600 text-lg mb-8 max-w-2xl mx-auto">
            Une collection de recettes familiales, transmises de génération en génération
            et précieusement conservées pour tous.
          </p>

          {/* Search Bar */}
          <div className="flex justify-center mb-6">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Rechercher par nom, ingrédient ou tag..."
            />
          </div>

          {/* Tag Filter */}
          <div className="flex justify-center">
            <TagFilter
              tags={allTags}
              activeTag={activeTag}
              onTagSelect={handleTagSelect}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner mb-4"></div>
            <p className="text-sage-600">Chargement des recettes...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😕</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Oups ! Une erreur est survenue
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && recipes.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Aucune recette pour l'instant
            </h3>
            <p className="text-gray-600 mb-4">
              Soyez la première à ajouter une recette !
            </p>
            {isAdmin && (
              <Link to="/admin" className="btn-primary inline-block">
                Ajouter une recette
              </Link>
            )}
          </div>
        )}

        {/* No Search Results */}
        {!loading && !error && recipes.length > 0 && filteredRecipes.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Aucune recette trouvée
            </h3>
            <p className="text-gray-600 mb-4">
              Essayez de modifier votre recherche ou vos filtres
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveTag("all");
              }}
              className="btn-outline"
            >
              Effacer les filtres
            </button>
          </div>
        )}

        {/* Recipe Grid */}
        {!loading && !error && filteredRecipes.length > 0 && (
          <>
            {/* Results count */}
            <div className="mb-6 text-sage-600">
              {filteredRecipes.length} recette
              {filteredRecipes.length !== 1 ? "s" : ""}
              {activeTag !== "all" && ` · tag « ${activeTag} »`}
              {searchQuery && ` · « ${searchQuery} »`}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe.slug} recipe={recipe} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-sage-200 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sage-500 text-sm">
            Fait avec ❤️ pour la famille • {new Date().getFullYear()}
          </p>
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
