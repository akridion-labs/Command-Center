// Set up React DOM globals for testing
import { afterEach } from 'vitest'

// Make window.navigate available for testing
Object.defineProperty(window, 'navigate', {
  writable: true,
  configurable: true,
  value: () => {},
})

// Clean up mock window before each test
afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    value: globalThis.window,
    writable: true,
    configurable: true,
  })
})

// Mock react-dom for SSR environments (jsdom already provides the DOM)
if (typeof document === 'undefined') {
  // Prevent React from trying to access undefined window.document
  globalThis.window = globalThis.process.env?.NODE_ENV === 'test'
    ? new Proxy(globalThis.window, {
        get(target, prop) {
          if (prop === 'document') return null
          return target[prop as keyof Window]
        },
      })
    : globalThis.window
}
