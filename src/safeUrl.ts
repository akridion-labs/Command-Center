/**
 * The one place that decides whether a URL from the server may become a link.
 * Safe: a relative path, or http(s) on this deck's own origin. Everything else
 * (another origin, any other scheme, protocol-relative, backslash tricks,
 * malformed or non-string input) is unsafe and must be shown as text.
 */
export type SafeUrl = { isSafe: true; href: string } | { isSafe: false; text: string }

// Browsers strip these before parsing a scheme, so `java\tscript:` is still javascript:
const CONTROL_OR_SPACE = /[\u0000- \u007f]/g

function deckOrigin(): string | undefined {
  return typeof location === 'undefined' ? undefined : location.origin
}

export function safeUrl(url: unknown, origin: string | undefined = deckOrigin()): SafeUrl {
  if (typeof url !== 'string') return { isSafe: false, text: '' }
  const unsafe: SafeUrl = { isSafe: false, text: url.trim() }
  const squashed = url.replace(CONTROL_OR_SPACE, '')
  if (!squashed) return unsafe

  // `//host` and any backslash in the authority position resolve to another host
  if (/^[\\/][\\/]/.test(squashed) || squashed.startsWith('\\')) return unsafe

  // Anything with a scheme must be http(s) on the deck's own origin
  if (/^[a-z][a-z0-9+.-]*:/i.test(squashed)) {
    if (!/^https?:/i.test(squashed) || !origin) return unsafe
    try {
      return new URL(url.trim()).origin === origin ? { isSafe: true, href: url.trim() } : unsafe
    } catch {
      return unsafe
    }
  }

  return { isSafe: true, href: url }
}
