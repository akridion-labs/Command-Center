import { NotBuilt } from '../NotBuilt'
import type { Panel } from '../api'

export interface Release {
  version: string
  date: string
  since: string
  commits: string[]
  slices: Array<{ id: string; title: string; commit: string; date: string; tests: number }>
  fixes: string[]
  other: string[]
}

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string')

function isSlice(v: unknown): v is Release['slices'][number] {
  const s = v as Record<string, unknown> | null
  return !!s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.commit === 'string'
    && typeof s.date === 'string' && typeof s.tests === 'number'
}

/** One malformed entry must not take the deck down: it renders NOT BUILT, the rest still render. */
export function isRelease(v: unknown): v is Release {
  const r = v as Record<string, unknown> | null
  return !!r && typeof r.version === 'string' && typeof r.date === 'string' && typeof r.since === 'string'
    && isStrings(r.commits) && isStrings(r.fixes) && isStrings(r.other)
    && Array.isArray(r.slices) && r.slices.every(isSlice)
}

/** `./releases.json` next to the app (public/): no API call, nothing external. */
export function loadReleases(): Promise<Panel<{ releases: unknown[] }>> {
  return fetch(`${import.meta.env.BASE_URL}releases.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })
    .then((data: unknown): Panel<{ releases: unknown[] }> => {
      if (!Array.isArray(data)) return { built: false, why: 'releases.json is not an array' }
      if (!data.length) return { built: false, why: 'no releases recorded yet' }
      return { built: true, releases: data }
    })
    .catch(() => ({ built: false, why: 'releases.json unreachable' }))
}

function Items({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="release-group">
      <div className="eyebrow">{label}</div>
      {items.length ? items.map((t, i) => <div key={i} className="release-item mono">{t}</div>) : <div className="card-note">none</div>}
    </div>
  )
}

export function ReleasesSection({ panel }: { panel: Panel<{ releases: unknown[] }> | null }) {
  if (!panel) return null
  return (
    <div className="cd-grid">
      <div className="sp4 section-label" id="sec-releases">Releases</div>
      {panel.built ? (
        <div className="card sp2" aria-label="Release History">
          <div className="card-title">Release History</div>
          <ul>
            {panel.releases.map((release, index) => (
              isRelease(release) ? (
                <li key={index}>
                  <div className="eyebrow">{release.version} • {release.date}</div>
                  <p>{release.since}</p>
                  <p>Commits: {release.commits.join(', ')}</p>
                  <Items label="Slices" items={release.slices.map((s) => `${s.id} ${s.title} (${s.commit}, ${s.date}, ${s.tests} tests)`)} />
                  <Items label="Fixes" items={release.fixes} />
                  <Items label="Other" items={release.other} />
                </li>
              ) : (
                <li key={index}><NotBuilt panel={{ built: false, why: `release #${index + 1} is malformed` }} /></li>
              )
            ))}
          </ul>
        </div>
      ) : (
        <NotBuilt panel={panel} />
      )}
    </div>
  )
}
