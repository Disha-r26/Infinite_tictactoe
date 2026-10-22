import { describe, expect, it } from 'vitest';
import path from 'path';

describe('Production Deployment & Security Header Configuration Audit', () => {
  const nextConfigPath = path.resolve(__dirname, '../../../next.config.js');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nextConfig = require(nextConfigPath);

  it('enforces React strict mode in Next.js configuration', () => {
    expect(nextConfig.reactStrictMode).toBe(true);
  });

  it('disables the X-Powered-By header to avoid technical fingerprinting', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('does NOT contain hardcoded localhost or development proxy rewrites', () => {
    expect(nextConfig.rewrites).toBeUndefined();
  });

  it('configures comprehensive production security headers', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const headerConfigs = await nextConfig.headers();
    expect(Array.isArray(headerConfigs)).toBe(true);
    expect(headerConfigs.length).toBeGreaterThan(0);

    const rootConfig = headerConfigs.find((c: any) => c.source === '/(.*)');
    expect(rootConfig).toBeDefined();

    const headersMap = new Map<string, string>();
    for (const h of rootConfig.headers) {
      headersMap.set(h.key, h.value);
    }

    // 1. Content Security Policy
    const csp = headersMap.get('Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('https://fonts.googleapis.com');
    expect(csp).toContain('https://fonts.gstatic.com');

    // 2. Clickjacking protection
    expect(headersMap.get('X-Frame-Options')).toBe('DENY');

    // 3. MIME sniffing protection
    expect(headersMap.get('X-Content-Type-Options')).toBe('nosniff');

    // 4. Referrer Policy
    expect(headersMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

    // 5. HSTS (Strict Transport Security)
    expect(headersMap.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );

    // 6. Permissions Policy
    expect(headersMap.get('Permissions-Policy')).toContain('camera=()');
    expect(headersMap.get('Permissions-Policy')).toContain('microphone=()');

    // 7. X-XSS-Protection
    expect(headersMap.get('X-XSS-Protection')).toBe('1; mode=block');
  });
});
