import { useState, type FormEvent } from 'react'
import type { Panel } from '../api'
import { NotBuilt } from '../NotBuilt'

export interface Source {
  title: string
  url: string
  snippet: string
}

export interface AskResult {
  answer: string
  sources: Source[]
}

interface AskBoxProps {
  /** Where a 401 sends the browser; injectable so tests can observe it. */
  redirect?: (url: string) => void
  /** Local model names from /vyom/models; when given, the box shows a model picker. */
  models?: string[]
  /** The brain's default model, marked in the picker; used when no model is chosen. */
  defaultModel?: string
  /** Config problem text to display near sources */
  configProblem?: string | null
}

function goTo(url: string) {
  location.href = url
}

/** One answered question; the follow-up carries it, like the `ojas` loop. */
export interface Turn {
  query: string
  answer: string
}

const wrap = { overflowWrap: 'anywhere', wordBreak: 'break-word', minWidth: 0 } as const
const UNREACHABLE: Panel<never> = { built: false, why: '/vyom/ask unreachable' }

// Same status mapping as api.ts `get`, for a POST.
async function ask(query: string, model: string | undefined, previous: Turn | null, redirect: (url: string) => void): Promise<Panel<AskResult> | null> {
  const r = await fetch('/vyom/ask', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      ...(model !== undefined && model !== '' ? { model } : {}),
      ...(previous ? { history: [previous] } : {}),
    }),
  })
  if (r.status === 401) { redirect('/vyom/login'); return null }
  if (r.status === 403) return UNREACHABLE
  if (r.status === 501) return { built: false, why: 'not implemented yet' }
  if (r.status === 400) {
    // e.g. `unknown_model` when the chosen model is not one of /vyom/models
    const body = await r.json().catch(() => null)
    const code = body?.error ?? body?.why
    throw new Error(typeof code === 'string' ? `HTTP 400 ${code}` : 'HTTP 400')
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const data = await r.json()
  if (data && data.built === false) return { built: false, why: data.why || 'not implemented yet' }
  return {
    built: true,
    answer: typeof data?.answer === 'string' ? data.answer : '',
    sources: Array.isArray(data?.sources) ? data.sources : [],
  }
}

export function AskBox({ redirect = goTo, models, defaultModel, configProblem }: AskBoxProps) {
  const [query, setQuery] = useState('')
  // undefined = no `model` in the request, so the brain uses its default
  const [model, setModel] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<Panel<AskResult> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The last answered turn; a failed or refused ask is not a turn, so it is kept.
  const [previous, setPrevious] = useState<Turn | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await ask(query, model, previous, redirect)
      setResult(res)
      if (res?.built) setPrevious({ query, answer: res.answer })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.startsWith('HTTP ') ? msg : `network failure (${msg})`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card sp2" aria-label="Ask Vyom" style={{ minWidth: 0, overflow: 'hidden' }}>
      <div className="card-title">Ask Vyom</div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #39c6ff', background: 'rgba(57,198,255,.1)', color: '#fff' }}
        />
        {models && models.length > 0 && (
          <select
            aria-label="Model"
            value={model ?? ''}
            onChange={(e) => setModel(e.target.value || undefined)}
            disabled={loading}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #39c6ff', background: 'rgba(57,198,255,.1)', color: '#fff' }}
          >
            <option value="">{defaultModel ? `brain default (${defaultModel})` : 'brain default'}</option>
            {models.map((m) => (
              <option key={m} value={m}>{m === defaultModel ? `${m} (default)` : m}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={loading || !query.trim()}
          style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#39c6ff', color: '#000', fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {loading && (
        <div className="card-note" data-testid="ask-loading" style={{ marginTop: 12 }}>loading…</div>
      )}

      {error && (
        <>
          <NotBuilt panel={UNREACHABLE} />
          <div className="card-note" role="alert" style={{ color: '#ff4b33', ...wrap }}>
            Error: {error}
          </div>
        </>
      )}

      {result && (
        <div style={{ marginTop: 12, ...wrap }}>
          {!result.built ? (
            <NotBuilt panel={result} />
          ) : (
            <>
              <div className="card-value" data-testid="ask-answer" style={{ fontSize: 16, lineHeight: 1.5, ...wrap }}>
                {result.answer}
              </div>
              <div style={{ marginTop: 12 }}>
                {result.sources.length > 0 ? (
                  <>
                    <h4 style={{ margin: '8px 0 4px 0', fontSize: 12, fontWeight: 700, color: '#39c6ff' }}>Sources</h4>
                    <ol data-testid="ask-sources" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {result.sources.map((source, index) => (
                        <li key={`${index}:${source.url}`} style={{ marginBottom: 8, ...wrap }}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#39c6ff', textDecoration: 'underline', ...wrap }}
                          >
                            {source.title?.trim() ? source.title : source.url}
                          </a>
                          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#8695a8', ...wrap }}>
                            {source.snippet}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: '#8695a8' }}>no sources returned</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {configProblem && (
        // The only place the config problem shows: under the sources, once.
        <div className="card-note" data-testid="ask-config-problem" aria-label="Config Problem" style={{ color: '#ff4b33', marginTop: 12, whiteSpace: 'pre-wrap', ...wrap }}>
          Config Problem: <span>{configProblem}</span>
        </div>
      )}
    </div>
  )
}
