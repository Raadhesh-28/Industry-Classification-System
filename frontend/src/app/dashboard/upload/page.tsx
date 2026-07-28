import DragDropUpload from '@/components/DragDropUpload';

export default function UploadPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Resume Ingestion Pipeline</h1>
        <p style={{ color: 'var(--text-muted)' }}>Bulk upload resumes to automatically extract tags, verify history, and assign industry vectors.</p>
      </div>

      <div style={{ maxWidth: '800px' }}>
        <DragDropUpload />
      </div>
    </div>
  );
}
