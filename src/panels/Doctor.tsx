import type { Panel, DoctorResponse, ModelsResponse } from '../api'
import type { Release } from '../Deck'
import { PanelShell } from '../PanelShell'
import { useEndpoint } from './Panels'
import { useEffect, useState } from 'react'

/** A shell command shown in monospace, selectable in one click, with a Copy button. */
function Command({ text }: { text: string }) {
  return (
    <span>
      <code className="mono" style={{ userSelect: 'all' }}>{text}</code>{' '}
      <button type="button" className="pill" onClick={() => { void navigator.clipboard?.writeText(text) }}>Copy</button>
    </span>
  )
}

/** Vyom's own checks from /vyom/doctor. Read-only: fixing stays `ojas doctor --fix`. */
export function DoctorPanel({ panel }: { panel: Panel<DoctorResponse> | null }) {
  const models = useEndpoint<ModelsResponse>('/vyom/models')
  // For releases, we'll fetch directly since it's a static file
  const [releases, setReleases] = useState<Release[]>([])

  useEffect(() => {
    // Load release history from static file - handle cases where fetch might not be available in test env
    const loadReleases = async () => {
      try {
        const response = await fetch('/console/releases.json')
        if (!response.ok) {
          setReleases([])
          return
        }
        const data = await response.json()
        setReleases(Array.isArray(data) ? data : [])
      } catch (error) {
        // In test environments or when fetch fails, we just show no releases
        setReleases([])
      }
    }

    loadReleases()
  }, [])

  return (
    <PanelShell title="Doctor" panel={panel}>
      {(p) => {
        if (!p.built) return null
        if (!p.checks.length) return <div className="card-note">no checks reported</div>

        return (
          <div>
            <ul>
              {p.checks.map((c) => (
                <li key={c.name} data-ok={String(c.ok)}>
                  <span>{c.ok ? '✓' : '✗'} {c.name}</span>
                  {c.fixed === true && <span className="badge">fixed automatically</span>}
                  {!c.ok && c.cause && <div className="card-note">{c.cause}</div>}
                  {!c.ok && c.do && <div className="card-note"><Command text={c.do} /></div>}
                  {c.detail && <div className="card-note">{c.detail}</div>}
                </li>
              ))}
            </ul>

            {/* Model information */}
            <div className="eyebrow">Models</div>
            {models?.built ? (
              <div>
                <div className="card-note">Default: {models.default}</div>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Calls</th>
                      <th>Minutes</th>
                      <th>Slices OK</th>
                      <th>First Try %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.models?.map((model) => {
                      const evidence = models.build_loop_evidence[model.name]
                      return (
                        <tr key={model.name} data-model={model.name}>
                          <td>{model.name}{model.default ? ' default' : ''}</td>
                          <td>{evidence?.calls ?? '-'}</td>
                          <td>{evidence?.minutes ?? '-'}</td>
                          <td>{evidence?.slices_ok ?? '-'}</td>
                          <td>{evidence?.first_try !== undefined && evidence.calls ? `${Math.round((evidence.first_try / evidence.calls) * 100)}%` : '-'}</td>
                        </tr>
                      )
                    }) || <tr><td colSpan={5}>No models available</td></tr>}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-note">Loading models...</div>
            )}

            {/* Release history */}
            <div className="eyebrow">Release History</div>
            {releases.length > 0 ? (
              <ul>
                {releases.map((release, index) => (
                  <li key={index} aria-label={`Release ${release.version}`}>
                    <span className="badge">{release.version}</span> • {release.date}
                    {release.commits && release.commits.length > 0 && (
                      <div className="card-note">Commits: {release.commits.join(', ')}</div>
                    )}
                    {release.slices && release.slices.length > 0 && (
                      <div className="card-note">
                        Slices: {release.slices.map((slice) => slice.title).join(', ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card-note">Loading releases...</div>
            )}
          </div>
        )
      }}
    </PanelShell>
  )
}
