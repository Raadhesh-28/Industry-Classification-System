'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type EffectiveTheme = 'light' | 'dark';

function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredOverride(): EffectiveTheme | null {
  try {
    const val = window.localStorage.getItem('color-scheme');
    return val === 'light' || val === 'dark' ? val : null;
  } catch {
    return null;
  }
}

function applyMetaColorScheme(value: 'light' | 'dark' | 'light dark') {
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.setAttribute('content', value);
  }
}

export default function ThemeToggle() {
  const [renderedTheme, setRenderedTheme] = useState<EffectiveTheme>('light');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const syncTheme = () => {
      const stored = getStoredOverride();
      applyMetaColorScheme(stored ?? 'light dark');
      setRenderedTheme(stored ?? (media.matches ? 'dark' : 'light'));
    };

    const rafId = window.requestAnimationFrame(syncTheme);

    const handleMediaChange = () => {
      // Never remove a stored override retroactively; only update when following system
      const stored = getStoredOverride();
      if (!stored) {
        setRenderedTheme(media.matches ? 'dark' : 'light');
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'color-scheme') {
        syncTheme();
      }
    };

    media.addEventListener('change', handleMediaChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.cancelAnimationFrame(rafId);
      media.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleToggle = () => {
    const target: EffectiveTheme = renderedTheme === 'dark' ? 'light' : 'dark';
    const system = getSystemTheme();

    try {
      if (target === system) {
        window.localStorage.removeItem('color-scheme');
        applyMetaColorScheme('light dark');
      } else {
        window.localStorage.setItem('color-scheme', target);
        applyMetaColorScheme(target);
      }
    } catch {
      applyMetaColorScheme(target);
    }

    setRenderedTheme(target);
  };

  const isDark = renderedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="theme-toggle-btn"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
