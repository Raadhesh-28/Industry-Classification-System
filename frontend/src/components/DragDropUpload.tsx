'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ProcessedResult {
  filename: string;
  status: string;
  candidate_id?: string | null;
  error?: string | null;
}

export default function DragDropUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'done'>('idle');
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const seedCSVRef = useRef<HTMLInputElement>(null);

  const validateAndAddFiles = (newFiles: File[]) => {
    setError(null);
    const validExtensions = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    let totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const MAX_SIZE = 25 * 1024 * 1024;

    const validFiles = newFiles.filter((f) => {
      const extOk =
        validExtensions.includes(f.type) ||
        f.name.toLowerCase().endsWith('.pdf') ||
        f.name.toLowerCase().endsWith('.docx');
      if (!extOk) {
        setError('Unsupported file format. Please upload PDF or DOCX files only.');
        return false;
      }
      if (totalSize + f.size > MAX_SIZE) {
        setError('Total upload size cannot exceed 25 MB.');
        return false;
      }
      totalSize += f.size;
      return true;
    });

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (processingState === 'processing') return;
    if (e.dataTransfer.files?.length) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessingState('processing');
    setError(null);
    setResults([]);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      const response = await apiFetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Could not process uploaded resumes.');
      }

      const data = (await response.json()) as ProcessedResult[];
      setResults(Array.isArray(data) ? data : []);
      setProcessingState('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong during upload.');
      setProcessingState('idle');
    }
  };

  const handleSeedCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingState('processing');
    setError(null);
    setResults([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiFetch('/seed', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Could not import CSV file.');
      const data = (await response.json()) as ProcessedResult[];
      setResults(Array.isArray(data) ? data : []);
      setProcessingState('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error importing CSV file.');
      setProcessingState('idle');
    }
  };

  const steps = [
    { icon: <FileText size={16} />, title: '1. Upload', desc: 'Drop PDF or DOCX resumes' },
    { icon: <ShieldCheck size={16} />, title: '2. Extract & anonymize', desc: 'Pull skills, roles, and hide PII' },
    { icon: <Search size={16} />, title: '3. Ready to search', desc: 'Searchable and matchable right away' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="kpi-grid">
        {steps.map((step) => (
          <div key={step.title} className="card" style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                inlineSize: '36px',
                blockSize: '36px',
                borderRadius: '9px',
                backgroundColor: 'var(--primary-soft)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {step.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                {step.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Dropzone */}
      <div
        className="card"
        style={{
          border: isDragOver ? '2px dashed var(--primary)' : '2px dashed var(--border-strong)',
          backgroundColor: isDragOver ? 'var(--primary-soft)' : 'var(--surface)',
          padding: '3.5rem 2rem',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          opacity: processingState === 'processing' ? 0.6 : 1,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div
          style={{
            inlineSize: '60px',
            blockSize: '60px',
            borderRadius: '16px',
            backgroundColor: 'var(--primary-soft)',
            color: 'var(--primary)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <UploadCloud size={28} />
        </div>

        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>
          Drop resumes here
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.86rem' }}>
          PDF or DOCX, up to 25 MB total. Duplicates are skipped automatically.
        </p>

        <input
          type="file"
          multiple
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files) validateAndAddFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
        />

        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={processingState === 'processing'}
        >
          Choose files
        </button>
      </div>

      {error && (
        <div role="alert" className="alert-banner alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {processingState === 'processing' && (
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--primary)', fontWeight: 600 }}>
            <Loader2 size={18} />
            <span>Processing...</span>
          </div>
          <div className="skeleton" style={{ height: '10px', borderRadius: '999px' }} />
        </div>
      )}

      {files.length > 0 && processingState === 'idle' && (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '0.95rem' }}>Ready to upload ({files.length})</h4>
            <button
              type="button"
              onClick={() => setFiles([])}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}
            >
              Clear
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxBlockSize: '240px', overflowY: 'auto' }}>
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 0.9rem',
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              >
                <FileText size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.86rem', fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.name}
                </span>
                <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {(f.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${f.name}`}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', padding: '0.2rem' }}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={handleProcess} className="btn-primary" style={{ inlineSize: '100%', padding: '0.88rem' }}>
            <UploadCloud size={16} />
            <span>Upload {files.length} file{files.length === 1 ? '' : 's'}</span>
          </button>
        </div>
      )}

      {processingState === 'done' && (
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <CheckCircle2 size={22} color="var(--emerald)" />
              <h3 style={{ fontSize: '1.1rem' }}>Upload complete</h3>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setFiles([]);
                setResults([]);
                setProcessingState('idle');
              }}
            >
              Upload more
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {results.map((res, idx) => (
              <div
                key={`${res.filename}-${idx}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                  <FileText size={15} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{res.filename}</span>
                  <span
                    className={`badge ${
                      res.status === 'Success'
                        ? 'badge-emerald'
                        : res.status.startsWith('Skipped')
                        ? 'badge-amber'
                        : 'badge-danger'
                    }`}
                  >
                    {res.status}
                  </span>
                </div>

                {res.candidate_id && res.candidate_id !== 'seeded_batch' ? (
                  <Link
                    href={`/dashboard/profile/${res.candidate_id}`}
                    style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    View profile <ChevronRight size={14} />
                  </Link>
                ) : res.error ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>{res.error}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible CSV Import */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <button
          type="button"
          onClick={() => setShowCsvImport((prev) => !prev)}
          style={{
            background: 'none',
            border: 'none',
            inlineSize: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.84rem',
            fontWeight: 600,
          }}
        >
          <span>Import from CSV</span>
          <ChevronDown
            size={16}
            style={{ transform: showCsvImport ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          />
        </button>

        {showCsvImport && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxInlineSize: '540px' }}>
              Import candidates in bulk from a CSV containing a <code className="font-mono">Resume_str</code> column (up to 200 rows per file).
            </p>
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              ref={seedCSVRef}
              onChange={handleSeedCSV}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => seedCSVRef.current?.click()}
              disabled={processingState === 'processing'}
            >
              Choose CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
