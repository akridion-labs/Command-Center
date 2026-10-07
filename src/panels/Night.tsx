import type { Panel } from '../api'
import { PanelShell } from '../PanelShell'

export interface NightResponse {
  /** Path of the report file on the server. */
  file: string
  /** When the report was written; "" when there is none. */
  at: string
  /** Plain text with #/## headings - shown as written, never as HTML. */
  markdown: string
}

export function NightPanel({ panel }: { panel: Panel<NightResponse> | null }) {
  return (
    <PanelShell title="Night Report" panel={panel}>
      {(p) => {
        if (!p.built) return null
        if (!p.markdown.trim()) return <div className="card-note">No night report yet</div>
        return (
          <div className="night-report">
            <div className="mono night-report-at">{p.at}</div>
            <div className="night-report-body">
              {p.markdown.split('\n').map((line, i) => (
                <div key={i} className="night-line">{line || ' '}</div>
              ))}
            </div>
          </div>
        )
      }}
    </PanelShell>
  )
}
