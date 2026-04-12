import { useState } from "react";

/**
 * TagFilter component for filtering recipes by tags
 * @param {Object} props
 * @param {Array<string>} props.tags - Available tags (already filtered to match current results)
 * @param {Array<string>} props.activeTags - Currently selected tags (shown as chips in search bar)
 * @param {Function} props.onTagSelect - Called with a tag string when clicked
 * @param {Function} props.onReset - Called when "Toutes" is clicked
 */
export default function TagFilter({ tags, activeTags = [], onTagSelect, onReset }) {
  const [showAll, setShowAll] = useState(false);

  const VISIBLE_COUNT = 8;
  const displayedTags = showAll ? tags : tags.slice(0, VISIBLE_COUNT);
  const hasMore = tags.length > VISIBLE_COUNT;

  if (!tags || tags.length === 0) {
    return null;
  }

  const isReset = activeTags.length === 0;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* "All" button */}
      <button
        onClick={onReset}
        className={`tag-pill ${isReset ? "active" : ""}`}
        aria-pressed={isReset}
      >
        Toutes
      </button>

      {/* Tag buttons */}
      {displayedTags.map((tag) => (
        <button
          key={tag}
          onClick={() => onTagSelect(tag)}
          className="tag-pill capitalize"
          aria-pressed={false}
        >
          {tag}
        </button>
      ))}

      {/* Show more/less */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-sage-600 hover:text-sage-800 underline transition-colors"
        >
          {showAll ? "Voir moins" : `+${tags.length - VISIBLE_COUNT} de plus`}
        </button>
      )}
    </div>
  );
}
