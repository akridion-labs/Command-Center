import { useState, type FormEvent } from 'react'

interface AskResponse {
  answer: string
  sources: Array<{
    title: string
    url: string
    snippet: string
  }>
}

export function AskBox() {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<AskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/vyom/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card sp2" aria-label="Ask Vyom">
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
        <button
          type="submit"
          disabled={loading || !query.trim()}
          style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#39c6ff', color: '#000', fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {error && (
        <div className="card-note" style={{ color: '#ff4b33' }}>
          Error: {error}
        </div>
      )}

      {response && (
        <div style={{ marginTop: 12 }}>
          <div className="card-value" style={{ fontSize: 16, lineHeight: 1.5 }}>
            {response.answer}
          </div>
          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '8px 0 4px 0', fontSize: 12, fontWeight: 700, color: '#39c6ff' }}>Sources</h4>
            {response.sources.map((source, index) => (
              <div key={index} style={{ marginBottom: 8 }}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#39c6ff', textDecoration: 'underline' }}
                >
                  {source.title}
                </a>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#8695a8' }}>
                  {source.snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}