import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchRecipes } from "../lib/github";
import { searchAndFilter, getAllTags, initializeSearch } from "../lib/search";
import SearchBar from "../components/SearchBar";
import TagFilter from "../components/TagFilter";
import RecipeCard from "../components/RecipeCard";

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
        setError("Failed to load recipes. Please try again later.");
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
                Mom's Recipe Book
              </h1>
            </Link>
            <Link
              to="/admin"
              className="text-sage-600 hover:text-sage-800 transition-colors flex items-center gap-2"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="hidden sm:inline">Add Recipe</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-sage-100 to-cream py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-sage-800 mb-4">
            Family Recipes
          </h2>
          <p className="text-sage-600 text-lg mb-8 max-w-2xl mx-auto">
            A collection of our favorite family recipes, passed down through generations
            and lovingly preserved for everyone to enjoy.
          </p>

          {/* Search Bar */}
          <div className="flex justify-center mb-6">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search by name, ingredient, or tag..."
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
            <p className="text-sage-600">Loading recipes...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😕</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Oops! Something went wrong
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && recipes.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No recipes yet
            </h3>
            <p className="text-gray-600 mb-4">
              Be the first to add a family recipe!
            </p>
            <Link to="/admin" className="btn-primary inline-block">
              Add First Recipe
            </Link>
          </div>
        )}

        {/* No Search Results */}
        {!loading && !error && recipes.length > 0 && filteredRecipes.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No recipes found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveTag("all");
              }}
              className="btn-outline"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Recipe Grid */}
        {!loading && !error && filteredRecipes.length > 0 && (
          <>
            {/* Results count */}
            <div className="mb-6 text-sage-600">
              Showing {filteredRecipes.length} recipe
              {filteredRecipes.length !== 1 ? "s" : ""}
              {activeTag !== "all" && ` tagged "${activeTag}"`}
              {searchQuery && ` matching "${searchQuery}"`}
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
            Made with ❤️ for the family • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
