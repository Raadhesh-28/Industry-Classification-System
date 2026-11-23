import DragDropUpload from '@/components/DragDropUpload';

export default function UploadPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Upload resumes</h1>
          <p className="page-subtitle">
            Add PDF or DOCX resumes to automatically extract skills, roles, and experience.
          </p>
        </div>
      </header>

      <DragDropUpload />
    </>
  );
}
