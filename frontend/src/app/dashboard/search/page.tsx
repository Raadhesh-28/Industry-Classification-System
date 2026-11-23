'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Search as SearchIcon,
  FilterX,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import CandidateCard from '@/components/CandidateCard';
import {
  apiJson,
  CandidateRecord,
  ReindexResponse,
  SemanticSearchResponse,
} from '@/lib/api';

interface DisplayCandidate {
  candidate: CandidateRecord;
  similarityScore?: number;
}

const SAMPLE_PROMPTS = [
  'Full-stack software engineer with Python and APIs',
  'Finance analyst with budgeting and forecasting',
  'Senior cloud engineer with AWS and Kubernetes',
];

export default function SearchPage() {
  const [queryText, setQueryText] = useState('');
  const [useSemantic, setUseSemantic] = useState(true);
  const [blindMode, setBlindMode] = useState(false);
  const [industry, setIndustry] = useState('');
  const [experience, setExperience] = useState('');
  const [workMode, setWorkMode] = useState('');

  const [results, setResults] = useState<DisplayCandidate[]>([]);
  const [activeSearchMode, setActiveSearchMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [reindexNotice, setReindexNotice] = useState<string | null>(null);

  const [uniqueIndustries, setUniqueIndustries] = useState<string[]>([]);
  const [uniqueExperiences, setUniqueExperiences] = useState<string[]>([]);
  const [uniqueWorkModes, setUniqueWorkModes] = useState<string[]>([]);

  useEffect(() => {
    apiJson<CandidateRecord[]>('/candidates?limit=200')
      .then((data) => {
        if (!Array.isArray(data)) return;
        setUniqueIndustries(
          Array.from(
            new Set(data.map((c) => c.primary_industry).filter((v): v is string => Boolean(v)))
          )
        );
        setUniqueExperiences(
          Array.from(
            new Set(data.map((c) => c.experience_level).filter((v): v is string => Boolean(v)))
          )
        );
        setUniqueWorkModes(
          Array.from(
            new Set(data.map((c) => c.work_mode).filter((v): v is string => Boolean(v)))
          )
        );
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true);
      const trimmedQuery = queryText.trim();

      try {
        if (useSemantic && trimmedQuery.length >= 2) {
          const params = new URLSearchParams({
            q: trimmedQuery,
            top_k: '20',
            blind_mode: String(blindMode),
          });
          if (industry) params.append('industry', industry);
          if (experience) params.append('experience', experience);
          if (workMode) params.append('work_mode', workMode);

          const data = await apiJson<SemanticSearchResponse>(
            `/candidates/search?${params.toString()}`
          );
          setActiveSearchMode(data.search_mode);
          setResults(
            data.results.map((item) => ({
              candidate: item.candidate,
              similarityScore: item.similarity_score,
            }))
          );
        } else {
          const params = new URLSearchParams({
            limit: '100',
            blind_mode: String(blindMode),
          });
          if (trimmedQuery) params.append('keyword', trimmedQuery);
          if (industry) params.append('industry', industry);
          if (experience) params.append('experience', experience);
          if (workMode) params.append('work_mode', workMode);

          const data = await apiJson<CandidateRecord[]>(`/candidates?${params.toString()}`);
          setActiveSearchMode(null);
          setResults((Array.isArray(data) ? data : []).map((candidate) => ({ candidate })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchFiltered, 320);
    return () => clearTimeout(timeoutId);
  }, [queryText, useSemantic, blindMode, industry, experience, workMode]);

  const handleReindex = async () => {
    setReindexing(true);
    setReindexNotice(null);
    try {
      const res = await apiJson<ReindexResponse>('/candidates/reindex?batch_size=25', {
        method: 'POST',
      });
      setReindexNotice(
        res.processed === 0
          ? 'All candidate profiles are up to date.'
          : `Updated ${res.embedded} of ${res.processed} profiles.`
      );
    } catch (err) {
      setReindexNotice(err instanceof Error ? err.message : 'Unable to refresh search index.');
    } finally {
      setReindexing(false);
    }
  };

  const clearFilters = () => {
    setQueryText('');
    setIndustry('');
    setExperience('');
    setWorkMode('');
  };

  const downloadCSV = () => {
    if (results.length === 0) return;

    const headers = [
      'ID',
      'Name',
      'Role',
      'Industry',
      'Experience',
      'Work Mode',
      'Skills',
      'Match',
    ];
    const csvContent = [
      headers.join(','),
      ...results.map(({ candidate: c, similarityScore }) =>
        `"${c.id}","${c.name || ''}","${c.role || ''}","${c.primary_industry || ''}","${c.experience_level || ''}","${c.work_mode || ''}","${(c.skills || []).join('; ')}","${typeof similarityScore === 'number' ? `${Math.round(similarityScore * 100)}%` : ''}"`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `candidates_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p className="page-subtitle">
            Search by role, skills, or plain-English descriptions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleReindex}
            className="btn-secondary"
            disabled={reindexing}
          >
            <RefreshCw size={15} />
            <span>{reindexing ? 'Refreshing...' : 'Refresh index'}</span>
          </button>
          <button
            type="button"
            onClick={downloadCSV}
            className="btn-secondary"
            disabled={results.length === 0 || loading}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {reindexNotice && <div className="alert-banner alert-info">{reindexNotice}</div>}

      {blindMode && (
        <div className="alert-banner alert-emerald">
          <ShieldCheck size={18} />
          <span>
            <strong>Blind mode is on.</strong> Candidate names, emails, and schools are hidden.
          </span>
        </div>
      )}

      <section className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div style={{ position: 'relative' }}>
          {useSemantic ? (
            <Sparkles
              size={19}
              color="var(--primary)"
              style={{
                position: 'absolute',
                insetInlineStart: '1rem',
                insetBlockStart: '50%',
                transform: 'translateY(-50%)',
              }}
            />
          ) : (
            <SearchIcon
              size={19}
              color="var(--text-muted)"
              style={{
                position: 'absolute',
                insetInlineStart: '1rem',
                insetBlockStart: '50%',
                transform: 'translateY(-50%)',
              }}
            />
          )}
          <input
            type="search"
            enterKeyHint="search"
            placeholder={
              useSemantic
                ? 'Search candidates, e.g. "Senior Python engineer with fintech experience"'
                : 'Filter by exact keyword...'
            }
            className="input"
            style={{ paddingInlineStart: '2.9rem', fontSize: '0.96rem', paddingBlock: '0.85rem' }}
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Examples:
          </span>
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample}
              type="button"
              className="prompt-chip"
              onClick={() => {
                setUseSemantic(true);
                setQueryText(sample);
              }}
            >
              {sample}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label className={`toggle-pill ${useSemantic ? 'active-primary' : ''}`}>
            <input
              type="checkbox"
              checked={useSemantic}
              onChange={(e) => setUseSemantic(e.target.checked)}
              style={{ inlineSize: '15px', blockSize: '15px', cursor: 'pointer' }}
            />
            <Sparkles size={14} />
            <span>Smart search</span>
          </label>

          <label className={`toggle-pill ${blindMode ? 'active-emerald' : ''}`}>
            <input
              type="checkbox"
              checked={blindMode}
              onChange={(e) => setBlindMode(e.target.checked)}
              style={{ inlineSize: '15px', blockSize: '15px', cursor: 'pointer' }}
            />
            <ShieldCheck size={14} />
            <span>Blind mode</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input"
            style={{ flex: '1 1 180px' }}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-label="Filter by industry"
          >
            <option value="">All industries</option>
            {uniqueIndustries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          <select
            className="input"
            style={{ flex: '1 1 180px' }}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            aria-label="Filter by experience level"
          >
            <option value="">All experience levels</option>
            {uniqueExperiences.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>

          <select
            className="input"
            style={{ flex: '1 1 180px' }}
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            aria-label="Filter by work mode"
          >
            <option value="">All work modes</option>
            {uniqueWorkModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>

          {(queryText || industry || experience || workMode) && (
            <button type="button" onClick={clearFilters} className="btn-danger-ghost">
              <FilterX size={15} /> Clear
            </button>
          )}
        </div>
      </section>

      <section aria-label="Search results" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p className="tabular-nums" style={{ color: 'var(--text-muted)', fontSize: '0.86rem', fontWeight: 500 }}>
            {results.length} candidate{results.length === 1 ? '' : 's'}
          </p>
          {activeSearchMode && (
            <span className={`badge ${activeSearchMode === 'vector' ? 'badge-emerald' : 'badge-neutral'}`}>
              {activeSearchMode === 'vector' ? 'Sorted by relevance' : 'Keyword match'}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '126px' }} />
            ))}
          </div>
        ) : results.length > 0 ? (
          results.map(({ candidate, similarityScore }) => (
            <CandidateCard
              key={candidate.id}
              candidate={{
                id: candidate.id,
                name: candidate.name || 'Unnamed Candidate',
                role: candidate.role || 'Unknown Role',
                industry: candidate.primary_industry || 'Unknown',
                experience: candidate.experience_level || 'Unknown',
                workMode: candidate.work_mode || 'Unknown',
                resumeText: candidate.resume_text || '',
                skills: candidate.skills || [],
              }}
              similarityScore={similarityScore}
              confidenceScore={candidate.confidence_score}
              blindMode={blindMode}
              onDelete={(id) => setResults((prev) => prev.filter((item) => item.candidate.id !== id))}
            />
          ))
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <SearchIcon size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>No candidates found</h3>
            <p style={{ fontSize: '0.88rem' }}>Try broadening your search or clearing filters.</p>
          </div>
        )}
      </section>
    </>
  );
}
