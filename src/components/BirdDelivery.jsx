import { getBirdPalette } from '../lib/themes.js';

// Animated Bird (Dove / Messenger Bird) holding a letter. `stage` drives the animation:
// closed -> opening (envelope opens, musical notes float) -> open (letter visible) -> emerge (bird flies away!).
export default function BirdDelivery({
  color = 'bird_dove',
  stage = 'closed',
  onOpen,
  small = false,
  className = '',
}) {
  const palette = getBirdPalette(color);
  const tappable = typeof onOpen === 'function' && stage === 'closed';
  const activate = () => {
    if (tappable) onOpen();
  };

  const isSinging = stage !== 'closed';

  return (
    <div
      className={`bird-delivery ${small ? 'bird-delivery-sm' : ''} ${tappable ? 'bird-delivery-tap' : ''} ${className}`}
      data-stage={stage}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      aria-label={tappable ? 'Open the letter from the messenger bird' : undefined}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
    >
      <div className="bird-wrapper">
        <svg
          viewBox="0 0 220 220"
          className="bird-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Sparkles / Flight trail during emerge */}
          <g className="bird-flight-sparkles">
            <circle cx="50" cy="170" r="3" fill="#fbbf24" opacity="0.8" />
            <circle cx="70" cy="185" r="2" fill="#f43f5e" opacity="0.8" />
            <circle cx="40" cy="195" r="2.5" fill="#38bdf8" opacity="0.8" />
            <polygon points="55,160 57,166 63,168 57,170 55,176 53,170 47,168 53,166" fill="#fef08a" />
          </g>

          {/* Far wing (behind body) */}
          <g className="bird-far-wing">
            <path
              d="M 100 85 C 80 40, 50 35, 38 48 C 30 58, 45 85, 80 110 Z"
              fill={palette.wing}
              stroke={palette.shade}
              strokeWidth="1.5"
            />
          </g>

          {/* Tail feathers */}
          <g className="bird-tail">
            <path
              d="M 68 142 C 32 154, 16 182, 22 192 C 36 188, 54 172, 78 152 Z"
              fill={palette.wing}
              stroke={palette.shade}
              strokeWidth="1.5"
            />
            <path
              d="M 65 146 C 42 165, 28 190, 36 198 C 48 192, 64 174, 82 154 Z"
              fill={palette.body}
              stroke={palette.shade}
              strokeWidth="1.5"
            />
          </g>

          {/* Perched little feet */}
          <g className="bird-feet">
            <path d="M 98 174 L 92 188 M 98 174 L 98 189 M 98 174 L 105 188" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
            <path d="M 124 174 L 118 188 M 124 174 L 124 189 M 124 174 L 131 188" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Plump bird body */}
          <path
            className="bird-body-shape"
            d="M 72 148 C 55 110, 78 68, 118 68 C 152 68, 178 98, 162 145 C 150 174, 94 174, 72 148 Z"
            fill={palette.body}
            stroke={palette.shade}
            strokeWidth="2"
          />

          {/* Soft breast/belly feathers */}
          <path
            d="M 112 80 C 134 80, 154 104, 146 140 C 134 162, 108 162, 98 142 C 92 122, 92 95, 112 80 Z"
            fill={palette.belly}
          />

          {/* Near wing (front) */}
          <g className="bird-near-wing">
            <path
              d="M 118 105 C 92 105, 68 128, 54 162 C 72 165, 110 155, 138 128 C 142 120, 136 105, 118 105 Z"
              fill={palette.wing}
              stroke={palette.shade}
              strokeWidth="1.8"
            />
            {/* Wing feather lines */}
            <path d="M 85 132 C 98 142, 115 142, 128 130" stroke={palette.shade} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            <path d="M 75 145 C 88 152, 104 152, 116 142" stroke={palette.shade} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
          </g>

          {/* Head & Crown */}
          <circle cx="138" cy="72" r="22" fill={palette.body} stroke={palette.shade} strokeWidth="1.8" />
          {/* Soft cheek blush */}
          <ellipse cx="140" cy="80" rx="6" ry="4" fill="#fb7185" opacity="0.45" />

          {/* Eye: round shiny when closed, singing curve when open */}
          {!isSinging ? (
            <g className="bird-eye-idle">
              <circle cx="142" cy="68" r="4.5" fill={palette.eyes} />
              <circle cx="140.5" cy="66" r="1.5" fill="#ffffff" />
            </g>
          ) : (
            <g className="bird-eye-happy">
              <path d="M 137 70 Q 142 64 147 70" fill="none" stroke={palette.eyes} strokeWidth="2.2" strokeLinecap="round" />
            </g>
          )}

          {/* Beak holding the letter */}
          <g className="bird-beak">
            <polygon points="152,68 174,75 152,78" fill={palette.beak} stroke="#b45309" strokeWidth="1" />
            <polygon points="152,76 170,79 152,82" fill={palette.beak} stroke="#b45309" strokeWidth="1" />
          </g>

          {/* Floating musical notes & hearts when open */}
          {isSinging && (
            <g className="bird-notes">
              <text x="175" y="55" fill="#f43f5e" fontSize="16" className="bird-note-1">♪</text>
              <text x="190" y="40" fill="#db2777" fontSize="14" className="bird-note-2">♫</text>
              <path
                className="bird-heart-float"
                d="M 165 35 C 163 32, 159 32, 159 35 C 159 38, 165 42, 165 42 C 165 42, 171 38, 171 35 C 171 32, 167 32, 165 35 Z"
                fill="#f43f5e"
              />
            </g>
          )}

          {/* The Envelope held in the beak */}
          <g className="bird-letter-group">
            {/* Envelope Back */}
            <rect x="108" y="82" width="76" height="50" rx="3" fill="#fffdfa" stroke="#d5b8a5" strokeWidth="1.5" />

            {/* Inner folded letter (emerges downward on unlock) */}
            <g className="bird-emerging-letter">
              <rect x="112" y="86" width="68" height="42" rx="2" fill="#fdfbf7" stroke="#ebd8c8" strokeWidth="1" />
              <line x1="120" y1="96" x2="162" y2="96" stroke="#8c6a78" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              <line x1="120" y1="103" x2="172" y2="103" stroke="#8c6a78" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              <line x1="120" y1="110" x2="152" y2="110" stroke="#8c6a78" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
            </g>

            {/* Front pocket folds */}
            <path d="M 108 132 L 146 104 L 184 132 Z" fill="#faf2e7" stroke="#d5b8a5" strokeWidth="1" />
            <path d="M 108 82 L 146 110 L 108 132 Z" fill="#f8ede0" stroke="#d5b8a5" strokeWidth="0.8" opacity="0.75" />
            <path d="M 184 82 L 146 110 L 184 132 Z" fill="#f8ede0" stroke="#d5b8a5" strokeWidth="0.8" opacity="0.75" />

            {/* Top envelope flap (opens up on tap) */}
            <g className="bird-flap-group">
              <path d="M 108 82 L 146 110 L 184 82 Z" fill="#fffaf2" stroke="#d5b8a5" strokeWidth="1.2" />
              {/* Heart Wax Seal */}
              <path
                d="M 146 107 C 143.5 103.5, 139 103.5, 139 107 C 139 110.5, 146 115, 146 115 C 146 115, 153 110.5, 153 107 C 153 103.5, 148.5 103.5, 146 107 Z"
                fill="#c0392b"
                stroke="#7e2318"
                strokeWidth="0.5"
              />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
