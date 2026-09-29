import { useEffect, useState } from 'react'
import { HealthPanel, get } from '../api'
import { NotBuilt } from './NotBuilt'

export function Health() {
  const [data, setData] = useState<HealthPanel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await get<HealthPanel['data']>(`/vyom/health`)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="panel loading">Loading health data...</div>
  if (error) return <div className="panel error">Error: {error}</div>
  if (!data) return <div className="panel error">No data</div>

  if (!data.built) {
    return <NotBuilt data={data} />
  }

  return (
    <div className="panel health">
      <h2>Health</h2>
      <div className="health-details">
        <div className="health-item">
          <span className="label">Model:</span>
          <span className="value">{data.model}</span>
        </div>
        <div className="health-item">
          <span className="label">Index Freshness:</span>
          <span className="value">{data.index_freshness}</span>
        </div>
        <div className="health-item">
          <span className="label">Answer Quality:</span>
          <span className="value">{data.answer_quality}</span>
        </div>
        <div className="health-item">
          <span className="label">Total Chunks:</span>
          <span className="value">{data.vault.total_chunks}</span>
        </div>
        <div className="health-item">
          <span className="label">Attention Items:</span>
          <ul className="attention-items">
            {data.attention_items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}