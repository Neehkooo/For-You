import { getSnowmanPalette } from '../lib/themes.js';

// Seasonal snowman delivery — available for its 15-day December window only.
// `stage` drives the animation: closed -> opening (flap opens, scarf lifts, snow swirls)
// -> open (letter visible) -> emerge (letter floats up and the snow settles).
export default function SnowmanDelivery({ stage = 'closed', onOpen, small = false, className = '' }) {
  const palette = getSnowmanPalette();
  const tappable = typeof onOpen === 'function' && stage === 'closed';
  const activate = () => {
    if (tappable) onOpen();
  };

  const isAwake = stage !== 'closed';

  return (
    <div
      className={`snowman-delivery ${small ? 'snowman-delivery-sm' : ''} ${tappable ? 'snowman-delivery-tap' : ''} ${className}`}
      data-stage={stage}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      aria-label={tappable ? 'Open the letter from the snowman' : undefined}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
    >
      <svg
        viewBox="0 0 200 220"
        className="snowman-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Snow mound the snowman stands on */}
        <ellipse cx="100" cy="200" rx="74" ry="14" fill={palette.mound} />
        <ellipse cx="100" cy="197" rx="60" ry="10" fill={palette.snow} opacity="0.85" />

        {/* Twig arms (behind the envelope) */}
        <g className="snowman-arm-left">
          <path d="M 70 118 L 40 100" stroke={palette.branch} strokeWidth="3" strokeLinecap="round" />
          <path d="M 52 107 L 44 92 M 44 101 L 34 98" stroke={palette.branch} strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <g className="snowman-arm-right">
          <path d="M 130 118 L 160 100" stroke={palette.branch} strokeWidth="3" strokeLinecap="round" />
          <path d="M 148 107 L 156 92 M 156 101 L 166 98" stroke={palette.branch} strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* Three stacked snowballs */}
        <circle cx="100" cy="162" r="44" fill={palette.snow} stroke={palette.shade} strokeWidth="2" />
        <circle cx="100" cy="118" r="32" fill={palette.snow} stroke={palette.shade} strokeWidth="1.8" />
        <circle className="snowman-head" cx="100" cy="76" r="24" fill={palette.snow} stroke={palette.shade} strokeWidth="1.8" />

        {/* Soft shading on the snowballs */}
        <path d="M 64 176 C 74 190, 126 190, 136 176 C 128 194, 72 194, 64 176 Z" fill={palette.shade} opacity="0.45" />
        <path d="M 76 128 C 84 140, 116 140, 124 128 C 116 143, 84 143, 76 128 Z" fill={palette.shade} opacity="0.35" />

        {/* Coal buttons */}
        <circle cx="100" cy="140" r="3" fill={palette.coal} />
        <circle cx="100" cy="154" r="3" fill={palette.coal} />
        <circle cx="100" cy="168" r="3" fill={palette.coal} />

        {/* Face */}
        <g className="snowman-face">
          {!isAwake ? (
            <>
              <circle cx="91" cy="72" r="3" fill={palette.coal} />
              <circle cx="109" cy="72" r="3" fill={palette.coal} />
              <circle cx="90" cy="71" r="1" fill="#ffffff" />
              <circle cx="108" cy="71" r="1" fill="#ffffff" />
            </>
          ) : (
            <>
              <path d="M 86 73 Q 91 68 96 73" fill="none" stroke={palette.coal} strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 104 73 Q 109 68 114 73" fill="none" stroke={palette.coal} strokeWidth="2.2" strokeLinecap="round" />
            </>
          )}
          {/* Carrot nose */}
          <polygon points="100,78 118,82 100,86" fill="#f97316" stroke="#c2410c" strokeWidth="0.8" />
          {/* Coal smile */}
          <path
            d="M 92 90 Q 96 94 100 90 Q 104 94 108 90"
            fill="none"
            stroke={palette.coal}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Rosy cheeks */}
          <ellipse cx="85" cy="82" rx="5" ry="3" fill="#fda4af" opacity="0.5" />
          <ellipse cx="115" cy="82" rx="5" ry="3" fill="#fda4af" opacity="0.5" />
        </g>

        {/* Top hat */}
        <g className="snowman-hat">
          <rect x="80" y="30" width="40" height="28" rx="4" fill={palette.hat} stroke={palette.hatShade} strokeWidth="1.5" />
          <rect x="80" y="46" width="40" height="7" fill={palette.ribbon} />
          <rect x="70" y="54" width="60" height="7" rx="3.5" fill={palette.hat} stroke={palette.hatShade} strokeWidth="1.5" />
        </g>

        {/* Scarf */}
        <g className="snowman-scarf">
          <path d="M 76 96 C 88 104, 112 104, 124 96 L 124 104 C 112 112, 88 112, 76 104 Z" fill={palette.scarf} stroke={palette.scarfShade} strokeWidth="1.2" />
          <path d="M 120 102 C 132 108, 136 124, 128 136 C 124 128, 120 116, 116 108 Z" fill={palette.scarf} stroke={palette.scarfShade} strokeWidth="1.2" />
          <path d="M 122 128 L 130 134 M 126 120 L 134 126" stroke={palette.scarfShade} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </g>

        {/* Envelope back */}
        <rect x="62" y="108" width="76" height="48" rx="4" fill="#fffdfa" stroke="#c9d4de" strokeWidth="1.5" />

        {/* The letter inside (floats out during emerge) */}
        <g className="snowman-letter">
          <rect x="66" y="112" width="68" height="40" rx="3" fill="#fefcf8" stroke="#e2e8f0" strokeWidth="1" />
          <line x1="74" y1="122" x2="112" y2="122" stroke="#64748b" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          <line x1="74" y1="129" x2="126" y2="129" stroke="#64748b" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
          <line x1="74" y1="136" x2="106" y2="136" stroke="#64748b" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        </g>

        {/* Envelope front folds */}
        <path d="M 62 156 L 100 128 L 138 156 Z" fill="#f4f8fb" stroke="#c9d4de" strokeWidth="1" />
        <path d="M 62 108 L 100 134 L 62 156 Z" fill="#eef4f9" stroke="#c9d4de" strokeWidth="0.8" opacity="0.8" />
        <path d="M 138 108 L 100 134 L 138 156 Z" fill="#eef4f9" stroke="#c9d4de" strokeWidth="0.8" opacity="0.8" />

        {/* Top flap with a snowflake seal */}
        <g className="snowman-flap-group">
          <path d="M 62 108 L 100 134 L 138 108 Z" fill="#ffffff" stroke="#c9d4de" strokeWidth="1.2" />
          <circle cx="100" cy="130" r="6" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
          <path d="M 100 126 L 100 134 M 96.5 128 L 103.5 132 M 103.5 128 L 96.5 132" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round" />
        </g>

        {/* Swirling snow */}
        <g className="snowman-flurries">
          <circle className="snowman-flurry-1" cx="52" cy="58" r="2.4" fill="#ffffff" />
          <circle className="snowman-flurry-2" cx="150" cy="66" r="2" fill="#ffffff" />
          <circle className="snowman-flurry-3" cx="36" cy="140" r="1.8" fill="#ffffff" />
          <circle className="snowman-flurry-4" cx="168" cy="150" r="2.2" fill="#ffffff" />
          <circle className="snowman-flurry-5" cx="96" cy="24" r="1.6" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}
