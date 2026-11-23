'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Search,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'recruiter' | 'hiring_manager'>('recruiter');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, loading, login, register } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register(fullName, email, password, role);
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: 'signin' | 'signup') => {
    setMode(nextMode);
    setError('');
    setPassword('');
    setShowPassword(false);
  };

  return (
    <div className="auth-shell">
      {/* Left Showcase */}
      <section className="auth-hero" aria-label="Product overview">
        <div className="auth-hero-inner">
          <div className="auth-brand-pill">
            <Layers size={15} color="#818cf8" />
            <span>Strata</span>
          </div>

          <h1 className="auth-hero-title">
            Find the right candidates, without the guesswork.
          </h1>

          <p className="auth-hero-subtitle">
            Upload resumes, search your talent pool in plain English, and shortlist applicants
            objectively with optional blind review.
          </p>

          <div className="auth-feature-pills">
            <span className="auth-feature-pill">
              <Search size={13} /> Natural language search
            </span>
            <span className="auth-feature-pill">
              <Sparkles size={13} /> Job matching
            </span>
            <span className="auth-feature-pill">
              <ShieldCheck size={13} /> Blind review
            </span>
            <span className="auth-feature-pill">
              <KeyRound size={13} /> Custom API keys
            </span>
          </div>
        </div>

        {/* Sample Match Preview */}
        <div className="auth-preview-card" aria-hidden="true">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  inlineSize: '36px',
                  blockSize: '36px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.16)',
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                  Candidate #4E54
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Senior Software Engineer · Technology
                </div>
              </div>
            </div>
            <span
              className="tabular-nums"
              style={{
                padding: '0.3rem 0.7rem',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.18)',
                border: '1px solid rgba(52, 211, 153, 0.35)',
                color: '#34d399',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              94% match
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.55, marginBottom: '0.85rem' }}>
            “Strong background in Python, backend APIs, and cloud infrastructure. Name and
            education hidden for blind review.”
          </p>

          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {['Python', 'FastAPI', 'PostgreSQL', 'APIs', 'Cloud'].map((skill) => (
              <span
                key={skill}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <CheckCircle2 size={11} color="#34d399" /> {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Right Auth Form */}
      <main className="auth-panel">
        <div className="auth-card">
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.45rem', marginBottom: '0.3rem' }}>
              {mode === 'signin' ? 'Sign in' : 'Create an account'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {mode === 'signin'
                ? 'Enter your email and password to continue.'
                : 'Set up your recruiter or hiring manager account.'}
            </p>
          </div>

          <div role="tablist" aria-label="Authentication mode" className="segmented-tabs">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => switchMode('signin')}
              className="segmented-tab"
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => switchMode('signup')}
              className="segmented-tab"
            >
              Sign up
            </button>
          </div>

          {error && (
            <div role="alert" className="alert-banner alert-error" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          <form
            key={mode}
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {mode === 'signup' && (
              <div>
                <label htmlFor="full-name" className="field-label">
                  Full name
                </label>
                <input
                  id="full-name"
                  name="full-name"
                  type="text"
                  autoComplete="name"
                  enterKeyHint="next"
                  placeholder="Alex Rivera"
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  minLength={2}
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="field-label">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="next"
                placeholder="you@company.com"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor={mode === 'signin' ? 'current-password' : 'new-password'}
                className="field-label"
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id={mode === 'signin' ? 'current-password' : 'new-password'}
                  name={mode === 'signin' ? 'current-password' : 'new-password'}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  enterKeyHint={mode === 'signin' ? 'done' : 'next'}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                  className="input"
                  style={{ paddingRight: '2.75rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === 'signup' ? 8 : 1}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="role" className="field-label">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  autoComplete="organization-title"
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'recruiter' | 'hiring_manager')}
                >
                  <option value="recruiter">Recruiter</option>
                  <option value="hiring_manager">Hiring Manager</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ marginTop: '0.5rem', padding: '0.82rem', inlineSize: '100%' }}
            >
              <span>
                {isSubmitting
                  ? mode === 'signin'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
              </span>
              {!isSubmitting && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
