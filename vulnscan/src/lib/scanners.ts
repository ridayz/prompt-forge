import type { Vulnerability, ScanType, Severity } from '../types';

function makeVuln(id: string, severity: Severity, category: ScanType, title: string, description: string, evidence: string, remediation: string, cwe: string, cvss: number, location?: string): Vulnerability {
  return { id, severity, category, title, description, evidence, remediation, cwe, cvss, location };
}

export const scanners = {
  // === Security Headers ===
  checkMissingHeaders(headers: Headers): Vulnerability[] {
    const vulns: Vulnerability[] = [];
    const h = (name: string) => headers.get(name)?.toLowerCase() ?? '';
    const headerMap: Array<{ name: string; key: string; severity: Severity; cvss: number; cwe: string }> = [
      { name: 'X-Content-Type-Options', key: 'x-content-type-options', severity: 'medium', cvss: 4.3, cwe: 'CWE-693' },
      { name: 'X-Frame-Options', key: 'x-frame-options', severity: 'medium', cvss: 4.3, cwe: 'CWE-1021' },
      { name: 'Strict-Transport-Security', key: 'strict-transport-security', severity: 'high', cvss: 7.4, cwe: 'CWE-319' },
      { name: 'Content-Security-Policy', key: 'content-security-policy', severity: 'high', cvss: 7.5, cwe: 'CWE-79' },
      { name: 'X-XSS-Protection', key: 'x-xss-protection', severity: 'low', cvss: 3.7, cwe: 'CWE-1021' },
      { name: 'Referrer-Policy', key: 'referrer-policy', severity: 'low', cvss: 3.7, cwe: 'CWE-200' },
      { name: 'Permissions-Policy', key: 'permissions-policy', severity: 'low', cvss: 3.7, cwe: 'CWE-16' },
      { name: 'Cross-Origin-Opener-Policy', key: 'cross-origin-opener-policy', severity: 'medium', cvss: 4.3, cwe: 'CWE-16' },
      { name: 'Cross-Origin-Resource-Policy', key: 'cross-origin-resource-policy', severity: 'low', cvss: 3.7, cwe: 'CWE-16' },
    ];

    let idx = 0;
    for (const item of headerMap) {
      if (!h(item.key)) {
        vulns.push(makeVuln(
          `hdr-${idx++}`, item.severity, 'header',
          `Missing Security Header: ${item.name}`,
          `The ${item.name} header is not set. This header provides defense-in-depth against common web attacks.`,
          `Header ${item.name} not found in response.`,
          `Add the following header to all responses:\n${getHeaderDirective(item.name)}`,
          item.cwe, item.cvss
        ));
      }
    }
    return vulns;
  },

  // === CSP Analysis ===
  checkCSP(headers: Headers): Vulnerability[] {
    const vulns: Vulnerability[] = [];
    const csp = headers.get('content-security-policy')?.toLowerCase() ?? '';
    if (!csp) return vulns;

    let idx = 0;
    // Check for unsafe-inline
    if (csp.includes("unsafe-inline")) {
      vulns.push(makeVuln(`csp-${idx++}`, 'high', 'csp', 'CSP allows unsafe-inline',
        'Content-Security-Policy allows unsafe-inline for scripts/styles, defeating XSS protection.',
        `CSP contains 'unsafe-inline': ${csp.match(/unsafe-inline/g)?.join(', ')}`,
        'Remove unsafe-inline from script-src and style-src. Use nonces or hashes instead.',
        'CWE-79', 7.4));
    }
    // Check for wildcard *
    if (csp.includes("'self'") && csp.includes("*")) {
      vulns.push(makeVuln(`csp-${idx++}`, 'medium', 'csp', 'CSP allows wildcard sources',
        'CSP source directive includes wildcard (*), reducing effectiveness against data exfiltration.',
        `CSP contains wildcard: ${csp.match(/\*/g)?.length} occurrences`,
        'Replace wildcard sources with specific trusted domains.',
        'CWE-79', 5.3));
    }
    // Check report-uri vs report-to
    if (csp.includes('report-uri') && !csp.includes('report-to')) {
      vulns.push(makeVuln(`csp-${idx++}`, 'low', 'csp', 'CSP uses deprecated report-uri',
        'CSP uses deprecated report-uri directive. Modern browsers support report-to.',
        'CSP contains report-uri but not report-to',
        'Migrate from report-uri to report-to directive.',
        'CWE-693', 2.0));
    }
    return vulns;
  },

  // === HSTS Check ===
  checkHSTS(headers: Headers): Vulnerability[] {
    const csp = headers.get('strict-transport-security');
    if (!csp) return [];
    const vulns: Vulnerability[] = [];
    // Check max-age
    const match = csp.match(/max-age=(\d+)/);
    if (match && parseInt(match[1]) < 31536000) {
      vulns.push(makeVuln('hsts-1', 'medium', 'header', 'HSTS max-age too short',
        'Strict-Transport-Security max-age is less than 1 year, allowing downgrade attacks after period expires.',
        `HSTS max-age: ${match[1]} seconds`,
        'Set max-age to at least 31536000 (1 year).',
        'CWE-319', 5.3));
    }
    // Check missing includeSubDomains
    if (!csp.toLowerCase().includes('includesubdomains')) {
      vulns.push(makeVuln('hsts-2', 'medium', 'header', 'HSTS missing includeSubDomains',
        'HSTS does not include includeSubDomains, subdomains are not protected.',
        'HSTS header present but missing includeSubDomains directive',
        'Add includeSubDomains to HSTS header.',
        'CWE-319', 5.3));
    }
    // Check missing preload
    if (!csp.toLowerCase().includes('preload')) {
      vulns.push(makeVuln('hsts-3', 'low', 'header', 'HSTS missing preload',
        'HSTS does not include preload directive, not eligible for browser preload lists.',
        'HSTS header missing preload directive',
        'Add preload directive for HSTS preloading.',
        'CWE-319', 2.0));
    }
    return vulns;
  },

  // === Cookie Security ===
  checkCookies(setCookie: string | null): { vulns: Vulnerability[]; cookies: any[]; insecure: any[] } {
    const vulns: Vulnerability[] = [];
    const cookies: any[] = [];
    const insecure: any[] = [];
    if (!setCookie) return { vulns, cookies, insecure };

    // Set-Cookie headers are joined with ", " by fetch API but we need to split properly
    // Each cookie starts with a name=value pair, not a date
    const cookieRegex = /([a-zA-Z0-9\-_]+)=([^;]*)(?:;(.*))?/g;
    let match;
    const foundCookies = [];

    while ((match = cookieRegex.exec(setCookie)) !== null) {
      const name = match[1];
      const value = match[2]?.trim() ?? '';
      const attrs = match[3] ?? '';

      // Skip if this looks like a date fragment (not a real cookie name)
      if (/^[0-9]{1,2}\s+[A-Z][a-z]{2}\s+\d{4}/.test(name)) continue;

      const cookie = {
        name: `${name}=${value}`,
        displayName: name,
        value,
        secure: attrs.toLowerCase().includes('secure'),
        httpOnly: attrs.toLowerCase().includes('httponly'),
        sameSite: (attrs.toLowerCase().match(/samesite\s*=\s*(strict|lax|none)/) ?? [])[1] ?? '',
        raw: `${name}=${value}; ${attrs}`.trim(),
      };
      foundCookies.push(cookie);
    }

    // Also try line-based splitting as fallback
    if (foundCookies.length === 0) {
      const lines = setCookie.split('\n').map((s: string) => s.trim()).filter(Boolean);
      lines.forEach((line: string, i: number) => {
        const semiSplit = line.split(';').map((s: string) => s.trim());
        const [first, ...rest] = semiSplit;
        const eqIdx = first.indexOf('=');
        const name = eqIdx > 0 ? first.substring(0, eqIdx) : first;
        const value = eqIdx > 0 ? first.substring(eqIdx + 1) : '';
        const cookie = {
          name: `${name}=${value}`,
          displayName: name,
          value,
          secure: rest.join(';').toLowerCase().includes('secure'),
          httpOnly: rest.join(';').toLowerCase().includes('httponly'),
          sameSite: rest.join(';').toLowerCase().match(/samesite\s*=\s*(strict|lax|none)/)?.[1] ?? '',
          raw: line,
        };
        foundCookies.push(cookie);
      });
    }

    foundCookies.forEach((cookie: any, i: number) => {
      cookies.push(cookie);

      if (!cookie.secure) {
        vulns.push(makeVuln(`cookie-sec-${i}`, 'high', 'cookie', `Cookie "${cookie.displayName}" missing Secure flag`,
          'Cookie is transmitted over unencrypted HTTP connections, exposing session tokens to interception.',
          `Cookie: ${cookie.displayName}, Secure: missing`,
          'Add Secure attribute to all cookies, especially session tokens.',
          'CWE-614', 7.5));
        insecure.push(cookie);
      }
      if (!cookie.httpOnly) {
        vulns.push(makeVuln(`cookie-http-${i}`, 'medium', 'cookie', `Cookie "${cookie.displayName}" missing HttpOnly`,
          'Cookie is accessible via JavaScript, vulnerable to XSS-based session hijacking.',
          `Cookie: ${cookie.displayName}, HttpOnly: missing`,
          'Add HttpOnly attribute to session and sensitive cookies.',
          'CWE-1004', 6.5));
        insecure.push(cookie);
      }
      if (!cookie.sameSite) {
        vulns.push(makeVuln(`cookie-samesite-${i}`, 'low', 'cookie', `Cookie "${cookie.displayName}" missing SameSite`,
          'Cookie lacks SameSite attribute, potentially vulnerable to CSRF attacks.',
          `Cookie: ${cookie.displayName}, SameSite: missing`,
          'Add SameSite=Strict or SameSite=Lax to all cookies.',
          'CWE-1275', 4.3));
      }
    });

    return { vulns, cookies, insecure };
  },

  // === Technology Detection ===
  detectTech(headers: Headers, html: string): string[] {
    const tech: string[] = [];
    const lowerHtml = html.toLowerCase();
    const h = (key: string) => headers.get(key)?.toLowerCase() ?? '';

    // Server
    if (h('server').includes('nginx')) tech.push('Nginx');
    if (h('server').includes('apache')) tech.push('Apache');
    if (h('server').includes('cloudflare')) tech.push('Cloudflare CDN');
    if (h('x-powered-by')) tech.push(`Powered By: ${headers.get('x-powered-by')}`);
    if (h('via')) tech.push(`Via: ${headers.get('via')}`);

    // Framework detection from HTML
    if (lowerHtml.includes('react')) tech.push('React');
    if (lowerHtml.includes('vue')) tech.push('Vue.js');
    if (lowerHtml.includes('angular')) tech.push('Angular');
    if (lowerHtml.includes('next.js') || lowerHtml.includes('nextjs')) tech.push('Next.js');
    if (lowerHtml.includes('nuxt')) tech.push('Nuxt.js');
    if (lowerHtml.includes('laravel')) tech.push('Laravel');
    if (lowerHtml.includes('django')) tech.push('Django');
    if (lowerHtml.includes('express')) tech.push('Express.js');
    if (lowerHtml.includes('wordpress')) tech.push('WordPress');

    // CDN / WAF
    if (h('server').includes('cloudflare')) tech.push('Cloudflare');
    if (h('server').includes('akamai')) tech.push('Akamai');
    if (h('x-cache')?.includes('hit')) tech.push('CDN Cache');

    return [...new Set(tech)];
  },

  // === Sensitive File Discovery ===
  async checkSensitivePaths(target: string): Promise<Vulnerability[]> {
    const vulns: Vulnerability[] = [];
    const paths = [
      { path: '/robots.txt', name: 'robots.txt', risk: 'low', desc: 'May reveal hidden paths', cwe: 'CWE-200', cvss: 2.0, expectPlain: true },
      { path: '/sitemap.xml', name: 'sitemap.xml', risk: 'low', desc: 'May reveal hidden pages', cwe: 'CWE-200', cvss: 2.0, expectPlain: true },
      { path: '/.env', name: '.env', risk: 'critical', desc: 'Environment variables including secrets', cwe: 'CWE-200', cvss: 9.8, expectEnv: true },
      { path: '/.git/config', name: '.git/config', risk: 'critical', desc: 'Git repository exposed', cwe: 'CWE-200', cvss: 9.1, expectGit: true },
      { path: '/.git/HEAD', name: '.git/HEAD', risk: 'critical', desc: 'Git repository exposed', cwe: 'CWE-200', cvss: 9.1, expectGit: true },
      { path: '/wp-admin/', name: 'wp-admin', risk: 'medium', desc: 'WordPress admin panel exposed', cwe: 'CWE-200', cvss: 4.3 },
      { path: '/wp-login.php', name: 'wp-login.php', risk: 'medium', desc: 'WordPress login page exposed', cwe: 'CWE-200', cvss: 4.3 },
      { path: '/phpmyadmin/', name: 'phpmyadmin', risk: 'high', desc: 'phpMyAdmin exposed', cwe: 'CWE-200', cvss: 7.5 },
      { path: '/admin/', name: 'admin panel', risk: 'medium', desc: 'Admin panel exposed', cwe: 'CWE-200', cvss: 4.3 },
      { path: '/backup/', name: 'backup directory', risk: 'high', desc: 'Backup files may be accessible', cwe: 'CWE-200', cvss: 7.5 },
      { path: '/server-status', name: 'server-status', risk: 'high', desc: 'Apache server status exposed', cwe: 'CWE-200', cvss: 7.5, expectApache: true },
      { path: '/server-info', name: 'server-info', risk: 'high', desc: 'Apache server info exposed', cwe: 'CWE-200', cvss: 7.5, expectApache: true },
      { path: '/.DS_Store', name: '.DS_Store', risk: 'medium', desc: 'macOS metadata file exposed', cwe: 'CWE-200', cvss: 5.3, expectBinary: true },
      { path: '/web.config', name: 'web.config', risk: 'high', desc: 'IIS config file exposed', cwe: 'CWE-200', cvss: 7.5, expectXml: true },
      { path: '/crossdomain.xml', name: 'crossdomain.xml', risk: 'medium', desc: 'Flash cross-domain policy exposed', cwe: 'CWE-200', cvss: 5.3, expectXml: true },
      { path: '/elmah.axd', name: 'elmah.axd', risk: 'high', desc: 'ELMAH error logs exposed (ASP.NET)', cwe: 'CWE-200', cvss: 7.5 },
      { path: '/trace.axd', name: 'trace.axd', risk: 'high', desc: 'ASP.NET tracing exposed', cwe: 'CWE-200', cvss: 7.5 },
      { path: '/api.json', name: 'api.json', risk: 'medium', desc: 'API documentation exposed', cwe: 'CWE-200', cvss: 4.3, expectJson: true },
    ];

    const base = target.replace(/\/$/, '');
    for (const p of paths) {
      try {
        const res = await fetch(`${base}${p.path}`, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(5000) });
        if (res.status !== 200) continue;

        // Validate that the response is actually the expected file, not a catch-all SPA error page
        const contentType = res.headers.get('content-type') || '';
        const contentLength = parseInt(res.headers.get('content-length') || '0');
        const text = await res.text();

        if (!isValidFileResponse(text, contentType, contentLength, p)) continue;

        const vulnSeverity: Severity = p.risk === 'critical' ? 'critical' : p.risk === 'high' ? 'high' : p.risk === 'medium' ? 'medium' : 'low';
        const cvss = p.cvss;
        vulns.push(makeVuln(
          `file-${p.path.replace(/\//g, '-')}`, vulnSeverity, 'file',
          `${p.name} is publicly accessible`,
          p.desc + `. Accessing this path may expose sensitive information.`,
          `HTTP ${res.status} returned at ${p.path} — content validated`,
          p.risk === 'critical' || p.risk === 'high'
            ? `Restrict access to ${p.path} using server configuration. Remove or deny public access.`
            : `Review if ${p.path} exposure is intentional. Consider restricting access.`,
          p.cwe, cvss, base + p.path
        ));
      } catch {
        // Skip on timeout/error
      }
    }
    return vulns;
  },
};

