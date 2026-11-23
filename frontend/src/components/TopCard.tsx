import { ReactNode } from 'react';

interface TopCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  accent?: 'primary' | 'emerald' | 'amber' | 'neutral';
}

export default function TopCard({
  title,
  value,
  subtitle,
  icon,
  accent = 'primary',
}: TopCardProps) {
  const accentStyles: Record<string, { bg: string; color: string }> = {
    primary: { bg: 'var(--primary-soft)', color: 'var(--primary)' },
    emerald: { bg: 'var(--emerald-soft)', color: 'var(--emerald)' },
    amber: { bg: 'var(--amber-soft)', color: 'var(--amber)' },
    neutral: { bg: 'var(--surface-subtle)', color: 'var(--text-heading)' },
  };
  const palette = accentStyles[accent];

  return (
    <div
      className="card"
      style={{
        padding: '1.35rem 1.45rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
          {title}
        </span>
        <div
          style={{
            backgroundColor: palette.bg,
            color: palette.color,
            inlineSize: '38px',
            blockSize: '38px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>

      <div>
        <div
          className="tabular-nums"
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: 'var(--text-heading)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
          }}
        >
          {value}
        </div>
        {subtitle && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginBlockStart: '0.35rem' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
