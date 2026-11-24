// A birthday cake delivery. Tapping it slices the cake and lifts the letter out.
// `stage` follows the same closed -> opening -> open -> emerge sequence as the other presentations.
export default function CakeDelivery({ stage = 'closed', onOpen, small = false, className = '' }) {
  const tappable = typeof onOpen === 'function' && stage === 'closed';
  const activate = () => {
    if (tappable) onOpen();
  };

  return (
    <div
      className={`cake-scene ${small ? 'cake-sm' : ''} ${tappable ? 'cake-tap' : ''} ${className}`}
      data-stage={stage}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      aria-label={tappable ? 'Slice the birthday cake to open the letter' : undefined}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
    >
      <div className="cake-letter" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <div className="cake-body" aria-hidden="true">
        <div className="cake-tier cake-tier-top">
          <span className="cake-drip" />
          <span className="cake-candle" style={{ left: '22%' }}>
            <i />
          </span>
          <span className="cake-candle" style={{ left: '47%' }}>
            <i />
          </span>
          <span className="cake-candle" style={{ left: '72%' }}>
            <i />
          </span>
        </div>
        <div className="cake-tier cake-tier-mid">
          <span className="cake-drip" />
        </div>
        <div className="cake-tier cake-tier-base">
          <span className="cake-drip" />
        </div>
        <span className="cake-cut" />
      </div>

      <div className="cake-slice" aria-hidden="true">
        <span className="cake-slice-frosting" />
        <span className="cake-slice-berries">🍓</span>
      </div>

      <div className="cake-plate" aria-hidden="true" />
    </div>
  );
}
