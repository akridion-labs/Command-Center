import type { Panel } from '../api'
import { PanelShell } from '../PanelShell'

export interface GapsResponse {
  count: number
  gaps: Array<{
    question: string
    times: number
    last: string
  }>
}

export function GapsPanel({ panel }: { panel: Panel<GapsResponse> | null }) {
  return (
    <PanelShell title="Knowledge Gaps" panel={panel}>
      {(p) => {
        if (!p.built) return null
        if (!p.gaps.length) return <div className="card-note">No gaps found</div>

        // Sort gaps newest first (most recent last in the array)
        const sortedGaps = [...p.gaps].sort((a, b) => {
          // Convert dates to timestamps for comparison
          const timeA = new Date(a.last).getTime()
          const timeB = new Date(b.last).getTime()
          return timeB - timeA // Newest first
        })

        return (
          <ul className="gaps-list">
            {sortedGaps.map((gap, index) => (
              <li key={index} className="gap-item">
                <div className="gap-question">{gap.question}</div>
                <div className="gap-meta">
                  <span className="gap-times">Asked {gap.times} times</span>
                  <span className="gap-last">Last asked: {gap.last}</span>
                </div>
              </li>
            ))}
          </ul>
        )
      }}
    </PanelShell>
  )
}