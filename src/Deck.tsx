import { useEffect, useState, type ReactNode } from 'react'
import { get, type Panel } from './api'
import { NotBuilt } from './NotBuilt'
import { Panels } from './panels/Panels'
import { AskBox } from './ask/AskBox'
import { Background } from './scene/Background'
import { Tile } from './tiles'
import './design/deck.css'

interface MeResponse {
  options?: Record<string, unknown>
  config_problem?: string
}

interface Health { model?: string; vault?: { total_chunks?: number } }
interface Quota { storage?: { size?: string; chunks?: number; index_age?: string }; usage?: { built?: boolean; why?: string } }

const ABSENT = (why: string): Panel<never> => ({ built: false, why })
const SECTIONS = [
  ['health', 'Health', '◉'], ['deploys', 'Deploys', '⇡'], ['work', 'Work', '⛭'], ['models', 'Models', '◧'],
] as const

function Card({ title, badge, span, children }: { title: string; badge?: string; span?: 'sp2' | 'sp4'; children: ReactNode }) {
  return (
    <div className={`card ${span ?? ''}`}>
      <div className="card-title">{title}{badge && <span className="badge" style={{ color: '#39c6ff', background: 'rgba(57,198,255,.1)' }}>{badge}</span>}</div>
      {children}
    </div>
  )
}

function Gauge({ label, unit }: { label: string; unit: string }) {
  return (
    <div className="gauge">
      <div className="gauge-ring">
        <svg width="130" height="130" viewBox="0 0 130 130" role="img" aria-label={`${label} gauge`}>
          <circle cx="65" cy="65" r="52" stroke="rgba(255,255,255,.1)" strokeWidth="8" fill="none" />
        </svg>
        <div className="gauge-body">
          <span style={{ fontSize: 14, fontWeight: 700, color: '#ffb454' }}>NOT BUILT</span>
          <span style={{ fontSize: 11, color: '#8695a8' }}>{unit}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, letterSpacing: 2, color: '#8695a8' }}>{label}</span>
    </div>
  )
}

export function Deck() {
  const [health, setHealth] = useState<Panel<Health> | null>(null)
  const [quota, setQuota] = useState<Panel<Quota> | null>(null)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [range, setRange] = useState('24h')

  useEffect(() => {
    get<Health>('/vyom/health').then(setHealth).catch(() => setHealth({ built: false, why: 'health unreachable' }))
    get<Quota>('/vyom/quota').then(setQuota).catch(() => setQuota({ built: false, why: 'quota unreachable' }))
    get<MeResponse>('/vyom/me').then((response) => {
      if (response.built) {
        setMe(response)
      } else {
        setMe(null)
      }
    }).catch(() => setMe(null))
  }, [])

  const model = health?.built ? health.model : undefined
  const chunks = health?.built ? health.vault?.total_chunks : undefined
  const storage = quota?.built ? quota.storage : undefined
  const usage = quota?.built ? quota.usage : undefined
  // Convenience, not security: the server still decides what each role may do.
  const tiles = Object.entries(me?.options ?? {}).filter(([, on]) => Boolean(on))

  return (
    <>
      <div className="backdrop" />
      <Background />
      <nav className="rail" aria-label="Sections">
        {SECTIONS.map(([k, label, glyph]) => (
          <a key={k} href={`#sec-${k}`} aria-label={label}><span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{glyph}</span></a>
        ))}
      </nav>
      <div className="deck">
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, margin: 0, letterSpacing: 5, fontWeight: 700 }}>AKRIDION <span style={{ color: '#ff4b33' }}>VYOM</span></h1>
            <small style={{ display: 'block', color: '#8695a8', letterSpacing: 2.5, fontSize: 12, marginTop: 4 }}>OJAS · COMMAND DECK</small>
          </div>
          <span className="pillgroup" style={{ alignItems: 'center', gap: 10, padding: '8px 16px', color: '#39d98a', fontSize: 14, fontWeight: 600 }}>
            <span className="livedot" />
            {health?.built ? 'Brain online' : 'Brain status unknown'}
          </span>
        </header>

        <div className="stickybar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="eyebrow" style={{ margin: 0, fontSize: 12 }}>Window</span>
            <span className="pillgroup">
              {['1h', '24h', '7d', '30d'].map((r) => (
                <button key={r} className="pill" aria-pressed={r === range} onClick={() => setRange(r)}>{r}</button>
              ))}
            </span>
          </div>
        </div>

        <div id="sec-top" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 }}>
          <div className="glass" style={{ flex: 2, minWidth: 280, padding: '16px 20px' }}>
            <div className="eyebrow" style={{ fontSize: 12 }}>Ojas brief · {range}</div>
            <NotBuilt panel={ABSENT('no brief endpoint yet')} />
          </div>
        </div>

        <section aria-label="Core reactor" className="glass reactor" style={{ borderRadius: 20, padding: 32, marginBottom: 24 }}>
          <div className="scanline" />
          <div className="reactor-row">
            <Gauge label="GPU" unit="VRAM" />
            <div className="orb"><span style={{ fontSize: 11, letterSpacing: 3, color: '#8695a8' }}>OJAS CORE</span></div>
            <Gauge label="SYSTEM" unit="RAM" />
          </div>
        </section>

        <div className="cd-grid">
          <div className="sp4 section-label" id="sec-health">Infrastructure &amp; Brain Health</div>
          <Card title="Active model" badge="routing">
            {model ? <div className="card-value mono" style={{ fontSize: 26 }}>{model}</div> : <NotBuilt panel={ABSENT('model not reported by /vyom/health')} />}
          </Card>
          <Card title="Cloud quota" badge="glm">
            {storage ? <div className="card-value">{storage.size ?? '-'}</div> : <NotBuilt panel={ABSENT('no quota data')} />}
            {storage?.index_age && <div className="card-note">index age {storage.index_age}</div>}
          </Card>
          <Card title="Spend (mo)">
            <NotBuilt panel={ABSENT(usage?.why ?? 'usage is not built')} />
          </Card>
          <Card title="Vault chunks">
            {chunks !== undefined ? <div className="card-value">{chunks}</div> : <NotBuilt panel={ABSENT('chunks not reported')} />}
          </Card>
          <Card title="Latency">
            <NotBuilt panel={ABSENT('ask.py does not log duration yet')} />
          </Card>
        </div>

        {tiles.length > 0 && (
          <div className="cd-grid" role="region" aria-label="Tiles">
            <div className="sp4 section-label" id="sec-tiles">Your tiles</div>
            {tiles.map(([name, on]) => (
              <Tile key={name} title={name} built>
                <div className="card-note">{typeof on === 'string' ? on : 'available to your role'}</div>
              </Tile>
            ))}
          </div>
        )}

        <div className="cd-grid">
          <div className="sp4 section-label" id="sec-ask">Ask Vyom</div>
          <AskBox />
        </div>

        {me?.config_problem && (
          <div className="cd-grid">
            <div className="sp4 section-label" id="sec-config">Configuration Problem</div>
            <div className="card sp2" aria-label="Config Problem">
              <div className="card-title">Config Problem</div>
              <div className="card-note" style={{ color: '#ff4b33' }}>
                {me.config_problem}
              </div>
            </div>
          </div>
        )}

        <Panels />
      </div>
    </>
  )
}
