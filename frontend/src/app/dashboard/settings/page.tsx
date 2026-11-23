'use client';

import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  KeyRound,
  Lock,
} from 'lucide-react';
import {
  AIStatusResponse,
  AITestKeyResponse,
  apiJson,
  clearByokKey,
  getByokKey,
  getPreferredModel,
  setByokKey,
  setPreferredModel,
} from '@/lib/api';

export default function SettingsPage() {
  const [status, setStatus] = useState<AIStatusResponse | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-4-hydrogen');
  const [showKey, setShowKey] = useState(false);
  const [hasStoredByok, setHasStoredByok] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const refreshStatus = async () => {
    try {
      const data = await apiJson<AIStatusResponse>('/settings/ai-status');
      setStatus(data);
      setSelectedModel(getPreferredModel() || data.active_model);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      const existing = getByokKey();
      const existingModel = getPreferredModel();
      if (active) {
        if (existing) {
          setApiKeyInput(existing);
          setHasStoredByok(true);
        }
        if (existingModel) {
          setSelectedModel(existingModel);
        }
      }
      try {
        const data = await apiJson<AIStatusResponse>('/settings/ai-status');
        if (active) {
          setStatus(data);
          if (!existingModel) {
            setSelectedModel(data.active_model);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setFeedback(null);

    const trimmedKey = apiKeyInput.trim();
    const customHeaders: Record<string, string> = {
      'X-Gemini-Model': selectedModel,
    };
    if (trimmedKey) {
      customHeaders['X-Gemini-API-Key'] = trimmedKey;
    }

    try {
      const res = await apiJson<AITestKeyResponse>('/settings/test-ai-key', {
        method: 'POST',
        headers: customHeaders,
      });

      if (trimmedKey) {
        setByokKey(trimmedKey);
        setHasStoredByok(true);
      } else {
        clearByokKey();
        setHasStoredByok(false);
      }
      setPreferredModel(selectedModel);
      await refreshStatus();

      setFeedback({
        type: 'success',
        message:
          res.mode === 'byok'
            ? 'Connected using your API key.'
            : 'Connected using the default workspace key.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not verify API key.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearKey = async () => {
    clearByokKey();
    setApiKeyInput('');
    setHasStoredByok(false);
    setFeedback({
      type: 'success',
      message: 'API key removed. Switched back to the default key.',
    });
    await refreshStatus();
  };

  const availableModels = status?.available_models || [
    'gemini-4-hydrogen',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
  ];

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Connect your own Gemini API key or use the built-in default.
          </p>
        </div>

        <span
          className={`badge ${
            status?.active_mode === 'byok'
              ? 'badge-emerald'
              : status?.active_mode === 'server_default'
              ? 'badge-primary'
              : 'badge-amber'
          }`}
        >
          <KeyRound size={13} />
          {status?.active_mode === 'byok'
            ? 'Using your API key'
            : status?.active_mode === 'server_default'
            ? 'Using default key'
            : 'Basic mode'}
        </span>
      </header>

      <div className="alert-banner alert-emerald">
        <Lock size={17} style={{ flexShrink: 0 }} />
        <span>
          <strong>Privacy:</strong> Your API key is stored only in this browser tab and cleared
          automatically when you close it. It is never saved to our database.
        </span>
      </div>

      <section className="analytics-grid">
        <form
          onSubmit={handleSaveAndTest}
          className="card"
          style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div>
            <h2 style={{ fontSize: '1.08rem', marginBottom: '0.25rem' }}>
              API key
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Add a key from{' '}
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
              >
                Google AI Studio
              </a>{' '}
              to use your own quota, or leave blank for the default.
            </p>
          </div>

          <div>
            <label htmlFor="byok-gemini-key" className="field-label">
              Gemini API key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="byok-gemini-key"
                name="byok-gemini-key"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                placeholder="AIzaSy..."
                className="input font-mono"
                style={{ paddingRight: '2.75rem' }}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                aria-pressed={showKey}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  padding: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="gemini-model-select" className="field-label">
              Model
            </label>
            <select
              id="gemini-model-select"
              className="input font-mono"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Automatically falls back to another model if the selected one is busy.
            </p>
          </div>

          {feedback && (
            <div
              role="alert"
              className={`alert-banner ${feedback.type === 'success' ? 'alert-emerald' : 'alert-error'}`}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
              <span>{feedback.message}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <button type="submit" className="btn-primary" disabled={testing}>
              <ShieldCheck size={16} />
              <span>{testing ? 'Testing...' : 'Save & test'}</span>
            </button>

            {hasStoredByok && (
              <button type="button" onClick={handleClearKey} className="btn-danger-ghost">
                <Trash2 size={15} />
                <span>Remove key</span>
              </button>
            )}
          </div>
        </form>

        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <h2 style={{ fontSize: '1.08rem' }}>Current configuration</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              {
                label: 'Key source',
                value:
                  status?.active_mode === 'byok'
                    ? 'Your API key'
                    : status?.active_mode === 'server_default'
                    ? 'Default workspace key'
                    : 'Not configured',
              },
              {
                label: 'Active model',
                value: status?.active_model || selectedModel,
                mono: true,
              },
              {
                label: 'Key storage',
                value: hasStoredByok ? 'Browser tab only' : 'Server environment',
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  fontSize: '0.84rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{row.label}</span>
                <span
                  className={row.mono ? 'font-mono' : undefined}
                  style={{ color: 'var(--text-heading)', fontWeight: 600, textAlign: 'right' }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
