export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000/api';

const TOKEN_STORAGE_KEY = 'strata_access_token';
const LEGACY_TOKEN_KEY = 'talentai_access_token';
const BYOK_KEY_SESSION_STORAGE = 'strata_byok_gemini_key';
const BYOK_MODEL_SESSION_STORAGE = 'strata_byok_gemini_model';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'recruiter' | 'hiring_manager' | 'admin' | string;
  is_active: boolean;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface CandidateRecord {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  primary_industry?: string | null;
  secondary_industry?: string | null;
  confidence_score?: number | null;
  experience_level?: string | null;
  work_mode?: string | null;
  resume_text?: string | null;
  redacted_resume_text?: string | null;
  is_blind_mode_ready?: boolean;
  skills: string[];
  education?: Array<{
    institution?: string;
    degree?: string;
    field_of_study?: string | null;
    graduation_year?: string | null;
  }>;
  previous_roles?: Array<{
    title?: string;
    company?: string;
    duration?: string | null;
    highlights?: string[];
  }>;
  career_summary?: string | null;
  uploaded_by_id?: string | null;
  created_at?: string | null;
}

export interface SemanticSearchResultItem {
  candidate: CandidateRecord;
  similarity_score: number;
}

export interface SemanticSearchResponse {
  query: string;
  search_mode: 'vector' | 'keyword_fallback';
  blind_mode: boolean;
  total: number;
  results: SemanticSearchResultItem[];
}

export interface JDMatchRequest {
  job_title?: string;
  job_description: string;
  top_k?: number;
  industry?: string;
  experience?: string;
  work_mode?: string;
  blind_mode?: boolean;
}

export interface JDMatchResultItem {
  candidate: CandidateRecord;
  vector_similarity: number;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  justification: string;
  recommended_interview_questions: string[];
}

export interface JDMatchResponse {
  job_title?: string | null;
  blind_mode: boolean;
  evaluated_count: number;
  search_mode: 'vector' | 'keyword_fallback';
  evaluation_mode: 'gemini_agent' | 'heuristic_fallback';
  matches: JDMatchResultItem[];
}

export interface ReindexResponse {
  processed: number;
  embedded: number;
  remaining_without_embeddings: number;
}

export interface AIStatusResponse {
  active_mode: 'byok' | 'server_default' | 'heuristic_only';
  server_default_configured: boolean;
  active_model: string;
  embedding_model: string;
  embedding_dimensions: number;
  available_models: string[];
}

export interface AITestKeyResponse {
  valid: boolean;
  mode: 'byok' | 'server_default';
  model: string;
  embedding_dimensions: number;
  message: string;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem(TOKEN_STORAGE_KEY) ||
    window.localStorage.getItem(LEGACY_TOKEN_KEY)
  );
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
}

// --- Zero-Storage BYOK Helpers (ephemeral sessionStorage only; cleared when tab closes) ---

export function getByokKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(BYOK_KEY_SESSION_STORAGE);
  } catch {
    return null;
  }
}

export function setByokKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = apiKey.trim();
    if (clean) {
      window.sessionStorage.setItem(BYOK_KEY_SESSION_STORAGE, clean);
    } else {
      window.sessionStorage.removeItem(BYOK_KEY_SESSION_STORAGE);
    }
    window.dispatchEvent(new Event('strata-byok-change'));
  } catch {
    // ignore storage quota/privacy restrictions
  }
}

export function clearByokKey(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(BYOK_KEY_SESSION_STORAGE);
    window.sessionStorage.removeItem(BYOK_MODEL_SESSION_STORAGE);
    window.dispatchEvent(new Event('strata-byok-change'));
  } catch {
    // ignore
  }
}

export function getPreferredModel(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(BYOK_MODEL_SESSION_STORAGE);
  } catch {
    return null;
  }
}

export function setPreferredModel(model: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (model.trim()) {
      window.sessionStorage.setItem(BYOK_MODEL_SESSION_STORAGE, model.trim());
    } else {
      window.sessionStorage.removeItem(BYOK_MODEL_SESSION_STORAGE);
    }
    window.dispatchEvent(new Event('strata-byok-change'));
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken();
  const byokKey = getByokKey();
  const preferredModel = getPreferredModel();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (byokKey && !headers.has('X-Gemini-API-Key')) {
    headers.set('X-Gemini-API-Key', byokKey);
  }
  if (preferredModel && !headers.has('X-Gemini-Model')) {
    headers.set('X-Gemini-Model', preferredModel);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && token) {
    clearStoredToken();
  }

  return response;
}

export async function apiJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await apiFetch(path, { ...options, headers });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.detail === 'string') {
        message = errorBody.detail;
      } else if (Array.isArray(errorBody?.detail) && errorBody.detail[0]?.msg) {
        message = errorBody.detail[0].msg;
      }
    } catch {
      // ignore non-JSON error body
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
