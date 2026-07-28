'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function DeleteProfileButton({ candidateId, candidateName }: { candidateId: string, candidateName: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete candidate ${candidateName || candidateId}?`)) {
      try {
        const res = await fetch(`http://localhost:8000/api/candidates/${candidateId}`, { method: 'DELETE' });
        if (res.ok) {
          router.push('/dashboard/search');
          router.refresh();
        } else {
          alert('Failed to delete candidate.');
        }
      } catch (err) {
        console.error(err);
        alert('Network error while deleting.');
      }
    }
  };

  return (
    <button 
      onClick={handleDelete}
      className="btn-primary" 
      style={{ backgroundColor: '#fff', color: '#e53e3e', border: '1px solid #e53e3e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      <Trash2 size={18} /> Delete Candidate
    </button>
  );
}
