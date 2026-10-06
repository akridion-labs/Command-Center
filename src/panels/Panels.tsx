import { useEffect, useState } from 'react'
import { get, type Panel } from '../api'
import { PanelShell } from '../PanelShell'
import { NotBuilt } from '../NotBuilt'

type Row = Record<string, unknown>
const txt = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v))
const list = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : [])

function Items({ rows, empty }: { rows: Row[]; empty: string }) {
  if (!rows.length) return <div className="card-note">{empty}</div>
  return <ul>{rows.map((r, i) => <li key={i}>{txt(r.name ?? r.title ?? r.id ?? r.label ?? r)}{r.status ? ` — ${txt(r.status)}` : ''}</li>)}</ul>
}

export function HealthPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Health" panel={panel}>
      {(p: Row) => (
        <>
          {p.model !== undefined && <div className="card-value mono">{txt(p.model)}</div>}
          {p.index_freshness !== undefined && <div className="card-note">index {txt(p.index_freshness)}</div>}
          {p.answer_quality !== undefined && <div className="card-note">quality {txt(p.answer_quality)}</div>}
          <Items rows={list(p.attention)} empty="no attention items" />
        </>
      )}
    </PanelShell>
  )
}

export function TasksPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Tasks" panel={panel}>
      {(p: Row) => (
        <>
          {(['jobs', 'packets', 'deferred'] as const).map((k) => (
            <div key={k}><div className="eyebrow">{k}</div><Items rows={list(p[k])} empty={`no ${k}`} /></div>
          ))}
        </>
      )}
    </PanelShell>
  )
}

export function AgentsPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Agents" panel={panel}>
      {(p: Row) => <Items rows={list(p.agents)} empty="no agents in ~/.claude/agents" />}
    </PanelShell>
  )
}

export function QuotaPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Quota" panel={panel}>
      {(p) => {
        // Handle the case where storage and usage are not directly accessible in the Panel
        const storage = (p as any).storage ?? {}
        const usage = (p as any).usage ?? {}
        return (
          <>
            <div className="eyebrow">Storage</div>
            <div className="card-value">{storage.size !== undefined ? txt(storage.size) : '-'}</div>
            <div className="eyebrow">Usage</div>
            {usage.built === false
              ? <NotBuilt panel={{ built: false, why: txt(usage.why ?? 'usage is not built') }} />
              : <div className="card-value">{txt(usage.value ?? usage.used ?? '-')}</div>}
          </>
        )
      }}
    </PanelShell>
  )
}

export function ContainersPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Containers" panel={panel}>
      {(p: Row) => <Items rows={list(p.containers)} empty="no containers reported" />}
    </PanelShell>
  )
}

export function ActionsPanel() {
  return (
    <PanelShell title="Actions" panel={{ built: false, why: 'POST /vyom/act refuses everything (501) until each action is named, role-checked and audited' }}>
      {() => null}
    </PanelShell>
  )
}

// The same facts as `ojas selfcheck`: one row per finding, level ok/warn/bad/owe.
function SelfCheckRows({ rows }: { rows: Row[] }) {
  if (!rows.length) return <div className="card-note">no selfcheck rows</div>
  return (
    <ul>
      {rows.map((r, i) => (
        <li key={i} data-level={txt(r.level)}>
          <span className="badge">{txt(r.level)}</span> <span className="eyebrow">{txt(r.area)}</span> {txt(r.text)}
          {typeof r.fix === 'string' && r.fix !== '' && <div className="card-note"><code className="mono" style={{ userSelect: 'all' }}>{r.fix}</code></div>}
        </li>
      ))}
    </ul>
  )
}

export function SelfCheckPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Self-Check" panel={panel}>
      {(p) => {
        // Handle the case where we have data to display
        if (p.built === true) {
          return (
            <>
              {p.own_health !== undefined && (
                <div className="card-note">
                  Own health: {txt(p.own_health)}
                </div>
              )}
              {(p.reviews !== undefined || p.packets !== undefined || p.open_steps !== undefined) && (
                <div className="eyebrow">What you owe</div>
              )}
              {p.reviews !== undefined && (
                <div className="card-note">
                  Reviews: {txt(p.reviews)}
                </div>
              )}
              {p.packets !== undefined && (
                <div className="card-note">
                  Packets: {txt(p.packets)}
                </div>
              )}
              {p.open_steps !== undefined && (
                <div className="card-note">
                  Open steps: {txt(p.open_steps)}
                </div>
              )}
              {p.attention !== undefined && (
                <Items rows={list(p.attention)} empty="no attention items" />
              )}
              {p.rows !== undefined && <SelfCheckRows rows={list(p.rows)} />}
            </>
          )
        }

        // If not built, the PanelShell will render NotBuilt automatically
        return null
      }}
    </PanelShell>
  )
}

interface Check {
  name: string
  ok: boolean
  cause?: string
  do?: string
  detail?: string
  fixed?: boolean
}

interface ChecksResponse {
  at?: string
  checks: Check[]
}

/** A shell command shown in monospace, selectable in one click, with a Copy button. */
function Command({ text }: { text: string }) {
  return (
    <span>
      <code className="mono" style={{ userSelect: 'all' }}>{text}</code>{' '}
      <button type="button" className="pill" onClick={() => { void navigator.clipboard?.writeText(text) }}>Copy</button>
    </span>
  )
}

export function DoctorPanel({ panel }: { panel: Panel<ChecksResponse> | null }) {
  return (
    <PanelShell title="Doctor" panel={panel}>
      {(p) => {
        if (!p.built) return null
        if (!p.checks.length) return <div className="card-note">no checks reported</div>
        return (
          <ul>
            {p.checks.map((c) => (
              <li key={c.name} data-ok={c.ok}>
                <span>{c.ok ? '✓' : '✗'} {c.name}</span>
                {c.fixed === true && <div className="card-note">fixed automatically</div>}
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

export function useEndpoint<T>(path: string): Panel<T> | null {
  const [panel, setPanel] = useState<Panel<T> | null>(null)
  useEffect(() => {
    let live = true
    get<T>(path).then((p) => live && setPanel(p)).catch(() => live && setPanel({ built: false, why: `${path} unreachable` }))
    return () => { live = false }
  }, [path])
  return panel
}

export function Panels() {
  return (
    <div className="cd-grid" id="sec-panels">
      <HealthPanel panel={useEndpoint<Row>('/vyom/health')} />
      <TasksPanel panel={useEndpoint<Row>('/vyom/tasks')} />
      <AgentsPanel panel={useEndpoint<Row>('/vyom/agents')} />
      <QuotaPanel panel={useEndpoint<Row>('/vyom/quota')} />
      <ContainersPanel panel={useEndpoint<Row>('/vyom/containers')} />
      <ActionsPanel />
      <SelfCheckPanel panel={useEndpoint<Row>('/vyom/selfcheck')} />
      <DoctorPanel panel={useEndpoint<ChecksResponse>('/vyom/doctor')} />
    </div>
  )
}