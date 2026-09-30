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
      {(p: Row) => {
        const storage = (p.storage ?? {}) as Row
        const usage = (p.usage ?? {}) as Row
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

export function SelfCheckPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Self-Check" panel={panel}>
      {(p: Row) => {
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
            </>
          )
        }

        // If not built, the PanelShell will render NotBuilt automatically
        return null
      }}
    </PanelShell>
  )
}

function useEndpoint(path: string): Panel<Row> | null {
  const [panel, setPanel] = useState<Panel<Row> | null>(null)
  useEffect(() => {
    let live = true
    get<Row>(path).then((p) => live && setPanel(p)).catch(() => live && setPanel({ built: false, why: `${path} unreachable` }))
    return () => { live = false }
  }, [path])
  return panel
}

export function Panels() {
  return (
    <div className="cd-grid" id="sec-panels">
      <HealthPanel panel={useEndpoint('/vyom/health')} />
      <TasksPanel panel={useEndpoint('/vyom/tasks')} />
      <AgentsPanel panel={useEndpoint('/vyom/agents')} />
      <QuotaPanel panel={useEndpoint('/vyom/quota')} />
      <ContainersPanel panel={useEndpoint('/vyom/containers')} />
      <ActionsPanel />
      <SelfCheckPanel panel={useEndpoint('/vyom/selfcheck')} />
    </div>
  )
}