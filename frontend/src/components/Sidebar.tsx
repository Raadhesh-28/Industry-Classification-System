'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Upload, Shield, LogOut } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={18} /> },
    { name: 'Search', path: '/dashboard/search', icon: <Search size={18} /> },
    { name: 'Upload', path: '/dashboard/upload', icon: <Upload size={18} /> },
  ];

  return (
    <div style={{
      width: '240px',
      height: '100vh',
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      padding: '1.5rem',
      position: 'fixed',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem', gap: '0.75rem' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Shield size={16} color="#718096" />
        </div>
        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>TalentAI</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
          return (
            <Link key={item.name} href={item.path} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: '6px',
              backgroundColor: isActive ? 'var(--primary)' : 'transparent',
              color: isActive ? 'white' : 'var(--text-muted)',
              fontWeight: isActive ? 500 : 400,
              transition: 'all 0.2s'
            }}>
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem', borderRadius: '6px',
          backgroundColor: 'transparent',
          color: '#e53e3e',
          fontWeight: 500,
          transition: 'all 0.2s'
        }}>
          <LogOut size={18} />
          Logout
        </Link>
      </div>
    </div>
  );
}
