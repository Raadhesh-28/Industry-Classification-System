'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minBlockSize: '100dvh',
          backgroundColor: 'var(--background)',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-container">{children}</div>
      </main>
    </div>
  );
}
