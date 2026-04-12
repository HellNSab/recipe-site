import { useState, useEffect, useRef } from "react";

/**
 * SearchBar component with inline tag chips
 * @param {Object} props
 * @param {Function} props.onSearch - Callback with the current text query
 * @param {string} [props.placeholder]
 * @param {string} [props.value] - Controlled text value (for external resets)
 * @param {Array<string>} [props.activeTags] - Tags displayed as chips inside the bar
 * @param {Function} [props.onTagRemove] - Called with a tag string when its chip × is clicked
 */
export default function SearchBar({
  onSearch,
  placeholder = "Search recipes...",
  value = "",
  activeTags = [],
  onTagRemove,
}) {
  const [query, setQuery] = useState(value);
  const timeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Sync internal state when external value changes (e.g. reset)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timeoutRef.current);
  }, [query, onSearch]);

  const handleChange = (e) => setQuery(e.target.value);

  const handleClearText = () => {
    setQuery("");
    onSearch("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const hasText = query.length > 0;

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
      <div
        className="flex items-start gap-1.5 pl-10 pr-10 py-2.5 border border-sage-300 rounded-2xl
                   bg-white shadow-sm focus-within:ring-2 focus-within:ring-sage-400
                   focus-within:border-transparent transition-all duration-200 min-h-[46px]
                   cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Search icon — fixed top-left */}
        <div className="absolute left-3 top-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-sage-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Chips + input */}
        <div className="flex flex-wrap gap-1.5 flex-1 items-center min-w-0">
          {activeTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 bg-sage-100 text-sage-700 rounded-full text-sm font-medium flex-shrink-0"
            >
              <span className="capitalize">{tag}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onTagRemove?.(tag); }}
                className="cursor-pointer text-sage-500 hover:text-sage-800 transition-colors leading-none"
                aria-label={`Retirer le tag ${tag}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder={activeTags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[80px] bg-transparent outline-none placeholder-sage-400 text-gray-800 py-0.5"
            aria-label="Rechercher des recettes"
          />
        </div>

        {/* Clear text button */}
        {hasText && (
          <button
            type="button"
            onClick={handleClearText}
            className="absolute right-3 top-3 text-sage-400 hover:text-sage-600 transition-colors"
            aria-label="Effacer la recherche"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
