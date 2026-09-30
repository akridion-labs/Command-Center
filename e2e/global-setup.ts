import { execSync } from 'node:child_process'
import { DIST, MODE } from './deck'

// Stubbed mode serves the CURRENT source, so build it fresh - a stale bundle would test old code.
export default function globalSetup() {
  if (MODE !== 'stubbed') return
  execSync(`npx vite build --outDir ${DIST} --emptyOutDir`, { stdio: 'inherit' })
}
