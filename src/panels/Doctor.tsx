import type { Panel, DoctorResponse } from '../api'
import { PanelShell } from '../PanelShell'

/** A shell command shown in monospace, selectable in one click, with a Copy button. */
function Command({ text }: { text: string }) {
  return (
    <span>
      <code className="mono" style={{ userSelect: 'all' }}>{text}</code>{' '}
      <button type="button" className="pill" onClick={() => { void navigator.clipboard?.writeText(text) }}>Copy</button>
    </span>
  )
}

/** Vyom's own checks from /vyom/doctor. Read-only: fixing stays `ojas doctor --fix`. Models and releases live in the Deck's own sections. */
export function DoctorPanel({ panel }: { panel: Panel<DoctorResponse> | null }) {
  return (
    <PanelShell title="Doctor" panel={panel}>
      {(p) => {
        if (!p.built) return null
        if (!p.checks.length) return <div className="card-note">no checks reported</div>

        return (
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
        )
      }}
    </PanelShell>
  )
}
