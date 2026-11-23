'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { apiJson, JDMatchResponse } from '@/lib/api';

const PRESET_JDS = [
  {
    label: 'Software Engineer',
    title: 'Senior Full-Stack Engineer',
    description: `We are looking for a Senior Full-Stack Engineer to help build our recruiting platform.
Requirements:
- 5+ years of experience with Python (FastAPI) and TypeScript/React (Next.js)
- Strong PostgreSQL and API design experience
- Experience integrating LLMs or search systems into production apps
- Cloud deployment experience with AWS, Docker, or Kubernetes`,
  },
  {
    label: 'Finance Lead',
    title: 'Corporate Finance & FP&A Manager',
    description: `We are hiring a Corporate Finance Lead to own quarterly forecasting, budgeting, and executive reporting.
Requirements:
- 6+ years in corporate finance, FP&A, or investment banking
- Advanced financial modeling, Excel, and variance analysis
- Experience partnering with leadership on strategic planning and cost optimization`,
  },
];

function MatchScoreRing({ score }: { score: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const strokeColor =
    score >= 75 ? 'var(--emerald)' : score >= 55 ? 'var(--amber)' : 'var(--danger)';

  return (
    <div style={{ position: 'relative', inlineSize: '66px', blockSize: '66px', flexShrink: 0 }}>
      <svg width="66" height="66" viewBox="0 0 66 66" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle
          cx="33"
          cy="33"
          r={radius}
          fill="none"
          stroke="var(--surface-subtle)"
          strokeWidth="6"
        />
        <circle
          cx="33"
          cy="33"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div
        className="tabular-nums"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: '0.92rem',
          fontWeight: 800,
          color: 'var(--text-heading)',
        }}
      >
        {score}%
      </div>
    </div>
  );
}

export default function JDMatcherPage() {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [topK, setTopK] = useState(5);
  const [blindMode, setBlindMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<JDMatchResponse | null>(null);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jobDescription.trim().length < 20) {
      setError('Please enter at least 20 characters for the job description.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<JDMatchResponse>('/match', {
        method: 'POST',
        body: JSON.stringify({
          job_title: jobTitle.trim() || undefined,
          job_description: jobDescription.trim(),
          top_k: topK,
          blind_mode: blindMode,
        }),
      });
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while matching candidates.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Job Match</h1>
          <p className="page-subtitle">
            Paste a job description to rank your best-fit candidates and spot skill gaps.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {PRESET_JDS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setJobTitle(preset.title);
                setJobDescription(preset.description);
              }}
              className="btn-secondary"
            >
              Sample: {preset.label}
            </button>
          ))}
        </div>
      </header>

      <form onSubmit={handleMatch} className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="jd-title" className="field-label">
              Job title
            </label>
            <input
              id="jd-title"
              type="text"
              className="input"
              placeholder="e.g., Senior Backend Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="jd-topk" className="field-label">
              Results
            </label>
            <select
              id="jd-topk"
              className="input"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            >
              <option value={3}>Top 3 candidates</option>
              <option value={5}>Top 5 candidates</option>
              <option value={10}>Top 10 candidates</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="jd-description" className="field-label">
            Job description
          </label>
          <textarea
            id="jd-description"
            className="input"
            rows={6}
            placeholder="Paste the role requirements, responsibilities, and must-have skills..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            required
            minLength={20}
            style={{ resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <label className={`toggle-pill ${blindMode ? 'active-emerald' : ''}`}>
            <input
              type="checkbox"
              checked={blindMode}
              onChange={(e) => setBlindMode(e.target.checked)}
              style={{ inlineSize: '15px', blockSize: '15px', cursor: 'pointer' }}
            />
            <ShieldCheck size={15} />
            <span>Blind mode (hide names &amp; PII)</span>
          </label>

          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.78rem 1.75rem' }}>
            <Sparkles size={16} />
            <span>{loading ? 'Processing...' : 'Find matches'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="alert-banner alert-error">
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="alert-banner alert-info">
            <Loader2 size={17} />
            <span>Processing...</span>
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: '210px' }} />
          ))}
        </div>
      )}

      {!loading && response && (
        <section aria-label="Matched candidates" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem' }}>
              Top matches ({response.evaluated_count})
            </h2>
            {response.blind_mode && (
              <span className="badge badge-emerald">
                <ShieldCheck size={12} /> Blind mode
              </span>
            )}
          </div>

          {response.matches.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No candidates in your pipeline yet. Upload resumes to start matching.
            </div>
          ) : (
            response.matches.map((item, idx) => (
              <article key={item.candidate.id} className="card" style={{ padding: '1.65rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', minWidth: 0 }}>
                    <MatchScoreRing score={item.match_score} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <span className="badge badge-neutral tabular-nums">#{idx + 1}</span>
                        <h3 style={{ fontSize: '1.12rem' }}>{item.candidate.name || 'Candidate'}</h3>
                        <span className="badge badge-primary">{item.candidate.role || item.candidate.primary_industry}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span>{item.candidate.primary_industry}</span>
                        <span>•</span>
                        <span>{item.candidate.experience_level}</span>
                        {item.candidate.work_mode && (
                          <>
                            <span>•</span>
                            <span>{item.candidate.work_mode}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/profile/${item.candidate.id}${blindMode ? '?blind=1' : ''}`}
                    className="btn-secondary"
                  >
                    <span>View profile</span>
                    <ChevronRight size={15} />
                  </Link>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '0.95rem 1.15rem',
                    fontSize: '0.9rem',
                    lineHeight: 1.65,
                    color: 'var(--foreground)',
                  }}
                >
                  {item.justification}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <CheckCircle2 size={14} /> Matching skills
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {item.matched_skills.length > 0 ? (
                        item.matched_skills.map((skill) => (
                          <span key={skill} className="badge badge-emerald">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None listed</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <AlertTriangle size={14} /> Missing skills
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {item.missing_skills.length > 0 ? (
                        item.missing_skills.map((skill) => (
                          <span key={skill} className="badge badge-amber">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No major gaps</span>
                      )}
                    </div>
                  </div>
                </div>

                {item.recommended_interview_questions.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.55rem' }}>
                      <MessageSquare size={14} color="var(--primary)" /> Suggested interview questions
                    </div>
                    <ol style={{ paddingInlineStart: '1.25rem', fontSize: '0.86rem', color: 'var(--foreground)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {item.recommended_interview_questions.map((q, qIdx) => (
                        <li key={qIdx}>{q}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      )}
    </>
  );
}
