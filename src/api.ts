export type Panel<T> =
  | ({ built: true } & T)
  | { built: false; why: string; unblocked_by?: string }

export async function get<T>(path: string): Promise<Panel<T>> {
  const r = await fetch(path, { credentials: 'same-origin' })
  if (r.status === 401) { location.href = '/vyom/login'; throw new Error('login') }
  if (r.status === 403) return { built: false, why: 'not permitted for your role' }
  if (r.status === 501) return { built: false, why: 'not implemented yet' }
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}