// Validates that a response is actually a sensitive file, not a SPA catch-all error page
function isValidFileResponse(text: string, contentType: string, contentLength: number, pathConfig: { expectPlain?: boolean; expectEnv?: boolean; expectGit?: boolean; expectApache?: boolean; expectBinary?: boolean; expectXml?: boolean; expectJson?: boolean }): boolean {
  // If it's an HTML page (SPA catch-all), it's NOT a sensitive file
  if (contentType.includes('text/html')) return false;

  // For files expecting plain text, check for expected content patterns
  if (pathConfig.expectEnv) {
    // .env files contain KEY=VALUE patterns, not HTML
    return /[A-Z_][A-Z0-9_]*=.+/m.test(text) && !text.includes('<html') && !text.includes('<!DOCTYPE');
  }
  if (pathConfig.expectGit) {
    return text.includes('[core]') || text.includes('gitdir:') || text.includes('ref:');
  }
  if (pathConfig.expectApache) {
    return text.includes('Server Roots') || text.includes('Server Modules') || text.includes('Server Version') || text.includes('<title>Apache Status</title>');
  }
  if (pathConfig.expectBinary) {
    // .DS_Store is a binary file with magic bytes
    return text.includes('DS Store') || text.length > 1000;
  }
  if (pathConfig.expectXml) {
    return text.trim().startsWith('<?xml') || text.trim().startsWith('<configuration') || text.trim().startsWith('<cross-domain-policy');
  }
  if (pathConfig.expectJson) {
    return text.trim().startsWith('{') || text.trim().startsWith('[');
  }
  if (pathConfig.expectPlain) {
    // robots.txt should be plain text, not HTML
    return !text.includes('<html') && !text.includes('<!DOCTYPE') && text.length < 5000;
  }
  // For paths without specific validation, check it's not an HTML catch-all
  return !text.includes('<html') && !text.includes('<!DOCTYPE') && text.length < contentLength * 1.5;
}

function getHeaderDirective(headerName: string): string {
  const directives: Record<string, string> = {
    'X-Content-Type-Options': 'X-Content-Type-Options: nosniff',
    'X-Frame-Options': 'X-Frame-Options: DENY',
    'Strict-Transport-Security': 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': 'Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'',
    'X-XSS-Protection': 'X-XSS-Protection: 1; mode=block',
    'Referrer-Policy': 'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy': 'Permissions-Policy: geolocation=(), camera=(), microphone=()',
    'Cross-Origin-Opener-Policy': 'Cross-Origin-Opener-Policy: same-origin',
    'Cross-Origin-Resource-Policy': 'Cross-Origin-Resource-Policy: same-origin',
  };
  return directives[headerName] || `${headerName}: <appropriate-value>`;
}
