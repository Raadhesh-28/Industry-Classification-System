import Link from 'next/link';
import { ArrowLeft, User, FileText, Briefcase, MapPin, Building } from 'lucide-react';
import DeleteProfileButton from '@/components/DeleteProfileButton';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  let candidate;
  try {
    const res = await fetch(`http://localhost:8000/api/candidates/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Not found");
    candidate = await res.json();
  } catch (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Candidate Not Found</h2>
        <Link href="/dashboard/search">
          <button className="btn-primary">Return to Search</button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/dashboard/search" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          <ArrowLeft size={18} /> Back to Search
        </Link>
        <DeleteProfileButton candidateId={candidate.id} candidateName={candidate.name} />
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        <div style={{
          width: '96px', height: '96px', borderRadius: '50%', backgroundColor: '#e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <User size={48} color="#a0aec0" />
        </div>
        
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{candidate.name}</h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
              <Briefcase size={18} />
              <span>{candidate.role}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
              <Building size={18} />
              <span>{candidate.primary_industry || 'Unknown'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
              <FileText size={18} />
              <span>{candidate.experience_level || 'Unknown'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
              <MapPin size={18} />
              <span>{candidate.work_mode || 'Unknown'}</span>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Inferred Skills & Technologies</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(candidate.skills || []).map((skill: string) => (
                <span key={skill} style={{ backgroundColor: '#ebf4ff', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 500 }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User Story 10: Original Resume Preview Scrollable Area */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Original Resume Preview</h2>
      <div className="card" style={{ padding: '2rem', backgroundColor: '#fafafa' }}>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto', 
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.6',
          color: '#4a5568'
        }}>
          {candidate.resume_text}
        </div>
      </div>
    </div>
  );
}
