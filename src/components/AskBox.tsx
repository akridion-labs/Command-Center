import { useState } from 'react'
import { get } from '../api'

interface AskResponse {
  answer: string;
  sources: string[];
}

export function AskBox() {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<AskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const result = await get<{ answer: string; sources: string[] }>(`/vyom/ask?question=${encodeURIComponent(question)}`)

      if (result.built) {
        setResponse(result)
      } else {
        setError('Failed to get answer: ' + result.why)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ask-box">
      <h2>Ask the Brain</h2>
      <form onSubmit={handleSubmit} className="ask-form">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="ask-input"
        />
        <button type="submit" disabled={loading} className="ask-button">
          {loading ? 'Asking...' : 'Ask'}
        </button>
      </form>

      {response && (
        <div className="ask-response">
          <div className="answer">
            <h3>Answer:</h3>
            <p>{response.answer}</p>
          </div>
          <div className="sources">
            <h3>Sources:</h3>
            <ul>
              {response.sources.map((source, i) => (
                <li key={i}>{source}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {error && (
        <div className="ask-error">
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  )
}