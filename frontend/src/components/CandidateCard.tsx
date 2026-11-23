'use client';

import Link from 'next/link';
import { ChevronRight, Trash2, ShieldCheck, Sparkles, Briefcase, MapPin, Building2 } from 'lucide-react';
import { Candidate } from '@/lib/mockData';
import { apiFetch } from '@/lib/api';

interface CandidateCardProps {
  candidate: Candidate;
  similarityScore?: number;
  confidenceScore?: number | null;
  blindMode?: boolean;
  onDelete?: (id: string) => void;
}

export default function CandidateCard({
  candidate,
  similarityScore,
  confidenceScore,
  blindMode = false,
  onDelete,
}: CandidateCardProps) {
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${candidate.name || candidate.id}?`)) {
      try {
        const res = await apiFetch(`/candidates/${candidate.id}`, { method: 'DELETE' });
        if (res.ok && onDelete) {
          onDelete(candidate.id);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const initials = (candidate.name || 'UC')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      className="card card-interactive"
      style={{
        padding: '1.35rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.1rem', minWidth: 0, flex: '1 1 360px' }}>
        <div
          style={{
            inlineSize: '50px',
            blockSize: '50px',
            borderRadius: '13px',
            backgroundColor: blindMode ? 'var(--emerald-soft)' : 'var(--primary-soft)',
            color: blindMode ? 'var(--emerald)' : 'var(--primary)',
            border: blindMode ? '1px solid var(--emerald-border)' : '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.95rem',
            flexShrink: 0,
          }}
        >
          {blindMode ? <ShieldCheck size={24} /> : initials}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{candidate.name}</h3>
            <span className="badge badge-primary">{candidate.role}</span>

            {typeof similarityScore === 'number' && (
              <span className="badge badge-emerald tabular-nums">
                <Sparkles size={11} /> {Math.round(similarityScore * 100)}% match
              </span>
            )}

            {typeof confidenceScore === 'number' && (
              <span className="badge badge-neutral tabular-nums">
                {Math.round(confidenceScore * 100)}% confidence
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.9rem',
              flexWrap: 'wrap',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '0.65rem',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Building2 size={13} /> {candidate.industry}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Briefcase size={13} /> {candidate.experience}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <MapPin size={13} /> {candidate.workMode}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {candidate.skills.slice(0, 6).map((skill) => (
              <span key={skill} className="skill-chip">
                {skill}
              </span>
            ))}
            {candidate.skills.length > 6 && (
              <span className="skill-chip" style={{ color: 'var(--text-muted)' }}>
                +{candidate.skills.length - 6} more
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleDelete}
          className="btn-danger-ghost"
          style={{ padding: '0.55rem' }}
          title="Delete Candidate"
          aria-label={`Delete ${candidate.name}`}
        >
          <Trash2 size={16} />
        </button>
        <Link
          href={`/dashboard/profile/${candidate.id}${blindMode ? '?blind=1' : ''}`}
          className="btn-primary"
        >
          <span>View profile</span>
          <ChevronRight size={15} />
        </Link>
      </div>
    </article>
  );
}
