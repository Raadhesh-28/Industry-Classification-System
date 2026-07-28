'use client';

import Link from 'next/link';
import { User, ChevronRight, Trash2 } from 'lucide-react';
import { Candidate } from '@/lib/mockData';

interface CandidateCardProps {
  candidate: Candidate;
  onDelete?: (id: string) => void;
}

export default function CandidateCard({ candidate, onDelete }: CandidateCardProps) {
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${candidate.name || candidate.id}?`)) {
      try {
        const res = await fetch(`http://localhost:8000/api/candidates/${candidate.id}`, { method: 'DELETE' });
        if (res.ok && onDelete) {
          onDelete(candidate.id);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };
  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', transition: 'all 0.2s', borderLeft: '4px solid transparent' }} 
         onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = 'var(--primary)')}
         onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = 'transparent')}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <User size={32} color="#a0aec0" />
        </div>
        
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>ID: {candidate.id}</span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{candidate.role}</h3>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{candidate.experience}</span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{candidate.workMode}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {candidate.skills.slice(0, 3).map(skill => (
              <span key={skill} style={{ backgroundColor: '#edf2f7', color: '#4a5568', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                {skill}
              </span>
            ))}
            {candidate.skills.length > 3 && (
              <span style={{ backgroundColor: '#edf2f7', color: '#4a5568', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                +{candidate.skills.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button 
          onClick={handleDelete}
          style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
          title="Delete Candidate"
        >
          <Trash2 size={20} />
        </button>
        <Link href={`/dashboard/profile/${candidate.id}`}>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            View Profile <ChevronRight size={16} />
          </button>
        </Link>
      </div>
    </div>
  );
}
