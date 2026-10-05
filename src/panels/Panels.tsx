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
      {(p: any) => {
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
      {(p: any) => {
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

interface Model {
  name: string
  default: boolean
}

interface BuildLoopEvidence {
  calls: number
  minutes: number
  slices_ok: number
  first_try: number
}

function ModelRow({ model, evidence }: { model: Model; evidence?: BuildLoopEvidence }) {
  return (
    <tr key={model.name}>
      <td>{model.name}</td>
      <td>{model.default ? '✓' : ''}</td>
      <td>{evidence?.calls ?? 0}</td>
      <td>{evidence?.minutes ?? 0}m</td>
      <td>{Math.round(evidence?.slices_ok ?? 0)}%</td>
      <td>{Math.round(evidence?.first_try ?? 0)}%</td>
    </tr>
  )
}

interface ModelsResponse {
  built: boolean
  default: string
  models: Model[]
  build_loop_evidence: Record<string, BuildLoopEvidence>
}

export function ModelsPanel({ panel }: { panel: Panel<ModelsResponse> | null }) {
  return (
    <PanelShell title="Models" panel={panel}>
      {(p: Panel<ModelsResponse>) => {
        if (p.built === true && p.models !== undefined) {
          return (
            <>
              <div className="card-note">Default model: {p.default}</div>
              <div className="card-note" style={{ marginTop: 12 }}>Available models:</div>
              <table className="model-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Default</th>
                    <th>Calls</th>
                    <th>Minutes</th>
                    <th>Slices OK</th>
                    <th>First Try %</th>
                  </tr>
                </thead>
                <tbody>
                  {p.models.map((model) => (
                    <ModelRow key={model.name} model={model} evidence={(p as ModelsResponse).build_loop_evidence[model.name]} />
                  ))}
                </tbody>
              </table>
            </>
          )
        }
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
  built: boolean
  checks: Check[]
}

export function DoctorPanel({ panel }: { panel: Panel<ChecksResponse> | null }) {
  return (
    <PanelShell title="Doctor" panel={panel}>
      {(p: Panel<ChecksResponse>) => {
        if (p.built === true && p.checks !== undefined) {
          return (
            <>
              <div className="card-note">System checks:</div>
              <table className="model-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Cause</th>
                    <th>Action</th>
                    <th>Detail</th>
                    <th>Fixed</th>
                  </tr>
                </thead>
                <tbody>
                  {p.checks.map((check: Check) => (
                    <tr key={check.name}>
                      <td>{check.name}</td>
                      <td>{check.ok ? '✓' : '✗'}</td>
                      <td>{check.cause ?? '-'}</td>
                      <td>{check.do ?? '-'}</td>
                      <td className="mono">{check.detail || '-'}</td>
                      <td>{check.fixed === true ? 'yes' : check.fixed === false ? 'no' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        }
        return null
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

interface ModelsResponse {
  built: boolean
  default: string
  models: Model[]
  build_loop_evidence: Record<string, BuildLoopEvidence>
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
      <ModelsPanel panel={useEndpoint<ModelsResponse>('/vyom/models')} />
      <DoctorPanel panel={useEndpoint<ChecksResponse>('/vyom/doctor')} />
    </div>
  )
}

interface ModelsResponse {
  built: boolean
  default: string
  models: Model[]
  build_loop_evidence: Record<string, BuildLoopEvidence>
}