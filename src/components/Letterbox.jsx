import { boxColors, DEFAULT_BOX } from '../lib/themes.js';
import CatDelivery from './CatDelivery.jsx';

// A letterbox/delivery presentation that opens. `stage` drives the animation:
// closed -> opening -> open (letter visible) -> emerge (letter slides out).
// Supports both the classic mailbox and the animated Cat holding a letter.
export default function Letterbox({ color = DEFAULT_BOX, stage = 'closed', onOpen, small = false, className = '' }) {
  if (typeof color === 'string' && color.startsWith('cat')) {
    return <CatDelivery color={color} stage={stage} onOpen={onOpen} small={small} className={className} />;
  }

  const c = boxColors.find((b) => b.id === color) || boxColors[0];
  const tappable = typeof onOpen === 'function' && stage === 'closed';
  const activate = () => { if (tappable) onOpen(); };

  return (
    <div
      className={`mailbox ${small ? 'mailbox-sm' : ''} ${tappable ? 'mailbox-tap' : ''} ${className}`}
      data-stage={stage}
      style={{ '--box-body': c.body, '--box-shade': c.shade }}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      aria-label={tappable ? 'Open the letterbox' : undefined}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
    >
      <div className="mb-body" aria-hidden="true">
        <div className="mb-letter"><i /><i /><i /></div>
        <div className="mb-slot" />
        <div className="mb-door"><span className="mb-handle" /></div>
      </div>
      <div className="mb-post" aria-hidden="true" />
      <div className="mb-flag" aria-hidden="true" />
    </div>
  );
}
