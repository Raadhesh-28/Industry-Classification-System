'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  UploadCloud,
  Layers,
  LogOut,
  Settings,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiJson, getByokKey } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';

interface HealthPayload {
  status: string;
  database: string;
  pgvector: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [byokActive, setByokActive] = useState(false);

  useEffect(() => {
    let active = true;
    const syncByok = () => {
      if (active) setByokActive(Boolean(getByokKey()));
    };
    const rafId = window.requestAnimationFrame(syncByok);
    window.addEventListener('strata-byok-change', syncByok);

    apiJson<HealthPayload>('/health')
      .then((data) => {
        if (active) setHealth(data);
      })
      .catch(() => {
        if (active) setHealth(null);
      });

    return () => {
      active = false;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('strata-byok-change', syncByok);
    };
  }, []);

  const menuItems = [
    { name: 'Overview', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Candidates', path: '/dashboard/search', icon: <Users size={18} /> },
    { name: 'Job Match', path: '/dashboard/match', icon: <Sparkles size={18} /> },
    { name: 'Upload', path: '/dashboard/upload', icon: <UploadCloud size={18} /> },
    { name: 'Settings', path: '/dashboard/settings', icon: <Settings size={18} /> },
  ];

  const initials = (user?.full_name || 'ST')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="dashboard-sidebar" aria-label="Primary navigation">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <Layers size={19} />
        </div>
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '1.08rem',
              color: 'var(--text-heading)',
              letterSpacing: '-0.025em',
            }}
          >
            Strata
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Recruiting
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <div className="status-pill" title="Workspace status">
          <span className={`status-dot ${health?.status === 'healthy' ? '' : 'offline'}`} />
          <span style={{ fontWeight: 500 }}>
            {health?.status === 'healthy' ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        {byokActive && (
          <Link
            href="/dashboard/settings"
            className="status-pill"
            style={{
              borderColor: 'var(--emerald-border)',
              backgroundColor: 'var(--emerald-soft)',
              color: 'var(--emerald)',
            }}
          >
            <KeyRound size={13} />
            <span style={{ fontWeight: 600 }}>Custom API key active</span>
          </Link>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu</div>
        {menuItems.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== '/dashboard' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              href={item.path}
              aria-current={isActive ? 'page' : undefined}
              className="nav-item"
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
              <div
                style={{
                  inlineSize: '34px',
                  blockSize: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: 'var(--text-heading)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.full_name}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    textTransform: 'capitalize',
                  }}
                >
                  {user.role.replace('_', ' ')}
                </div>
              </div>
            </div>
          )}
          <ThemeToggle />
        </div>

        <button
          type="button"
          onClick={logout}
          className="btn-danger-ghost"
          style={{ inlineSize: '100%', justifyContent: 'flex-start' }}
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
