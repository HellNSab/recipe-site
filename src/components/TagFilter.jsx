import { useState } from "react";

/**
 * TagFilter component for filtering recipes by tags
 * @param {Object} props
 * @param {Array<string>} props.tags - Array of available tags
 * @param {string} props.activeTag - Currently selected tag
 * @param {Function} props.onTagSelect - Callback when tag is selected
 */
export default function TagFilter({ tags, activeTag, onTagSelect }) {
  const [showAll, setShowAll] = useState(false);

  // Number of tags to show before "Show more" button
  const VISIBLE_COUNT = 8;

  const displayedTags = showAll ? tags : tags.slice(0, VISIBLE_COUNT);
  const hasMore = tags.length > VISIBLE_COUNT;

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* "All" button */}
      <button
        onClick={() => onTagSelect("all")}
        className={`tag-pill ${
          !activeTag || activeTag === "all" ? "active" : ""
        }`}
        aria-pressed={!activeTag || activeTag === "all"}
      >
        All Recipes
      </button>

      {/* Tag buttons */}
      {displayedTags.map((tag) => (
        <button
          key={tag}
          onClick={() => onTagSelect(tag)}
          className={`tag-pill capitalize ${
            activeTag === tag ? "active" : ""
          }`}
          aria-pressed={activeTag === tag}
        >
          {tag}
        </button>
      ))}

      {/* Show more/less button */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-sage-600 hover:text-sage-800 underline transition-colors"
        >
          {showAll ? "Show less" : `+${tags.length - VISIBLE_COUNT} more`}
        </button>
      )}
    </div>
  );
}
