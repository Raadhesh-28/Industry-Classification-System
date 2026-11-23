'use client';

import Link from 'next/link';
import {
  Users,
  Sparkles,
  ShieldCheck,
  Building2,
  UploadCloud,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import TopCard from '@/components/TopCard';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useEffect, useState } from 'react';
import { apiJson, CandidateRecord } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson<CandidateRecord[]>('/candidates?limit=200')
      .then((data) => {
        setCandidates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const totalCandidates = candidates.length;
  const uniqueIndustries = new Set(
    candidates.map((c) => c.primary_industry).filter(Boolean)
  ).size;

  const blindReadyCount = candidates.filter((c) => c.is_blind_mode_ready).length;
  const blindReadyPct =
    totalCandidates > 0 ? Math.round((blindReadyCount / totalCandidates) * 100) : 0;

  const confidenceScores = candidates
    .map((c) => c.confidence_score)
    .filter((v): v is number => typeof v === 'number');
  const avgConfidence =
    confidenceScores.length > 0
      ? Math.round(
          (confidenceScores.reduce((sum, val) => sum + val, 0) / confidenceScores.length) *
            100
        )
      : null;

  const industryCounts: Record<string, number> = {};
  const expCounts: Record<string, number> = {};
  const skillCounts: Record<string, number> = {};

  candidates.forEach((c) => {
    if (c.primary_industry) {
      industryCounts[c.primary_industry] = (industryCounts[c.primary_industry] || 0) + 1;
    }
    if (c.experience_level) {
      let label = 'Entry';
      if (c.experience_level.includes('Mid')) label = 'Mid-Level';
      if (c.experience_level.includes('Senior')) label = 'Senior';
      if (c.experience_level.includes('Executive')) label = 'Executive';
      expCounts[label] = (expCounts[label] || 0) + 1;
    }
    (c.skills || []).forEach((skill) => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
  });

  const pieData = Object.keys(industryCounts)
    .map((key) => ({ name: key, value: industryCounts[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const barData = ['Entry', 'Mid-Level', 'Senior', 'Executive']
    .filter((k) => expCounts[k])
    .map((key) => ({ name: key, count: expCounts[key] }));

  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxSkillCount = topSkills[0]?.[1] || 1;

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  if (loading) {
    return (
      <>
        <div className="skeleton" style={{ height: '42px', width: '320px' }} />
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: '120px' }} />
          ))}
        </div>
        <div className="analytics-grid">
          <div className="skeleton" style={{ height: '360px' }} />
          <div className="skeleton" style={{ height: '360px' }} />
        </div>
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {firstName}</h1>
          <p className="page-subtitle">
            Here&apos;s a snapshot of your active candidate pipeline.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/match" className="btn-primary">
            <Sparkles size={16} /> Match a role
          </Link>
          <Link href="/dashboard/upload" className="btn-secondary">
            <UploadCloud size={16} /> Upload resumes
          </Link>
        </div>
      </header>

      <section className="kpi-grid" aria-label="Key metrics">
        <TopCard
          title="Total candidates"
          value={totalCandidates.toLocaleString()}
          subtitle="In your pipeline"
          icon={<Users size={20} />}
          accent="primary"
        />
        <TopCard
          title="Avg. confidence"
          value={avgConfidence !== null ? `${avgConfidence}%` : '—'}
          subtitle="Across classified resumes"
          icon={<Sparkles size={20} />}
          accent="amber"
        />
        <TopCard
          title="Blind-ready"
          value={`${blindReadyPct}%`}
          subtitle={`${blindReadyCount} of ${totalCandidates} anonymized`}
          icon={<ShieldCheck size={20} />}
          accent="emerald"
        />
        <TopCard
          title="Industries"
          value={uniqueIndustries}
          subtitle="Active categories"
          icon={<Building2 size={20} />}
          accent="neutral"
        />
      </section>

      <section className="analytics-grid" aria-label="Talent charts">
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', blockSize: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem' }}>Industries</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Top 5 across your pool</p>
            </div>
            <span className="badge badge-neutral tabular-nums">{totalCandidates} total</span>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              {pieData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={98}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      color: 'var(--text-heading)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                    formatter={(value) => [`${value} candidate(s)`, 'Count']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.78rem' }} />
                </PieChart>
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', blockSize: '100%', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Upload resumes to see industry trends.
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', blockSize: '380px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem' }}>Experience levels</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Breakdown by seniority</p>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              {barData.length > 0 ? (
                <BarChart data={barData} margin={{ top: 12, right: 16, left: -12, bottom: 5 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      color: 'var(--text-heading)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                    cursor={{ fill: 'var(--primary-soft)' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" barSize={44} radius={[8, 8, 0, 0]} />
                </BarChart>
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', blockSize: '100%', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No experience data yet.
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="analytics-grid" aria-label="Skills and recent activity">
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.15rem' }}>
            <h2 style={{ fontSize: '1.05rem' }}>Top skills</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Most common skills across candidates</p>
          </div>

          {topSkills.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {topSkills.map(([skill, count]) => {
                const widthPct = Math.max(12, Math.round((count / maxSkillCount) * 100));
                return (
                  <div key={skill} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{skill}</span>
                      <span className="tabular-nums" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        {count} candidate{count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div
                      style={{
                        blockSize: '7px',
                        borderRadius: '999px',
                        backgroundColor: 'var(--surface-subtle)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          inlineSize: `${widthPct}%`,
                          blockSize: '100%',
                          borderRadius: '999px',
                          background: 'linear-gradient(90deg, #4f46e5 0%, #818cf8 100%)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No skills yet. Upload resumes to see common skills.
            </p>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem' }}>Recent uploads</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Latest candidates added</p>
            </div>
            <Link
              href="/dashboard/search"
              style={{
                fontSize: '0.8rem',
                color: 'var(--primary)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {candidates.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {candidates.slice(0, 5).map((cand) => {
                const initials = (cand.name || 'UC')
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <Link
                    key={cand.id}
                    href={`/dashboard/profile/${cand.id}`}
                    className="card-interactive"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 0.9rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-elevated)',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div
                        style={{
                          inlineSize: '36px',
                          blockSize: '36px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--primary-soft)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            color: 'var(--text-heading)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {cand.name || 'Unnamed Candidate'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {cand.role || cand.primary_industry}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      {typeof cand.confidence_score === 'number' && (
                        <span className="badge badge-primary tabular-nums">
                          {Math.round(cand.confidence_score * 100)}%
                        </span>
                      )}
                      <ChevronRight size={15} color="var(--text-muted)" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', flex: 1, textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.88rem', marginBottom: '1rem' }}>
                No candidates added yet.
              </p>
              <Link href="/dashboard/upload" className="btn-primary">
                <UploadCloud size={15} /> Upload resumes
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
