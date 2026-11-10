// Sparky — the Skill Sparks mascot (animated SVG, reacts via CSS classes)
export default function Mascot({ mood = 'wave', size = 120 }: { mood?: 'wave' | 'cheer' | 'think' | 'idle'; size?: number }) {
  return (
    <svg className={`mascot mascot-${mood}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Sparky, the Skill Sparks mascot">
      <ellipse cx="60" cy="108" rx="30" ry="6" fill="rgba(0,0,0,.35)" />
      {/* body */}
      <path d="M60 18 C84 18 96 38 96 62 C96 88 80 102 60 102 C40 102 24 88 24 62 C24 38 36 18 60 18Z" fill="#A855F7" stroke="#050505" strokeWidth="3" />
      {/* belly */}
      <ellipse cx="60" cy="78" rx="20" ry="16" fill="#FFD21F" stroke="#050505" strokeWidth="3" />
      {/* antenna + star */}
      <line x1="60" y1="18" x2="60" y2="8" stroke="#050505" strokeWidth="3" strokeLinecap="round" />
      <path className="mascot-star" d="M60 0 l2.4 5 5.5.7 -4 3.8 1 5.4 -4.9-2.7 -4.9 2.7 1-5.4 -4-3.8 5.5-.7z" fill="#FFD21F" stroke="#050505" strokeWidth="1.6" />
      {/* eyes */}
      <circle cx="46" cy="52" r="7" fill="#fff" stroke="#050505" strokeWidth="2.5" />
      <circle cx="74" cy="52" r="7" fill="#fff" stroke="#050505" strokeWidth="2.5" />
      <circle className="mascot-pupil" cx="47" cy="53" r="3.2" fill="#050505" />
      <circle className="mascot-pupil" cx="75" cy="53" r="3.2" fill="#050505" />
      {/* cheeks */}
      <circle cx="36" cy="64" r="5" fill="#FF4F7B" opacity=".7" />
      <circle cx="84" cy="64" r="5" fill="#FF4F7B" opacity=".7" />
      {/* mouth */}
      {mood === 'cheer' ? (
        <path d="M50 66 Q60 78 70 66 Q60 71 50 66Z" fill="#050505" />
      ) : mood === 'think' ? (
        <path d="M54 70 Q60 67 66 70" stroke="#050505" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M52 66 Q60 73 68 66" stroke="#050505" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}
      {/* arms */}
      <path className="mascot-arm" d="M26 66 Q12 60 10 48" stroke="#050505" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path className="mascot-arm-r" d="M94 66 Q108 60 110 48" stroke="#050505" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* feet */}
      <ellipse cx="44" cy="102" rx="10" ry="5" fill="#22FF88" stroke="#050505" strokeWidth="2.5" />
      <ellipse cx="76" cy="102" rx="10" ry="5" fill="#22FF88" stroke="#050505" strokeWidth="2.5" />
    </svg>
  );
}
