import { type ReactNode } from 'react'

interface TileShellProps {
  title: string
  badge?: string
  children: ReactNode
}

export default function TileShell({ title, badge, children }: TileShellProps) {
  return (
    <div className="card">
      <div className="card-title">{title}{badge && <span className="badge" style={{ color: '#39c6ff', background: 'rgba(57,198,255,.1)' }}>{badge}</span>}</div>
      {children}
    </div>
  )
}