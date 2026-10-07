import type { Panel } from '../api'
import { PanelShell } from '../PanelShell'

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

// Extended model type with fitness information
export interface FitnessModel extends Model {
  fit?: boolean
  fit_why?: string
  tests?: string[]
}

export interface FitnessModelsResponse {
  default: string
  models: FitnessModel[]
  build_loop_evidence: Record<string, BuildLoopEvidence>
}

/** first_try counts slices that passed on the first try, out of slices_ok. */
export function firstTryPercent(e: BuildLoopEvidence | undefined): string {
  if (!e || !e.slices_ok) return '-'
  return `${Math.round((e.first_try / e.slices_ok) * 100)}%`
}

export function FitnessModelsPanel({ panel }: { panel: Panel<FitnessModelsResponse> | null }) {
  return (
    <PanelShell title="Models" panel={panel}>
      {(p) => {
        if (!p.built) return null
        if (!p.models.length) return <div className="card-note">no local models installed</div>
        return (
          <>
            <div className="card-note">Default model: <span className="mono">{p.default}</span></div>
            <table className="model-table" aria-label="Build loop evidence">
              <thead>
                <tr><th>Model</th><th>Calls</th><th>Minutes</th><th>Slices OK</th><th>First try</th><th>Fit Status</th><th>Tests</th></tr>
              </thead>
              <tbody>
                {p.models.map((m) => {
                  const e = p.build_loop_evidence[m.name]
                  return (
                    <tr key={m.name} data-model={m.name}>
                      <td className="mono">{m.name}{m.default && <span className="badge"> default</span>}</td>
                      <td>{e ? e.calls : '-'}</td>
                      <td>{e ? e.minutes : '-'}</td>
                      <td>{e ? e.slices_ok : '-'}</td>
                      <td>{firstTryPercent(e)}</td>
                      <td>
                        {m.fit === true ? (
                          <span className="fit-status fit">✓</span>
                        ) : m.fit === false ? (
                          <span className="fit-status unfit">✗</span>
                        ) : (
                          <span className="fit-status not-checked">not checked</span>
                        )}
                        {m.fit_why && m.fit === false && (
                          <div className="fit-why">{m.fit_why}</div>
                        )}
                      </td>
                      <td>
                        {m.tests && m.tests.length > 0 ? (
                          <ul className="model-tests">
                            {m.tests.map((test, i) => (
                              <li key={i} className="test-item">{test}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="no-tests">No tests</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )
      }}
    </PanelShell>
  )
}

/** The Models section: the panel, plus Retry when /vyom/models could not be reached. */
export function FitnessModelsSection({ panel, onRetry }: { panel: Panel<FitnessModelsResponse> | null; onRetry?: () => void }) {
  const failed = panel !== null && !panel.built && panel.why.endsWith('unreachable')
  return (
    <div className="cd-grid">
      <div className="sp4 section-label" id="sec-models">Models</div>
      <FitnessModelsPanel panel={panel} />
      {failed && onRetry && <button type="button" className="pill" onClick={onRetry}>Retry</button>}
    </div>
  )
}