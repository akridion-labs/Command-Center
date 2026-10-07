// Debug script to understand URL behavior

// Test different URL scenarios
const testUrls = [
  '/docs/a',
  'docs/a',
  '#sec-x',
  'http://localhost:5173/docs/a',
  'https://localhost:5173/docs/a',
  'https://other.example/x',
  'javascript:alert(1)',
  '//evil.example/x'
];

testUrls.forEach(url => {
  console.log(`\nTesting URL: "${url}"`);

  try {
    const parsed = new URL(url, 'http://localhost');
    console.log('  Parsed successfully:');
    console.log('  - protocol:', parsed.protocol);
    console.log('  - hostname:', parsed.hostname);
    console.log('  - origin:', parsed.origin);
    console.log('  - href:', parsed.href);
  } catch (error: unknown) {
    console.log('  Parse failed:', (error as Error).message ?? 'unknown error');
  }
});