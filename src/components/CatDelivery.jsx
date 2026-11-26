import { getCatPalette } from '../lib/themes.js';

// Animated Cat holding a letter. `stage` drives the animation:
// closed -> opening (flap swings open, joyful eyes) -> open (letter visible, hearts float) -> emerge (letter floats away).
export default function CatDelivery({
  color = 'cat_orange',
  stage = 'closed',
  onOpen,
  small = false,
  className = '',
}) {
  const palette = getCatPalette(color);
  const tappable = typeof onOpen === 'function' && stage === 'closed';
  const activate = () => {
    if (tappable) onOpen();
  };

  const isSmiling = stage !== 'closed';
  const uid = String(palette.id || 'cat').replace(/[^a-zA-Z0-9]/g, '');
  const furGrad = `cat-fur-${uid}`;
  const bellyGrad = `cat-belly-${uid}`;
  const envGrad = `cat-env-${uid}`;
  const waxGrad = `cat-wax-${uid}`;
  const leftEarFill = palette.leftEar || `url(#${furGrad})`;

  return (
    <div
      className={`cat-delivery ${small ? 'cat-delivery-sm' : ''} ${tappable ? 'cat-delivery-tap' : ''} ${className}`}
      data-stage={stage}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      aria-label={tappable ? 'Open the letter from the kitty' : undefined}
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
        className="cat-delivery-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={furGrad} cx="38%" cy="18%" r="92%">
            <stop offset="0%" stopColor={palette.body} />
            <stop offset="62%" stopColor={palette.body} />
            <stop offset="100%" stopColor={palette.shade} stopOpacity="0.55" />
          </radialGradient>
          <linearGradient id={bellyGrad} x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor={palette.belly} stopOpacity="0.98" />
            <stop offset="100%" stopColor={palette.belly} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={envGrad} x1="0.1" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#fffefb" />
            <stop offset="100%" stopColor="#f4e6d7" />
          </linearGradient>
          <linearGradient id={waxGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d94a3d" />
            <stop offset="100%" stopColor="#a8281c" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="100" cy="201" rx="58" ry="8" fill={palette.shade} opacity="0.16" />

        {/* Long curling tail */}
        <g className="cat-tail">
          <path
            d="M 134 178 C 166 182, 186 160, 180 134 C 176 115, 160 105, 149 113"
            fill="none"
            stroke={palette.shade}
            strokeOpacity="0.45"
            strokeWidth="15"
            strokeLinecap="round"
          />
          <path
            d="M 134 178 C 166 182, 186 160, 180 134 C 176 115, 160 105, 149 113"
            fill="none"
            stroke={`url(#${furGrad})`}
            strokeWidth="11.5"
            strokeLinecap="round"
          />
          <path
            d="M 152 114 C 162 107, 174 114, 177 130"
            fill="none"
            stroke={palette.belly}
            strokeOpacity="0.3"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* Hind paws */}
        <ellipse cx="68" cy="187" rx="17" ry="9.5" fill={`url(#${furGrad})`} stroke={palette.shade} strokeOpacity="0.4" strokeWidth="1.4" />
        <ellipse cx="132" cy="187" rx="17" ry="9.5" fill={`url(#${furGrad})`} stroke={palette.shade} strokeOpacity="0.4" strokeWidth="1.4" />
        <path
          d="M 60 184 v 4 M 67 182 v 4 M 74 184 v 4 M 126 184 v 4 M 133 182 v 4 M 140 184 v 4"
          stroke={palette.shade}
          strokeOpacity="0.3"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Body */}
        <path
          className="cat-body-shape"
          d="M 100 104 C 75 104, 57 126, 53 157 C 50 180, 63 192, 100 192 C 137 192, 150 180, 147 157 C 143 126, 125 104, 100 104 Z"
          fill={`url(#${furGrad})`}
          stroke={palette.shade}
          strokeOpacity="0.42"
          strokeWidth="1.8"
        />

        {/* Chest bib */}
        <path
          d="M 100 113 C 87 113, 79 127, 79 147 C 79 167, 87 181, 100 181 C 113 181, 121 167, 121 147 C 121 127, 113 113, 100 113 Z"
          fill={`url(#${bellyGrad})`}
        />

        {/* Ears */}
        <g className="cat-ear-left">
          <path
            d="M 61 66 C 54 48, 49 29, 57 24 C 64 20, 79 36, 87 51 C 78 56, 69 61, 61 66 Z"
            fill={leftEarFill}
            stroke={palette.shade}
            strokeOpacity="0.4"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M 65 59 C 60 47, 57 35, 60 31 C 65 29, 74 41, 80 51 C 74 54, 69 57, 65 59 Z"
            fill={palette.ear}
            opacity="0.85"
          />
        </g>
        <g className="cat-ear-right">
          <path
            d="M 139 66 C 146 48, 151 29, 143 24 C 136 20, 121 36, 113 51 C 122 56, 131 61, 139 66 Z"
            fill={`url(#${furGrad})`}
            stroke={palette.shade}
            strokeOpacity="0.4"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M 135 59 C 140 47, 143 35, 140 31 C 135 29, 126 41, 120 51 C 126 54, 131 57, 135 59 Z"
            fill={palette.ear}
            opacity="0.85"
          />
        </g>

        {/* Head */}
        <path
          className="cat-head-shape"
          d="M 100 46 C 79 46, 59 57, 57 79 C 55 99, 75 112, 100 112 C 125 112, 145 99, 143 79 C 141 57, 121 46, 100 46 Z"
          fill={`url(#${furGrad})`}
          stroke={palette.shade}
          strokeOpacity="0.42"
          strokeWidth="1.8"
        />

        {/* Siamese points */}
        {palette.points && (
          <>
            <ellipse cx="100" cy="87" rx="26" ry="18" fill={palette.points} opacity="0.26" />
            <ellipse cx="69" cy="52" rx="11" ry="13" fill={palette.points} opacity="0.22" />
            <ellipse cx="131" cy="52" rx="11" ry="13" fill={palette.points} opacity="0.22" />
          </>
        )}

        {/* Calico head patch */}
        {palette.patch && (
          <path
            d="M 58 74 C 60 60, 74 52, 86 56 C 94 59, 97 67, 94 73 C 84 76, 70 78, 58 74 Z"
            fill={palette.patch}
            opacity="0.9"
          />
        )}

        {/* Cheek blush */}
        <ellipse cx="71" cy="91" rx="7.5" ry="4.2" fill="#fb7185" opacity="0.34" />
        <ellipse cx="129" cy="91" rx="7.5" ry="4.2" fill="#fb7185" opacity="0.34" />

        {/* Whiskers */}
        <g stroke={palette.shade} strokeOpacity="0.45" strokeWidth="1.3" strokeLinecap="round" fill="none">
          <path d="M 73 85 C 61 81, 47 79, 35 81" />
          <path d="M 73 91 C 61 92, 48 93, 38 97" />
          <path d="M 127 85 C 139 81, 153 79, 165 81" />
          <path d="M 127 91 C 139 92, 152 93, 162 97" />
        </g>

        {/* Muzzle & nose */}
        <ellipse cx="92" cy="91" rx="9" ry="6.5" fill={palette.belly} opacity="0.55" />
        <ellipse cx="108" cy="91" rx="9" ry="6.5" fill={palette.belly} opacity="0.55" />
        <path d="M 96 84 Q 100 82 104 84 Q 100 90 96 84 Z" fill={palette.nose} />
        <path
          d="M 100 89 C 100 93.5, 96 95.5, 92.5 93.5 M 100 89 C 100 93.5, 104 95.5, 107.5 93.5"
          stroke={palette.shade}
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Eyes: glossy blinking eyes, then joyful arcs when open */}
        {!isSmiling ? (
          <g className="cat-eyes-group">
            <ellipse cx="78" cy="74" rx="7.6" ry="9" fill={palette.eyes} />
            <ellipse cx="78" cy="75" rx="4.7" ry="6.4" fill="#181512" opacity="0.92" />
            <circle cx="75.6" cy="70.4" r="2.5" fill="#ffffff" />
            <circle cx="80.6" cy="78" r="1.2" fill="#ffffff" opacity="0.9" />
            <path
              d="M 70.4 68 C 74 64, 82 64, 85.6 68"
              stroke={palette.shade}
              strokeOpacity="0.55"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />

            <ellipse cx="122" cy="74" rx="7.6" ry="9" fill={palette.eyes} />
            <ellipse cx="122" cy="75" rx="4.7" ry="6.4" fill="#181512" opacity="0.92" />
            <circle cx="119.6" cy="70.4" r="2.5" fill="#ffffff" />
            <circle cx="124.6" cy="78" r="1.2" fill="#ffffff" opacity="0.9" />
            <path
              d="M 114.4 68 C 118 64, 126 64, 129.6 68"
              stroke={palette.shade}
              strokeOpacity="0.55"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        ) : (
          <g className="cat-eyes-smiling">
            <path d="M 70 76 Q 78 66.5 86 76" fill="none" stroke="#2b1a2e" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 114 76 Q 122 66.5 130 76" fill="none" stroke="#2b1a2e" strokeWidth="2.8" strokeLinecap="round" />
            <path
              d="M 67 84 q 3 -3.5 6.5 0 M 126.5 84 q 3 -3.5 6.5 0"
              fill="none"
              stroke={palette.shade}
              strokeOpacity="0.5"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Floating hearts */}
        {isSmiling && (
          <g className="cat-hearts-group">
            <path
              className="cat-heart-1"
              d="M 98 30 C 95 25.5, 89 25.5, 89 30 C 89 34.5, 98 40, 98 40 C 98 40, 107 34.5, 107 30 C 107 25.5, 101 25.5, 98 30 Z"
              fill="#f43f5e"
              opacity="0.9"
            />
            <path
              className="cat-heart-2"
              d="M 128 22 C 126 19, 121.5 19, 121.5 22 C 121.5 25, 128 29, 128 29 C 128 29, 134.5 25, 134.5 22 C 134.5 19, 130 19, 128 22 Z"
              fill="#fb7185"
              opacity="0.85"
            />
          </g>
        )}

        {/* Envelope */}
        <rect x="56" y="116" width="88" height="54" rx="6" fill={`url(#${envGrad})`} stroke="#d8c3ae" strokeWidth="1.4" />
        <rect x="60" y="120" width="80" height="46" rx="4" fill="#fffdf9" stroke="#eedfd0" strokeWidth="1" />

        <g className="cat-letter-paper">
          <rect x="63" y="123" width="74" height="41" rx="3" fill="#fffefb" stroke="#f0e3d4" strokeWidth="1" />
          <path
            d="M 71 133 h 44 M 71 140 h 58 M 71 147 h 40"
            stroke="#8c6a78"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.26"
          />
        </g>

        <path d="M 56 170 L 100 141 L 144 170 Z" fill="#f8efe4" stroke="#d8c3ae" strokeWidth="1.1" />
        <path d="M 56 116 L 100 145 L 56 170 Z" fill="#fbf4ea" stroke="#e2d1bf" strokeWidth="0.9" opacity="0.9" />
        <path d="M 144 116 L 100 145 L 144 170 Z" fill="#fbf4ea" stroke="#e2d1bf" strokeWidth="0.9" opacity="0.9" />

        <g className="cat-flap-group">
          <path d="M 56 116 L 100 146 L 144 116 Z" fill="#fffcf5" stroke="#d8c3ae" strokeWidth="1.3" />
          <path
            d="M 100 146 C 96.5 141, 90 141, 90 146 C 90 151, 100 157, 100 157 C 100 157, 110 151, 110 146 C 110 141, 103.5 141, 100 146 Z"
            fill={`url(#${waxGrad})`}
            stroke="#8c2417"
            strokeWidth="0.6"
          />
        </g>

        {/* Paws holding the envelope */}
        <g className="cat-paws-group">
          <ellipse
            cx="66"
            cy="127"
            rx="11"
            ry="8"
            fill={`url(#${furGrad})`}
            stroke={palette.shade}
            strokeOpacity="0.4"
            strokeWidth="1.4"
            transform="rotate(-12 66 127)"
          />
          <path
            d="M 61 123 v 3.5 M 66 122 v 3.5 M 71 123 v 3.5"
            stroke={palette.shade}
            strokeOpacity="0.28"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <ellipse
            cx="134"
            cy="127"
            rx="11"
            ry="8"
            fill={`url(#${furGrad})`}
            stroke={palette.shade}
            strokeOpacity="0.4"
            strokeWidth="1.4"
            transform="rotate(12 134 127)"
          />
          <path
            d="M 129 123 v 3.5 M 134 122 v 3.5 M 139 123 v 3.5"
            stroke={palette.shade}
            strokeOpacity="0.28"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
