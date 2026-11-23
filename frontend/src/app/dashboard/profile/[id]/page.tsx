'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Briefcase,
  MapPin,
  Building2,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Mail,
} from 'lucide-react';
import DeleteProfileButton from '@/components/DeleteProfileButton';
import { apiJson, CandidateRecord } from '@/lib/api';

function renderHighlightedResume(text: string, highlightRedacted: boolean) {
  if (!highlightRedacted) return text;
  const parts = text.split(/(\[REDACTED_[A-Z_]+\])/g);
  return parts.map((part, i) =>
    /^\[REDACTED_[A-Z_]+\]$/.test(part) ? (
      <span key={i} className="redacted-token">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;

  const [blindMode, setBlindMode] = useState(searchParams?.get('blind') === '1');
  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    apiJson<CandidateRecord>(`/candidates/${id}?blind_mode=${blindMode}`)
      .then((data) => {
        if (!active) return;
        setCandidate(data);
        setNotFound(false);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, blindMode]);

  if (loading && !candidate) {
    return (
      <>
        <div className="skeleton" style={{ height: '32px', width: '200px' }} />
        <div className="skeleton" style={{ height: '240px' }} />
        <div className="skeleton" style={{ height: '320px' }} />
      </>
    );
  }

  if (notFound || !candidate) {
    return (
      <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>Candidate not found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          This profile may have been removed.
        </p>
        <Link href="/dashboard/search" className="btn-primary">
          Back to candidates
        </Link>
      </div>
    );
  }

  const initials = (candidate.name || 'UC')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <Link
          href="/dashboard/search"
          className="btn-secondary"
          style={{ padding: '0.5rem 0.9rem' }}
        >
          <ArrowLeft size={16} /> Back to candidates
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label className={`toggle-pill ${blindMode ? 'active-emerald' : ''}`}>
            <input
              type="checkbox"
              checked={blindMode}
              onChange={(e) => setBlindMode(e.target.checked)}
              style={{ inlineSize: '15px', blockSize: '15px', cursor: 'pointer' }}
            />
            <ShieldCheck size={15} />
            <span>Blind mode</span>
          </label>
          <DeleteProfileButton
            candidateId={candidate.id}
            candidateName={candidate.name || candidate.id}
          />
        </div>
      </div>

      {blindMode && (
        <div className="alert-banner alert-emerald">
          <ShieldCheck size={18} />
          <span>
            <strong>Blind mode is on.</strong> Name, email, and schools are hidden.
          </span>
        </div>
      )}

      <section className="card" style={{ padding: '2rem', display: 'flex', gap: '1.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div
          style={{
            inlineSize: '76px',
            blockSize: '76px',
            borderRadius: '18px',
            backgroundColor: blindMode ? 'var(--emerald-soft)' : 'var(--primary-soft)',
            color: blindMode ? 'var(--emerald)' : 'var(--primary)',
            border: blindMode ? '1px solid var(--emerald-border)' : '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.4rem',
            flexShrink: 0,
          }}
        >
          {blindMode ? <ShieldCheck size={36} /> : initials}
        </div>

        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
            <h1 style={{ fontSize: '1.75rem' }}>{candidate.name || 'Unnamed Candidate'}</h1>
            {typeof candidate.confidence_score === 'number' && (
              <span className="badge badge-primary tabular-nums">
                <Sparkles size={12} /> {Math.round(candidate.confidence_score * 100)}% confidence
              </span>
            )}
          </div>

          {candidate.career_summary && (
            <p
              style={{
                marginBlock: '0.75rem 1.25rem',
                color: 'var(--foreground)',
                fontSize: '0.94rem',
                lineHeight: 1.65,
                maxInlineSize: '74ch',
              }}
            >
              {candidate.career_summary}
            </p>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '0.75rem',
              padding: '1rem 1.15rem',
              borderRadius: '10px',
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
              <Briefcase size={15} color="var(--primary)" />
              <span style={{ fontWeight: 600 }}>{candidate.role || 'Unknown'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
              <Building2 size={15} color="var(--primary)" />
              <span>
                {candidate.primary_industry || 'Unknown'}
                {candidate.secondary_industry ? ` · ${candidate.secondary_industry}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
              <FileText size={15} color="var(--primary)" />
              <span>{candidate.experience_level || 'Unknown'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
              <MapPin size={15} color="var(--primary)" />
              <span>{candidate.work_mode || 'Unknown'}</span>
            </div>
            {candidate.email && !blindMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
                <Mail size={15} color="var(--primary)" />
                <span>{candidate.email}</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
              Skills ({(candidate.skills || []).length})
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {(candidate.skills || []).map((skill) => (
                <span key={skill} className="skill-chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {((candidate.previous_roles && candidate.previous_roles.length > 0) ||
        (candidate.education && candidate.education.length > 0)) && (
        <section className="analytics-grid">
          {candidate.previous_roles && candidate.previous_roles.length > 0 && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', marginBottom: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={17} color="var(--primary)" /> Experience
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', borderInlineStart: '2px solid var(--border)', paddingInlineStart: '1.1rem' }}>
                {candidate.previous_roles.map((r, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        insetInlineStart: '-1.47rem',
                        insetBlockStart: '0.35rem',
                        inlineSize: '10px',
                        blockSize: '10px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        boxShadow: '0 0 0 3px var(--primary-soft)',
                      }}
                    />
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-heading)' }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {r.company}
                      {r.duration ? ` • ${r.duration}` : ''}
                    </div>
                    {r.highlights && r.highlights.length > 0 && (
                      <ul style={{ marginTop: '0.4rem', paddingInlineStart: '1.1rem', fontSize: '0.82rem', color: 'var(--foreground)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {r.highlights.slice(0, 3).map((h, hIdx) => (
                          <li key={hIdx}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {candidate.education && candidate.education.length > 0 && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', marginBottom: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GraduationCap size={18} color="var(--primary)" /> Education
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {candidate.education.map((edu, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.9rem 1rem',
                      borderRadius: '10px',
                      backgroundColor: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-heading)' }}>
                      {edu.degree}
                      {edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {edu.institution}
                      {edu.graduation_year ? ` · ${edu.graduation_year}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.05rem' }}>
            {blindMode ? 'Redacted resume' : 'Resume'}
          </h2>
          {blindMode && (
            <span className="badge badge-emerald">
              <ShieldCheck size={12} /> PII hidden
            </span>
          )}
        </div>
        <div className="resume-viewer font-mono">
          {renderHighlightedResume(candidate.resume_text || '', blindMode)}
        </div>
      </section>
    </>
  );
}
