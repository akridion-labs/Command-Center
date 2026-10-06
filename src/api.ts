interface Storage {
  size: string
}

export interface Health {
  model?: string
  storage?: Storage
  vault?: {
    total_chunks?: number
  }
  attention?: Array<{ title: string }>
}

export type Panel<T> =
  | ({ built: true } & T)
  | { built: false; why: string; unblocked_by?: string }

export async function get<T>(path: string): Promise<Panel<T>> {
  const r = await fetch(path, { credentials: 'same-origin' })
  if (r.status === 401) { location.href = '/vyom/login'; throw new Error('login') }
  if (r.status === 403) return { built: false, why: 'not permitted for your role' }
  if (r.status === 501) return { built: false, why: 'not implemented yet' }
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const data = await r.json()
  if (data && data.built === false) return { built: false, why: data.why ?? 'not built', unblocked_by: data.unblocked_by }
  return { ...data, built: true }
}

export interface SelfCheckRow {
  level: 'ok' | 'warn' | 'bad' | 'owe'
  area: string
  text: string
  fix?: string
}

export interface SelfCheckResponse {
  at: string
  rows: SelfCheckRow[]
}

export async function selfcheck(): Promise<Panel<SelfCheckResponse>> {
  const r = await fetch('/vyom/selfcheck', { credentials: 'same-origin' })
  if (r.status === 401) { location.href = '/vyom/login'; throw new Error('login') }
  if (r.status === 403) return { built: false, why: 'not permitted for your role' }
  if (r.status === 501) return { built: false, why: 'not implemented yet' }
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const data = await r.json()
  if (data && data.built === false) return { built: false, why: data.why ?? 'not built', unblocked_by: data.unblocked_by }
  return { ...data, built: true }
}

export interface DoctorCheck {
  name: string
  ok: boolean
  cause?: string
  do?: string
  detail?: string
  fixed?: boolean
}

export interface DoctorResponse {
  at: string
  checks: DoctorCheck[]
}

export async function doctor(): Promise<Panel<DoctorResponse>> {
  const r = await fetch('/vyom/doctor', { credentials: 'same-origin' })
  if (r.status === 401) { location.href = '/vyom/login'; throw new Error('login') }
  if (r.status === 403) return { built: false, why: 'not permitted for your role' }
  if (r.status === 501) return { built: false, why: 'not implemented yet' }
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const data = await r.json()
  if (data && data.built === false) return { built: false, why: data.why ?? 'not built', unblocked_by: data.unblocked_by }
  return { ...data, built: true }
}

export interface Model {
  name: string
  default: boolean
}

export interface BuildLoopEvidence {
  calls: number
  minutes: number
  slices_ok: number
  first_try: number
}

export interface ModelsResponse {
  default: string
  models: Model[]
  build_loop_evidence: Record<string, BuildLoopEvidence>
}

export async function models(): Promise<Panel<ModelsResponse>> {
  const r = await fetch('/vyom/models', { credentials: 'same-origin' })
  if (r.status === 401) { location.href = '/vyom/login'; throw new Error('login') }
  if (r.status === 403) return { built: false, why: 'not permitted for your role' }
  if (r.status === 501) return { built: false, why: 'not implemented yet' }
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const data = await r.json()
  if (data && data.built === false) return { built: false, why: data.why ?? 'not built', unblocked_by: data.unblocked_by }
  return { ...data, built: true }
}

export interface AskResult {
  answer: string
  sources?: Array<{
    title?: string
    url: string
    snippet: string
  }>
}

export async function ask(query: string, model?: string): Promise<Panel<AskResult> | null> {
  const r = await fetch('/vyom/ask', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, ...(model !== undefined && model !== '' ? { model } : {}) })
  })
  if (r.status === 401) { location.href = '/vyom/login'; return null }
  if (r.status === 403) return { built: false, why: 'not permitted for your role' }
  if (r.status === 501) return { built: false, why: 'not implemented yet' }
  if (r.status === 400) {
    const body = await r.json().catch(() => null)
    const code = body?.error ?? body?.why
    throw new Error(typeof code === 'string' ? `HTTP 400 ${code}` : 'HTTP 400')
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const data = await r.json()
  if (data && data.built === false) return { built: false, why: data.why || 'not implemented yet' }
  return {
    built: true,
    answer: typeof data?.answer === 'string' ? data.answer : '',
    sources: Array.isArray(data?.sources) ? data.sources : [],
  }
}
