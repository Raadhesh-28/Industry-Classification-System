import { ReactNode } from 'react';

interface TopCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
}

export default function TopCard({ title, value, icon }: TopCardProps) {
  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
      <div style={{
        backgroundColor: '#ebf4ff', color: 'var(--primary)',
        width: '48px', height: '48px', borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.25rem' }}>
          {value}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
          {title}
        </p>
      </div>
    </div>
  );
}
