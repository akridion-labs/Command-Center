import { useEffect, useState, type ReactNode } from 'react'
import { get, type Panel } from '../api'
import { NotBuilt } from '../NotBuilt'

type Row = Record<string, unknown>
const txt = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v))
const list = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : [])

function Frame({ title, panel, children }: { title: string; panel: Panel<unknown> | null; children: (p: never) => ReactNode }) {
  return (
    <section className="card sp2" aria-label={title}>
      <div className="card-title">{title}</div>
      {panel === null ? <div className="card-note">loading…</div>
        : panel.built ? children(panel as never) : <NotBuilt panel={panel} />}
    </section>
  )
}

function Items({ rows, empty }: { rows: Row[]; empty: string }) {
  if (!rows.length) return <div className="card-note">{empty}</div>
  return <ul>{rows.map((r, i) => <li key={i}>{txt(r.name ?? r.title ?? r.id ?? r.label ?? r)}{r.status ? ` — ${txt(r.status)}` : ''}</li>)}</ul>
}

export function SelfCheckPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <Frame title="Self-Check" panel={panel}>
      {(p: Row) => (
        <>
          {p.own_health !== undefined && (
            <div className="card-note">
              Own health: {txt(p.own_health)}
            </div>
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
      )}
    </Frame>
  )
}

export function HealthPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <Frame title="Health" panel={panel}>
      {(p: Row) => (
        <div className="card-note">
          {txt(p.status)}
        </div>
      )}
    </Frame>
  )
}

export function TasksPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <Frame title="Tasks" panel={panel}>
      {(p: Row) => (
        <div className="card-note">
          {txt(p.count)}
        </div>
      )}
    </Frame>
  )
}

export function AgentsPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <Frame title="Agents" panel={panel}>
      {(p: Row) => (
        <Items rows={list(p.agents)} empty="no agents" />
      )}
    </Frame>
  )
}

export function QuotaPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <Frame title="Quota" panel={panel}>
      {(p: Row) => (
        <div className="card-note">
          {txt(p.remaining)}
        </div>
      )}
    </Frame>
  )
}

export function ContainersPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <Frame title="Containers" panel={panel}>
      {(p: Row) => (
        <Items rows={list(p.containers)} empty="no containers" />
      )}
    </Frame>
  )
}

export function ActionsPanel() {
  return (
    <section className="card sp2" aria-label="Actions">
      <div className="card-title">Actions</div>
      <div className="card-note">No actions defined</div>
    </section>
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