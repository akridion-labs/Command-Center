// Tokens read from the SOURCE of docs/design/Vyom Command Deck.dc.html (<style> block + inline styles).
export const colors = {
  magenta: '#c65cff',
  cyan: '#39c6ff',
  green: '#0f4d3f',
  bg: '#070b14',
  text: '#e7edf5',
  muted: '#8695a8',
  dim: '#7f8fa3',
  ok: '#39d98a',
  warn: '#ffb454',
  danger: '#ff5d5d',
  brand: '#ff4b33',
} as const

export const fonts = {
  sans: "'Rajdhani', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const

export const layout = {
  deckMaxWidth: 1560,
  gridGap: 12,
  railBreakpoint: 1100,
  wideBreakpoint: 1440,
  columns: { base: 4, wide: 6, mid: 2, narrow: 1 },
  railPadLeft: 110,
} as const
