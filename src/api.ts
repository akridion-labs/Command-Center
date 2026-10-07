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
