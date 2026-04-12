import { useState, useEffect } from "react";

/**
 * TagFilter component for filtering recipes by tags.
 * Supports both normal mode (dynamic tag list) and autocomplete mode (#-prefix search).
 * @param {Object} props
 * @param {Array<string>} props.tags - Available tags to display
 * @param {Array<string>} props.activeTags - Currently selected tags (shown as chips in search bar)
 * @param {Function} props.onTagSelect - Called with a tag string when clicked
 * @param {Function} props.onReset - Called when "Toutes" is clicked
 * @param {boolean} [props.autocompleteMode] - When true, shows autocomplete suggestions
 * @param {string} [props.tagPrefix] - The prefix typed after # (used for the hint label)
 */
export default function TagFilter({ tags, activeTags = [], onTagSelect, onReset, autocompleteMode = false, tagPrefix = "" }) {
  const [showAll, setShowAll] = useState(false);

  // Reset show-all when switching modes or tag list changes
  useEffect(() => {
    setShowAll(false);
  }, [autocompleteMode]);

  const VISIBLE_COUNT = 8;
  const displayedTags = autocompleteMode || showAll ? tags : tags.slice(0, VISIBLE_COUNT);
  const hasMore = !autocompleteMode && tags.length > VISIBLE_COUNT;

  if (!tags || tags.length === 0) {
    if (autocompleteMode) {
      return (
        <div className="text-sm text-sage-500 italic">
          Aucun tag ne correspond à « #{tagPrefix} »
        </div>
      );
    }
    return null;
  }

  const isReset = activeTags.length === 0;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {autocompleteMode ? (
        /* Autocomplete mode: hint label instead of "Toutes" */
        <span className="text-sm text-sage-500 italic mr-1">
          Tags{tagPrefix ? ` pour « #${tagPrefix} »` : ""} :
        </span>
      ) : (
        /* Normal mode: "Toutes" reset button */
        <button
          onClick={onReset}
          className={`tag-pill ${isReset ? "active" : ""}`}
          aria-pressed={isReset}
        >
          Toutes
        </button>
      )}

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

      {/* Show more/less — only in normal mode */}
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
