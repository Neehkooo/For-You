import { getBirdPalette } from '../lib/themes.js';

// Animated Bird (Dove / Messenger Bird) holding a letter. `stage` drives the animation:
// closed -> opening (envelope opens, musical notes float) -> open (letter visible) -> emerge (bird flies away).
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
  const uid = String(palette.id || 'bird').replace(/[^a-zA-Z0-9]/g, '');
  const bodyGrad = `bird-body-${uid}`;
  const wingGrad = `bird-wing-${uid}`;
  const bellyGrad = `bird-belly-${uid}`;
  const beakGrad = `bird-beak-${uid}`;
  const envGrad = `bird-env-${uid}`;
  const waxGrad = `bird-wax-${uid}`;

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
          <defs>
            <radialGradient id={bodyGrad} cx="36%" cy="22%" r="92%">
              <stop offset="0%" stopColor={palette.body} />
              <stop offset="60%" stopColor={palette.body} />
              <stop offset="100%" stopColor={palette.shade} stopOpacity="0.5" />
            </radialGradient>
            <linearGradient id={wingGrad} x1="0.2" y1="0" x2="0.7" y2="1">
              <stop offset="0%" stopColor={palette.wing} />
              <stop offset="100%" stopColor={palette.shade} stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id={bellyGrad} x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor={palette.belly} stopOpacity="0.95" />
              <stop offset="100%" stopColor={palette.belly} stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id={beakGrad} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.beak} />
              <stop offset="100%" stopColor="#c2410c" />
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
          <ellipse cx="118" cy="200" rx="54" ry="7" fill={palette.shade} opacity="0.14" />

          {/* Flight sparkles */}
          <g className="bird-flight-sparkles">
            <circle cx="52" cy="168" r="3" fill="#fbbf24" opacity="0.8" />
            <circle cx="72" cy="184" r="2" fill="#f43f5e" opacity="0.8" />
            <circle cx="42" cy="194" r="2.5" fill="#38bdf8" opacity="0.8" />
          </g>

          {/* Speed lines while flying away */}
          <g className="bird-speed-lines">
            <line x1="14" y1="118" x2="56" y2="108" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="8" y1="136" x2="60" y2="128" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <line x1="20" y1="154" x2="58" y2="146" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          </g>

          {/* Far wing behind the body */}
          <g className="bird-far-wing">
            <path
              d="M 118 88 C 100 54, 72 36, 53 44 C 38 51, 46 75, 75 99 Z"
              fill={palette.wing}
              stroke={palette.shade}
              strokeOpacity="0.3"
              strokeWidth="1.4"
            />
            <path d="M 106 82 C 92 58, 74 48, 62 50" stroke={palette.shade} strokeOpacity="0.25" strokeWidth="1.4" strokeLinecap="round" />
          </g>

          {/* Tail feathers, layered and tapered */}
          <g className="bird-tail">
            <path
              d="M 84 141 C 62 131, 38 127, 23 131 C 39 139, 62 147, 82 151 Z"
              fill={palette.wing}
              stroke={palette.shade}
              strokeOpacity="0.25"
              strokeWidth="1.2"
            />
            <path
              d="M 86 147 C 62 145, 37 151, 25 163 C 45 163, 69 157, 88 153 Z"
              fill={`url(#${wingGrad})`}
              stroke={palette.shade}
              strokeOpacity="0.3"
              strokeWidth="1.3"
            />
            <path
              d="M 84 153 C 62 159, 42 175, 36 190 C 54 183, 76 167, 90 157 Z"
              fill={palette.body}
              stroke={palette.shade}
              strokeOpacity="0.28"
              strokeWidth="1.3"
            />
          </g>

          {/* Body */}
          <path
            className="bird-body-shape"
            d="M 74 152 C 58 124, 68 90, 100 76 C 130 63, 162 80, 164 112 C 166 146, 136 172, 106 170 C 90 169, 80 162, 74 152 Z"
            fill={`url(#${bodyGrad})`}
            stroke={palette.shade}
            strokeOpacity="0.4"
            strokeWidth="1.8"
          />

          {/* Breast feathers */}
          <path
            d="M 118 78 C 144 82, 160 106, 152 136 C 144 160, 116 170, 101 154 C 90 141, 92 108, 118 78 Z"
            fill={`url(#${bellyGrad})`}
          />

          {/* Near wing, layered */}
          <g className="bird-near-wing">
            <path
              d="M 120 104 C 94 101, 68 122, 52 156 C 74 165, 112 154, 140 126 C 146 116, 138 104, 120 104 Z"
              fill={`url(#${wingGrad})`}
              stroke={palette.shade}
              strokeOpacity="0.42"
              strokeWidth="1.6"
            />
            <path
              d="M 112 112 C 94 114, 76 132, 62 156 C 80 160, 108 150, 130 126 Z"
              fill={palette.wing}
              opacity="0.55"
            />
            <g stroke={palette.shade} strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" fill="none">
              <path d="M 74 142 C 92 150, 116 142, 132 126" />
              <path d="M 66 152 C 84 158, 106 152, 122 138" />
              <path d="M 62 161 C 78 164, 96 160, 110 150" />
            </g>
          </g>

          {/* Head and soft neck blend */}
          <g className="bird-head-group">
            <path
              d="M 120 92 C 124 74, 136 62, 150 62 C 160 62, 166 70, 162 80 C 158 90, 146 96, 132 98 Z"
              fill={`url(#${bodyGrad})`}
            />
            <circle cx="140" cy="70" r="22" fill={`url(#${bodyGrad})`} stroke={palette.shade} strokeOpacity="0.4" strokeWidth="1.8" />
            <path d="M 126 55 C 134 47, 148 48, 154 57" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          </g>

          {/* Cheek blush */}
          <ellipse cx="143" cy="81" rx="6.4" ry="4" fill="#fb7185" opacity="0.32" />

          {/* Eye */}
          {!isSinging ? (
            <g className="bird-eye-idle">
              <circle cx="146" cy="66" r="5.2" fill={palette.eyes} />
              <circle cx="144.6" cy="64.2" r="1.8" fill="#ffffff" />
              <circle cx="148" cy="68.4" r="0.9" fill="#ffffff" opacity="0.8" />
            </g>
          ) : (
            <g className="bird-eye-happy">
              <path d="M 141 68 Q 146 61 151 68" fill="none" stroke={palette.eyes} strokeWidth="2.4" strokeLinecap="round" />
            </g>
          )}

          {/* Slender beak */}
          <g className="bird-beak">
            <path
              d="M 158 66 C 170 66.5, 180 71, 183 75 C 178 79, 168 81, 158 79 Z"
              fill={`url(#${beakGrad})`}
              stroke="#b45309"
              strokeOpacity="0.55"
              strokeWidth="0.9"
            />
            <path
              d="M 158 76 C 167 77.5, 175 79.5, 179 82 C 170 84, 162 83.5, 158 82"
              fill={palette.beak}
              stroke="#b45309"
              strokeOpacity="0.4"
              strokeWidth="0.8"
            />
          </g>

          {/* Notes & hearts while open */}
          {isSinging && (
            <g className="bird-notes">
              <text x="180" y="56" fill="#f43f5e" fontSize="16" className="bird-note-1">
                ♪
              </text>
              <text x="194" y="40" fill="#db2777" fontSize="14" className="bird-note-2">
                ♫
              </text>
              <path
                className="bird-heart-float"
                d="M 172 30 C 170 27, 166 27, 166 30 C 166 33, 172 37, 172 37 C 172 37, 178 33, 178 30 C 178 27, 174 27, 172 30 Z"
                fill="#f43f5e"
              />
            </g>
          )}

          {/* Envelope held below the beak */}
          <g className="bird-letter-group" transform="rotate(-3 148 118)">
            <rect x="110" y="92" width="76" height="50" rx="5" fill={`url(#${envGrad})`} stroke="#d8c3ae" strokeWidth="1.4" />
            <rect x="114" y="96" width="68" height="42" rx="3.5" fill="#fffdf9" stroke="#eedfd0" strokeWidth="1" />

            <g className="bird-emerging-letter">
              <rect x="117" y="99" width="62" height="37" rx="2.5" fill="#fffefb" stroke="#f0e3d4" strokeWidth="1" />
              <path
                d="M 124 109 h 38 M 124 116 h 48 M 124 123 h 34"
                stroke="#8c6a78"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.24"
              />
            </g>

            <path d="M 110 142 L 148 117 L 186 142 Z" fill="#f8efe4" stroke="#d8c3ae" strokeWidth="1.1" />
            <path d="M 110 92 L 148 119 L 110 142 Z" fill="#fbf4ea" stroke="#e2d1bf" strokeWidth="0.9" opacity="0.9" />
            <path d="M 186 92 L 148 119 L 186 142 Z" fill="#fbf4ea" stroke="#e2d1bf" strokeWidth="0.9" opacity="0.9" />

            <g className="bird-flap-group">
              <path d="M 110 92 L 148 121 L 186 92 Z" fill="#fffcf5" stroke="#d8c3ae" strokeWidth="1.3" />
              <path
                d="M 148 121 C 145 117, 139.5 117, 139.5 121 C 139.5 125.5, 148 131, 148 131 C 148 131, 156.5 125.5, 156.5 121 C 156.5 117, 151 117, 148 121 Z"
                fill={`url(#${waxGrad})`}
                stroke="#8c2417"
                strokeWidth="0.6"
              />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
