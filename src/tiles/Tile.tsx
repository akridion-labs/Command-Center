import { type ReactNode } from 'react'
import { NotBuilt } from '../NotBuilt'

interface TileProps {
  title: string
  built: boolean
  why?: string
  children: ReactNode
}

export default function Tile({ title, built, why, children }: TileProps) {
  return (
    <div className="card sp2" aria-label={title}>
      <div className="card-title">{title}</div>
      {built ? children : <NotBuilt panel={{ built: false, why: why ?? 'not built' }} />}
    </div>
  )
}