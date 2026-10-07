import { useState } from 'react'
import type { Panel } from '../api'
import { PanelShell } from '../PanelShell'

export type BuildState = 'done' | 'look' | 'parked' | 'needs_you' | 'reopened' | 'todo' | 'yours'

export interface BuildSlice {
  id: string
  title: string
  state: BuildState
  status: string
  /** The command to run, or "" when there is none. */
  next: string
}

export interface BuildResponse {
  slices: BuildSlice[]
  count: Partial<Record<BuildState, number>>
  finished_by: Record<string, number>
}

/** Groups in the order the morning check reads them. */
export const STATE_LABELS: [BuildState, string][] = [
  ['done', 'done'],
  ['look', 'waiting for your look'],
  ['parked', 'parked'],
  ['needs_you', 'needs you'],
  ['reopened', 'reopened'],
  ['yours', 'yours'],
  ['todo', 'to do'],
]

type CopyResult = 'idle' | 'copied' | 'failed'

function CopyCommand({ text }: { text: string }) {
  const [result, setResult] = useState<CopyResult>('idle')
  const copy = () => {
    const clip = typeof navigator === 'undefined' ? undefined : navigator.clipboard
    if (!clip) { setResult('failed'); return }
    clip.writeText(text).then(() => setResult('copied'), () => setResult('failed'))
  }
  return (
    <div className="slice-next">
      <code className="mono">{text}</code>{' '}
      <button type="button" className="pill copy-button" onClick={copy}>Copy</button>
      {result === 'copied' && <span className="card-note"> copied</span>}
      {result === 'failed' && <span className="card-note" role="alert"> copy failed - select the command and copy it by hand</span>}
    </div>
  )
}

export function BuildPanel({ panel }: { panel: Panel<BuildResponse> | null }) {
  return (
    <PanelShell title="Build Loop" panel={panel}>
      {(p) => {
        if (!p.built) return null
        if (!p.slices.length) return <div className="card-note">No build slices found</div>
        const finishers = Object.entries(p.finished_by)
        return (
          <div className="build-loop">
            {STATE_LABELS.map(([state, label]) => {
              const rows = p.slices.filter((s) => s.state === state)
              if (!rows.length) return null
              return (
                <section key={state} className="slice-group" data-state={state}>
                  <h3 className="eyebrow">{label}</h3>
                  <ul>
                    {rows.map((s) => (
                      <li key={s.id} className="slice-item">
                        <div className="slice-title">{s.title}</div>
                        <div className="slice-status">{s.status}</div>
                        {s.next !== '' && <CopyCommand text={s.next} />}
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
            <section className="finished-by">
              <h3 className="eyebrow">finished by</h3>
              {finishers.length
                ? <ul>{finishers.map(([model, n]) => <li key={model}><span className="mono">{model}</span> - {n}</li>)}</ul>
                : <div className="card-note">no slice finished yet</div>}
            </section>
          </div>
        )
      }}
    </PanelShell>
  )
}
