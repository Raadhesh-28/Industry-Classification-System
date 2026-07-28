'use client';

import { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle } from 'lucide-react';

export default function DragDropUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateAndAddFiles = (newFiles: File[]) => {
    setError(null);
    const validExtensions = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    let totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

    const validFiles = newFiles.filter(f => {
      if (!validExtensions.includes(f.type)) {
        setError('Unsupported file format. Please upload PDF or DOCX only.');
        return false;
      }
      if (totalSize + f.size > MAX_SIZE) {
        setError('Total upload size cannot exceed 25MB.');
        return false;
      }
      totalSize += f.size;
      return true;
    });

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (processingState !== 'idle') return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessingState('processing');
    setProgress(10);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process one or more resumes');
      }

      setProgress(100);
      setProcessingState('done');
    } catch (e: any) {
      setError(e.message || 'An error occurred during upload');
      setProcessingState('idle');
    }
  };

  const seedCSVRef = useRef<HTMLInputElement>(null);

  const handleSeedCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingState('processing');
    setProgress(30);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/seed', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to seed historical CSV');

      setProgress(100);
      setProcessingState('done');
    } catch (e: any) {
      setError(e.message || 'Error occurred during CSV seeding');
      setProcessingState('idle');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      
      {/* Sticky Note Progress Mockup Overlay (User Story 3 visual) */}
      {processingState === 'processing' && (
        <div style={{
          position: 'absolute', top: '10%', right: '10%', zIndex: 10,
          backgroundColor: '#fef08a', padding: '1.5rem', borderRadius: '4px',
          boxShadow: 'var(--shadow-lg)', transform: 'rotate(2deg)', width: '250px'
        }}>
          <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#3178c6', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />
          <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: '#854d0e' }}>Processing...</h4>
          <div style={{ width: '100%', height: '12px', backgroundColor: '#fef9c3', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.2s' }} />
          </div>
          <p style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 600, color: 'var(--primary)', fontSize: '0.875rem' }}>{Math.min(progress, 100)}%</p>
        </div>
      )}

      <div 
        className="card"
        style={{ 
          border: isDragOver ? '2px dashed var(--primary)' : '2px dashed var(--border)',
          backgroundColor: isDragOver ? '#f0f4f8' : 'var(--surface)',
          padding: '4rem 2rem', 
          textAlign: 'center',
          transition: 'all 0.2s',
          opacity: processingState === 'processing' ? 0.5 : 1
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud size={64} color={isDragOver ? 'var(--primary)' : '#cbd5e0'} style={{ margin: '0 auto 1.5rem auto' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '0.5rem' }}>Drag & Drop Resumes Here (PDF/DOCX)</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Limit 25MB total. Bulk upload supported.</p>
        
        <input 
          type="file" 
          multiple 
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files) validateAndAddFiles(Array.from(e.target.files));
          }}
        />
        
        <button 
          className="btn-primary" 
          onClick={() => fileInputRef.current?.click()}
          disabled={processingState !== 'idle'}
          style={{ backgroundColor: 'white', color: 'var(--text-heading)', border: '1px solid var(--border)' }}
        >
          Browse Files
        </button>
      </div>

      <div style={{ marginTop: '1rem', padding: '1.5rem', backgroundColor: '#fdf8f6', border: '1px dashed #ed8936', borderRadius: '8px', textAlign: 'center' }}>
        <h4 style={{ color: '#c05621', marginBottom: '0.5rem', fontWeight: 600 }}>Developer Zone: Restore Database</h4>
        <p style={{ color: '#dd6b20', fontSize: '0.875rem', marginBottom: '1rem' }}>Upload original Resume.csv to instantly seed database with hundreds of candidates.</p>
        <input 
          type="file" 
          accept=".csv" 
          style={{ display: 'none' }} 
          ref={seedCSVRef}
          onChange={handleSeedCSV}
        />
        <button 
          className="btn-primary" 
          onClick={() => seedCSVRef.current?.click()}
          disabled={processingState !== 'idle'}
          style={{ backgroundColor: '#dd6b20', color: 'white' }}
        >
          Seed Historical CSV
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff5f5', color: '#c53030', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '4px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {files.length > 0 && processingState !== 'processing' && processingState !== 'done' && (
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Staged Files ({files.length})</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '4px' }}>
                <File size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.875rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ))}
          </div>

          <button onClick={handleProcess} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
            Process Candidates
          </button>
        </div>
      )}

      {processingState === 'done' && (
        <div style={{ marginTop: '2rem', padding: '2rem', backgroundColor: '#f0fff4', color: '#276749', borderRadius: '8px', textAlign: 'center', border: '1px solid #c6f6d5' }}>
          <CheckCircle size={48} color="#48bb78" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Processing Complete!</h3>
          <p>Successfully processed {files.length} resume(s) using DistilBERT classification.</p>
          <button 
            className="btn-primary" 
            style={{ marginTop: '1.5rem', backgroundColor: 'transparent', color: '#2f855a', border: '1px solid #9ae6b4' }}
            onClick={() => { setFiles([]); setProcessingState('idle'); setProgress(0); }}
          >
            Upload More
          </button>
        </div>
      )}
    </div>
  );
}
