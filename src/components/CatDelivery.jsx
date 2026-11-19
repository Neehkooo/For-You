import { getCatPalette } from '../lib/themes.js';

// Animated Cat holding a letter. `stage` drives the animation:
// closed -> opening (flap swings open, joyful eyes) -> open (letter visible, hearts float) -> emerge (letter slides out).
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
        {/* Swishing tail */}
        <path
          className="cat-tail"
          d="M 140 170 C 172 165, 186 132, 172 110 C 163 98, 150 106, 155 119 C 162 134, 150 152, 134 162 Z"
          fill={palette.body}
          stroke={palette.shade}
          strokeWidth="1.8"
        />

        {/* Back feet pads */}
        <ellipse cx="64" cy="192" rx="14" ry="7" fill={palette.points || palette.body} stroke={palette.shade} strokeWidth="1.5" />
        <ellipse cx="136" cy="192" rx="14" ry="7" fill={palette.points || palette.body} stroke={palette.shade} strokeWidth="1.5" />

        {/* Cat body */}
        <path
          d="M 52 185 C 46 128, 68 100, 100 100 C 132 100, 154 128, 148 185 C 148 196, 52 196, 52 185 Z"
          fill={palette.body}
          stroke={palette.shade}
          strokeWidth="2"
        />

        {/* Calico body patch if present */}
        {palette.patch && (
          <path
            d="M 125 112 C 144 122, 150 145, 144 168 C 137 152, 132 130, 125 112 Z"
            fill={palette.patch}
            opacity="0.9"
          />
        )}

        {/* Chest / Belly bib */}
        <path
          d="M 78 116 C 78 116, 100 110, 122 116 C 128 142, 122 172, 100 176 C 78 172, 72 142, 78 116 Z"
          fill={palette.belly}
        />

        {/* Left ear */}
        <g className="cat-ear-left">
          <path
            d="M 62 66 L 48 24 C 46 20, 52 18, 56 20 L 84 50 Z"
            fill={palette.points || palette.body}
            stroke={palette.shade}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M 62 58 L 53 29 L 77 48 Z" fill={palette.ear} />
        </g>

        {/* Right ear */}
        <g className="cat-ear-right">
          <path
            d="M 138 66 L 152 24 C 154 20, 148 18, 144 20 L 116 50 Z"
            fill={palette.points || palette.body}
            stroke={palette.shade}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M 138 58 L 147 29 L 123 48 Z" fill={palette.ear} />
        </g>

        {/* Head */}
        <path
          d="M 54 78 C 50 44, 150 44, 146 78 C 146 112, 54 112, 54 78 Z"
          fill={palette.body}
          stroke={palette.shade}
          strokeWidth="2"
        />

        {/* Siamese points mask if present */}
        {palette.points && (
          <ellipse cx="100" cy="80" rx="28" ry="22" fill={palette.points} opacity="0.35" />
        )}

        {/* Calico head patch if present */}
        {palette.patch && (
          <path
            d="M 54 62 C 58 46, 78 45, 84 55 C 78 70, 60 74, 54 62 Z"
            fill={palette.patch}
            opacity="0.9"
          />
        )}

        {/* Cheeks blush */}
        <ellipse cx="70" cy="85" rx="7" ry="4" fill="#fb7185" opacity="0.45" />
        <ellipse cx="130" cy="85" rx="7" ry="4" fill="#fb7185" opacity="0.45" />

        {/* Whiskers */}
        <line x1="36" y1="81" x2="62" y2="83" stroke={palette.shade} strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
        <line x1="36" y1="88" x2="62" y2="87" stroke={palette.shade} strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
        <line x1="164" y1="81" x2="138" y2="83" stroke={palette.shade} strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
        <line x1="164" y1="88" x2="138" y2="87" stroke={palette.shade} strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />

        {/* Nose & Mouth */}
        <path d="M 97 81 Q 100 79 103 81 Q 100 85 97 81 Z" fill={palette.nose} />
        <path
          d="M 94 86 Q 97 89 100 86 Q 103 89 106 86"
          fill="none"
          stroke={palette.shade}
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Eyes: Blinking anime eyes when closed, joyful curved eyes when open */}
        {!isSmiling ? (
          <g className="cat-eyes-group">
            {/* Left Eye */}
            <ellipse cx="77" cy="74" rx="6.5" ry="7.5" fill={palette.eyes || '#1e1b18'} />
            <ellipse cx="77" cy="74" rx="4.5" ry="5.5" fill="#181512" />
            <circle cx="75" cy="71" r="2.2" fill="#ffffff" />
            <circle cx="79" cy="76" r="1.1" fill="#ffffff" />

            {/* Right Eye */}
            <ellipse cx="123" cy="74" rx="6.5" ry="7.5" fill={palette.eyes || '#1e1b18'} />
            <ellipse cx="123" cy="74" rx="4.5" ry="5.5" fill="#181512" />
            <circle cx="121" cy="71" r="2.2" fill="#ffffff" />
            <circle cx="125" cy="76" r="1.1" fill="#ffffff" />
          </g>
        ) : (
          <g className="cat-eyes-smiling">
            <path d="M 70 76 Q 77 68 84 76" fill="none" stroke="#2b1a2e" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M 116 76 Q 123 68 130 76" fill="none" stroke="#2b1a2e" strokeWidth="2.6" strokeLinecap="round" />
          </g>
        )}

        {/* Floating hearts (when open or emerge) */}
        {isSmiling && (
          <g className="cat-hearts-group">
            <path
              className="cat-heart-1"
              d="M 98 25 C 95 21, 90 21, 90 25 C 90 29, 98 34, 98 34 C 98 34, 106 29, 106 25 C 106 21, 101 21, 98 25 Z"
              fill="#f43f5e"
            />
            <path
              className="cat-heart-2"
              d="M 126 18 C 124 15, 120 15, 120 18 C 120 21, 126 25, 126 25 C 126 25, 132 21, 132 18 C 132 15, 128 15, 126 18 Z"
              fill="#fb7185"
            />
          </g>
        )}

        {/* Envelope back */}
        <rect x="60" y="116" width="80" height="52" rx="4" fill="#fffdfa" stroke="#d5b8a5" strokeWidth="1.5" />

        {/* The Letter inside (slides up during emerge) */}
        <g className="cat-letter-paper">
          <rect x="64" y="120" width="72" height="44" rx="3" fill="#fefcf8" stroke="#ebd8c8" strokeWidth="1" />
          <line x1="72" y1="130" x2="114" y2="130" stroke="#8c6a78" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          <line x1="72" y1="137" x2="128" y2="137" stroke="#8c6a78" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
          <line x1="72" y1="144" x2="108" y2="144" stroke="#8c6a78" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        </g>

        {/* Envelope front fold pocket */}
        <path d="M 60 168 L 100 138 L 140 168 Z" fill="#faf2e7" stroke="#d5b8a5" strokeWidth="1" />
        <path d="M 60 116 L 100 144 L 60 168 Z" fill="#f8ede0" stroke="#d5b8a5" strokeWidth="0.8" opacity="0.75" />
        <path d="M 140 116 L 100 144 L 140 168 Z" fill="#f8ede0" stroke="#d5b8a5" strokeWidth="0.8" opacity="0.75" />

        {/* Envelope top flap */}
        <g className="cat-flap-group">
          <path d="M 60 116 L 100 144 L 140 116 Z" fill="#fffaf2" stroke="#d5b8a5" strokeWidth="1.2" />
          {/* Wax Heart Seal */}
          <path
            className="cat-wax-seal"
            d="M 100 141 C 97.5 137.5, 93 137.5, 93 141 C 93 144.5, 100 149, 100 149 C 100 149, 107 144.5, 107 141 C 107 137.5, 102.5 137.5, 100 141 Z"
            fill="#c0392b"
            stroke="#7e2318"
            strokeWidth="0.5"
          />
        </g>

        {/* Paws holding the envelope */}
        <g className="cat-paws-group">
          {/* Left paw */}
          <ellipse
            cx="66"
            cy="122"
            rx="9"
            ry="7"
            fill={palette.points || palette.body}
            stroke={palette.shade}
            strokeWidth="1.5"
            transform="rotate(-15 66 122)"
          />
          <circle cx="63" cy="121" r="1.2" fill={palette.shade} opacity="0.35" />
          <circle cx="67" cy="120" r="1.2" fill={palette.shade} opacity="0.35" />

          {/* Right paw */}
          <ellipse
            cx="134"
            cy="122"
            rx="9"
            ry="7"
            fill={palette.points || palette.body}
            stroke={palette.shade}
            strokeWidth="1.5"
            transform="rotate(15 134 122)"
          />
          <circle cx="133" cy="120" r="1.2" fill={palette.shade} opacity="0.35" />
          <circle cx="137" cy="121" r="1.2" fill={palette.shade} opacity="0.35" />
        </g>
      </svg>
    </div>
  );
}
