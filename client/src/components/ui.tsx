// Small presentational building blocks shared across screens.
import type { CSSProperties, ReactNode } from 'react';

type IconProps = { size?: number; stroke?: string; strokeWidth?: number };

const svg = (children: ReactNode, { size = 20, stroke = 'currentColor', strokeWidth = 1.7 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const Icon = {
  home: (p: IconProps = {}) => svg(<><path d="M4 12l8-7 8 7" /><path d="M6 10v9h5v-6h2v6h5v-9" /></>, p),
  message: (p: IconProps = {}) => svg(<path d="M4 5h16v11H10l-4 4v-4H4z" />, p),
  user: (p: IconProps = {}) => svg(<><path d="M12 12a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z" /><path d="M5.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" /></>, p),
  training: (p: IconProps = {}) => svg(<path d="M3 12h4l2.5-7 4 15 2.5-8H21" />, p),
  bell: (p: IconProps = {}) => svg(<><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 19a2 2 0 0 0 4 0" /></>, p),
  arrow: (p: IconProps = {}) => svg(<path d="M5 12h13M13 6l6 6-6 6" />, { strokeWidth: 2.4, ...p }),
  send: (p: IconProps = {}) => svg(<path d="M4 12l16-8-6 16-3-7z" />, { strokeWidth: 2.2, ...p }),
  whistle: (p: IconProps = {}) => svg(<path d="M3 12h4l1-3 3 8 2-11 2 6h6" />, p),
};

export function Bar({
  value,
  max = 100,
  variant = 'lime',
  large = false,
}: {
  value: number;
  max?: number;
  variant?: 'lime' | 'muted' | 'amber' | 'green';
  large?: boolean;
}): JSX.Element {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bar${large ? ' bar--lg' : ''}`}>
      <div className={`bar__fill${variant === 'lime' ? '' : ` bar__fill--${variant}`}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({
  initials,
  color,
  size = 42,
  radius = 12,
  fontSize,
}: {
  initials: string;
  color?: string;
  size?: number;
  radius?: number;
  fontSize?: number;
}): JSX.Element {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flex: 'none',
        background: color ? `linear-gradient(135deg, ${color}55, #16181655)` : 'linear-gradient(135deg,#2c322d,#151816)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Oswald, sans-serif',
        fontWeight: 600,
        fontSize: fontSize ?? Math.round(size * 0.38),
        color: color ?? '#c9ff3c',
      }}
    >
      {initials}
    </div>
  );
}

export function StatTile({ value, label }: { value: ReactNode; label: string }): JSX.Element {
  return (
    <div className="stat">
      <div className="stat__val">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}

export function AttrRow({ name, value, highlight = false }: { name: string; value: number; highlight?: boolean }): JSX.Element {
  return (
    <div>
      <div className="between" style={{ marginBottom: 6 }}>
        <span style={{ font: '500 12.5px Sora,sans-serif', color: 'var(--text)' }}>{name}</span>
        <span className="num" style={{ fontSize: 15, color: highlight ? 'var(--lime)' : 'var(--text)' }}>{Math.round(value)}</span>
      </div>
      <Bar value={value} variant={highlight ? 'lime' : 'muted'} />
    </div>
  );
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }): JSX.Element {
  return <div className="eyebrow" style={style}>{children}</div>;
}
