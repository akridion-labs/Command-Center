import { useEffect, useState } from 'react'
import { get, type Panel, type DoctorResponse } from '../api'
import { PanelShell } from '../PanelShell'
import { NotBuilt } from '../NotBuilt'
import { DoctorPanel } from './Doctor'
import { BuildPanel, type BuildResponse } from './Build'
import { NightPanel, type NightResponse } from './Night'
import { GapsPanel, type GapsResponse } from './Gaps'

export { DoctorPanel, BuildPanel, NightPanel, GapsPanel }

/** Fetch one endpoint through api.ts get(); a network or 5xx failure is NOT BUILT "<path> unreachable".
 *  A 401 is already on its way to login, so the panel shows nothing of its own. */
export function useEndpoint<T>(path: string): Panel<T> | null {
  const [panel, setPanel] = useState<Panel<T> | null>(null)
  useEffect(() => {
    let live = true
    get<T>(path).then((p) => live && setPanel(p)).catch((e: unknown) => {
      if (live && !(e instanceof Error && e.message === 'login')) setPanel({ built: false, why: `${path} unreachable` })
    })
    return () => { live = false }
  }, [path])
  return panel
}

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
      {(p) => p.built && (
        <>
          {p.model !== undefined && <div className="card-value mono">{txt(p.model)}</div>}
          {p.index_freshness !== undefined && <div className="card-note">Index freshness: {txt(p.index_freshness)}</div>}
          {p.answer_quality !== undefined && <div className="card-note">Answer quality: {txt(p.answer_quality)}</div>}
          <Items rows={list(p.attention)} empty="no attention items" />
        </>
      )}
    </PanelShell>
  )
}

export function TasksPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Tasks" panel={panel}>
      {(p) => p.built && (
        <>
          <div className="eyebrow">Jobs</div>
          <Items rows={list(p.jobs)} empty="no jobs" />
          <div className="eyebrow">Packets</div>
          <Items rows={list(p.packets)} empty="no packets" />
          <div className="eyebrow">Deferred</div>
          <Items rows={list(p.deferred)} empty="no deferred" />
        </>
      )}
    </PanelShell>
  )
}

export function AgentsPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Agents" panel={panel}>
      {(p) => p.built && <Items rows={list(p.agents)} empty="no agents in ~/.claude/agents" />}
    </PanelShell>
  )
}

export function QuotaPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Quota" panel={panel}>
      {(p) => {
        if (!p.built) return null
        const storage = (p.storage ?? {}) as Row
        const usage = (p.usage ?? {}) as Row
        return (
          <>
            <div className="eyebrow">Storage</div>
            <div className="card-value">{storage.size !== undefined ? txt(storage.size) : '-'}</div>
            <div className="eyebrow">Usage</div>
            {usage.built === false
              ? <NotBuilt panel={{ built: false, why: typeof usage.why === 'string' && usage.why ? usage.why : 'not built' }} />
              : <div className="card-value">{usage.value !== undefined ? txt(usage.value) : txt(usage.used ?? '-')}</div>}
          </>
        )
      }}
    </PanelShell>
  )
}

export function ContainersPanel({ panel }: { panel: Panel<Row> | null }) {
  return (
    <PanelShell title="Containers" panel={panel}>
      {(p) => p.built && <Items rows={list(p.containers)} empty="no containers reported" />}
    </PanelShell>
  )
}

/** Acting stays out of the console until Phase 2 names its actions: no request, no control. */
export function ActionsPanel() {
  return <PanelShell title="Actions" panel={{ built: false, why: 'POST /vyom/act returns 501: actions are not built yet' }} />
}

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
      {(p) => p.built && (
        <>
          {p.own_health !== undefined && <div className="card-note">Own health: {txt(p.own_health)}</div>}
          {typeof p.reviews === 'number' && <div className="card-note">Reviews: {p.reviews}</div>}
          {typeof p.packets === 'number' && <div className="card-note">Packets: {p.packets}</div>}
          {typeof p.open_steps === 'number' && <div className="card-note">Open steps: {p.open_steps}</div>}
          <div className="eyebrow">What you owe</div>
          {p.attention !== undefined && <Items rows={list(p.attention)} empty="no attention items" />}
          {p.rows !== undefined && <SelfCheckRows rows={list(p.rows)} />}
        </>
      )}
    </PanelShell>
  )
}

export function Panels() {
  const health = useEndpoint<Row>('/vyom/health')
  const tasks = useEndpoint<Row>('/vyom/tasks')
  const agents = useEndpoint<Row>('/vyom/agents')
  const quota = useEndpoint<Row>('/vyom/quota')
  const containers = useEndpoint<Row>('/vyom/containers')
  const selfcheck = useEndpoint<Row>('/vyom/selfcheck')
  const doctor = useEndpoint<DoctorResponse>('/vyom/doctor')
  const build = useEndpoint<BuildResponse>('/vyom/build')
  const night = useEndpoint<NightResponse>('/vyom/night')
  const gaps = useEndpoint<GapsResponse>('/vyom/gaps')
  return (
    <div className="cd-grid" id="sec-panels">
      <HealthPanel panel={health} />
      <TasksPanel panel={tasks} />
      <AgentsPanel panel={agents} />
      <QuotaPanel panel={quota} />
      <ContainersPanel panel={containers} />
      <ActionsPanel />
      <SelfCheckPanel panel={selfcheck} />
      <DoctorPanel panel={doctor} />
      <BuildPanel panel={build} />
      <NightPanel panel={night} />
      <GapsPanel panel={gaps} />
    </div>
  )
}
