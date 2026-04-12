import { Link } from "react-router-dom";

/**
 * RecipeCard component for displaying recipe previews in a grid
 * @param {Object} props
 * @param {Object} props.recipe - The recipe object
 * @param {string} props.recipe.slug - URL-friendly identifier
 * @param {string} props.recipe.title - Recipe title
 * @param {string} props.recipe.description - Short description
 * @param {string} props.recipe.image - Image URL
 * @param {Array<string>} props.recipe.tags - Array of tags
 * @param {string} props.recipe.prepTime - Preparation time
 * @param {string} props.recipe.cookTime - Cooking time
 */
function RecipeCard({ recipe }) {
  const { slug, title, description, image, tags = [], prepTime, cookTime } = recipe;

  // Calculate total time if both prep and cook times are available
  const totalTime = prepTime && cookTime ? `${parseInt(prepTime) + parseInt(cookTime)} min` : prepTime || cookTime;

  // Build image URL from public/images folder, with fallback
  const imageUrl = image
    ? `${import.meta.env.BASE_URL}images/${encodeURIComponent(image)}`
    : "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&q=80";

  return (
    <Link
      to={{ search: `?recipe=${slug}` }}
      className="recipe-card block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
        {/* Time badge */}
        {totalTime && (
          <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-medium text-sage-700 flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
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
            {totalTime}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-serif text-xl font-semibold text-gray-800 mb-2 line-clamp-1">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-sage-100 text-sage-700 rounded-full"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export default RecipeCard;
