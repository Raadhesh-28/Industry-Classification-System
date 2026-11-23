'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function DeleteProfileButton({
  candidateId,
  candidateName,
}: {
  candidateId: string;
  candidateName: string;
}) {
  const router = useRouter();

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete candidate ${candidateName || candidateId}?`
      )
    ) {
      try {
        const res = await apiFetch(`/candidates/${candidateId}`, { method: 'DELETE' });
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
    <button type="button" onClick={handleDelete} className="btn-danger-ghost">
      <Trash2 size={15} /> Delete
    </button>
  );
}
