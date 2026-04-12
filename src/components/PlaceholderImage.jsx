/**
 * PlaceholderImage component for recipes without a photo.
 * A food-themed SVG illustration using the site's color palette.
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes forwarded to the svg element
 */
export default function PlaceholderImage({ className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 300"
      className={className}
      aria-hidden="true"
    >
      {/* Background */}
      <rect width="400" height="300" fill="#f4f7f4" />

      {/* Plate */}
      <circle cx="200" cy="150" r="80" fill="#fff8f0" stroke="#e6ebe6" strokeWidth="3" />
      <circle cx="200" cy="150" r="68" fill="none" stroke="#e6ebe6" strokeWidth="1.5" />

      {/* Fork (left of plate) */}
      <g transform="translate(102, 95)" fill="#7d9b7d">
        {/* Handle */}
        <rect x="10" y="70" width="6" height="45" rx="3" />
        {/* Neck */}
        <rect x="11" y="48" width="4" height="24" rx="2" />
        {/* Tines */}
        <rect x="8"  y="18" width="2.5" height="22" rx="1.25" />
        <rect x="12" y="18" width="2.5" height="22" rx="1.25" />
        <rect x="16" y="18" width="2.5" height="22" rx="1.25" />
      </g>

      {/* Knife (right of plate) */}
      <g transform="translate(282, 95)" fill="#7d9b7d">
        {/* Handle */}
        <rect x="10" y="70" width="6" height="45" rx="3" />
        {/* Blade */}
        <path d="M11 20 Q20 30 16 70 L11 70 Z" />
      </g>

      {/* Terracotta accent — small dot on plate */}
      <circle cx="200" cy="150" r="10" fill="#e4724d" opacity="0.25" />
      <circle cx="200" cy="150" r="5"  fill="#e4724d" opacity="0.45" />
    </svg>
  );
}
