import type { Vulnerability, ScanResult, ScanSummary } from '../types';
import { verifyExploit } from './exploit';
import { executePoC } from './poc';

export async function scanTarget(targetUrl: string): Promise<ScanResult> {
  const startTime = Date.now();
  const vulnerabilities: Vulnerability[] = [];
  const { scanners } = await import('./scanners');

  let techStack: string[] = [];
  let serverInfo: any = {};
  let cookieInfo: any = null;

  try {
    // 1. Main page scan
    const res = await fetch(targetUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VulnScan/1.0)' }
    });

    const html = await res.text();
    const headers = res.headers;

    // Server info
    serverInfo = {
      server: headers.get('server') || undefined,
      xPoweredBy: headers.get('x-powered-by') || undefined,
      via: headers.get('via') || undefined,
      cloudflare: headers.get('server')?.toLowerCase().includes('cloudflare') ?? false,
      waf: detectWAF(headers),
    };

    // 2. Security header checks
    vulnerabilities.push(...scanners.checkMissingHeaders(headers));
    vulnerabilities.push(...scanners.checkCSP(headers));
    vulnerabilities.push(...scanners.checkHSTS(headers));

    // 3. Cookie checks
    const setCookie = headers.get('set-cookie');
    if (setCookie) {
      const cookieResult = scanners.checkCookies(setCookie);
      vulnerabilities.push(...cookieResult.vulns);
      cookieInfo = { cookies: cookieResult.cookies, insecureCookies: cookieResult.insecure };
    }

    // 4. Open redirect check
    vulnerabilities.push(...checkOpenRedirect(targetUrl, res));

    // 5. Technology detection
    techStack = scanners.detectTech(headers, html);

    // 6. Sensitive file discovery
    const fileVulns = await scanners.checkSensitivePaths(targetUrl);
    vulnerabilities.push(...fileVulns);

    // 7. Mixed content check
    vulnerabilities.push(...checkMixedContent(html, targetUrl));

    // 8. Clickjacking check (X-Frame-Options)
    vulnerabilities.push(...checkClickjacking(headers));

    // 9. CORS check
    vulnerabilities.push(...checkCORS(headers));

  } catch (err) {
    console.error('Scan error:', err);
    vulnerabilities.push({
      id: 'err-1',
      severity: 'info',
      category: 'server',
      title: 'Scan Error',
      description: 'An error occurred during scanning. The target may be down or blocking requests.',
      evidence: err instanceof Error ? err.message : String(err),
      remediation: 'Verify the target URL is correct and accessible.',
      cwe: 'CWE-000',
      cvss: 0,
    });
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  vulnerabilities.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const summary: ScanSummary = {
    total: vulnerabilities.length,
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    medium: vulnerabilities.filter(v => v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length,
    info: vulnerabilities.filter(v => v.severity === 'info').length,
  };

  return {
    target: targetUrl,
    timestamp: new Date().toISOString(),
    vulnerabilities,
    summary,
    techStack: techStack.length > 0 ? techStack : undefined,
    serverInfo: Object.keys(serverInfo).length > 0 ? serverInfo : undefined,
    cookieInfo,
  };
}

function detectWAF(headers: Headers): string | undefined {
  const server = headers.get('server')?.toLowerCase() ?? '';
  const xCache = headers.get('x-cache')?.toLowerCase() ?? '';
  const cfRay = headers.get('cf-ray');
  const xWaf = headers.get('x-waf') || headers.get('x-waf-status');
  if (cfRay) return 'Cloudflare';
  if (server.includes('akamai') || server.includes('edgenet')) return 'Akamai';
  if (server.includes('sucuri')) return 'Sucuri';
  if (server.includes('imperva') || server.includes('incapsula')) return 'Imperva/Incapsula';
  if (server.includes('f5') || server.includes('bigip')) return 'F5 BIG-IP';
  if (xWaf) return 'Custom WAF';
  if (xCache.includes('waf')) return 'WAF Detected';
  return undefined;
}

function checkOpenRedirect(targetUrl: string, response: Response): Vulnerability[] {
  const vulns: Vulnerability[] = [];
  const status = response.status;
  const location = response.headers.get('location') ?? '';

  if ([301, 302, 303, 307, 308].includes(status) && location) {
    const url = new URL(location, targetUrl);
    if (url.protocol === 'http:' && new URL(targetUrl).protocol === 'https:') {
      vulns.push({
        id: 'redirect-1',
        severity: 'medium',
        category: 'redirect',
        title: 'Insecure Redirect (HTTPS → HTTP)',
        description: 'The site redirects from HTTPS to HTTP, potentially exposing data to interception.',
        evidence: `HTTP ${status} → ${location}`,
        remediation: 'Ensure all redirects maintain the same protocol (HTTPS).',
        cwe: 'CWE-601',
        cvss: 5.9,
        location,
      });
    } else if (url.hostname !== new URL(targetUrl).hostname && !url.hostname.endsWith(new URL(targetUrl).hostname)) {
      vulns.push({
        id: 'redirect-2',
        severity: 'medium',
        category: 'redirect',
        title: 'Open Redirect Detected',
        description: 'The site performs an open redirect to an external domain. This can be exploited for phishing.',
        evidence: `HTTP ${status} → ${location}`,
        remediation: 'Validate redirect destinations against a whitelist of allowed domains.',
        cwe: 'CWE-601',
        cvss: 5.4,
        location,
      });
    }
  }
  return vulns;
}

function checkMixedContent(html: string, targetUrl: string): Vulnerability[] {
  const vulns: Vulnerability[] = [];
  if (!targetUrl.startsWith('https:')) return vulns;

  const httpAssets = html.match(/https:\/\/[^"'\s>]+\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)/gi) ?? [];
  const mixedContent = html.match(/http:\/\/[^"'\s>]+/gi) ?? [];

  if (mixedContent.length > 0) {
    vulns.push({
      id: 'mixed-1',
      severity: 'medium',
      category: 'ssl',
      title: 'Mixed Content Detected',
      description: 'The page contains resources loaded over HTTP on an HTTPS page. These resources can be intercepted or modified.',
      evidence: `Found ${mixedContent.length} HTTP resource(s) on HTTPS page`,
      remediation: 'Load all resources over HTTPS. Update resource URLs to use https:// or protocol-relative URLs.',
      cwe: 'CWE-319',
      cvss: 4.3,
    });
  }
  return vulns;
}

function checkClickjacking(headers: Headers): Vulnerability[] {
  const vulns: Vulnerability[] = [];
  const xfo = headers.get('x-frame-options')?.toLowerCase() ?? '';
  const csp = headers.get('content-security-policy')?.toLowerCase() ?? '';

  const hasXFO = xfo.includes('deny') || xfo.includes('sameorigin');
  const hasCSPFrame = csp.includes("frame-ancestors") || csp.includes("'none'") || csp.includes("'self'");

  if (!hasXFO && !hasCSPFrame) {
    vulns.push({
      id: 'clickjack-1',
      severity: 'medium',
      category: 'header',
      title: 'Clickjacking Vulnerability',
      description: 'The site does not set X-Frame-Options or CSP frame-ancestors, making it susceptible to clickjacking attacks.',
      evidence: 'X-Frame-Options and CSP frame-ancestors not configured',
      remediation: 'Add X-Frame-Options: DENY or Content-Security-Policy: frame-ancestors \'none\' header.',
      cwe: 'CWE-1021',
      cvss: 4.3,
    });
  }
  return vulns;
}

function checkCORS(headers: Headers): Vulnerability[] {
  const vulns: Vulnerability[] = [];
  const corsOrigin = headers.get('access-control-allow-origin');
  const corsCredentials = headers.get('access-control-allow-credentials');

  if (corsOrigin === '*') {
    vulns.push({
      id: 'cors-1',
      severity: 'high',
      category: 'cors',
      title: 'Wildcard CORS Origin',
      description: 'Access-Control-Allow-Origin is set to *, allowing any website to make cross-origin requests. This can lead to data leakage.',
      evidence: 'Access-Control-Allow-Origin: *',
      remediation: 'Replace wildcard with specific trusted domains. Do not combine with Allow-Credentials: true.',
      cwe: 'CWE-942',
      cvss: 7.4,
    });
  }

  if (corsOrigin === '*' && corsCredentials === 'true') {
    vulns.push({
      id: 'cors-2',
      severity: 'critical',
      category: 'cors',
      title: 'Critical CORS Misconfiguration',
      description: 'Wildcard CORS origin combined with Allow-Credentials: true allows any origin to read authenticated responses. This is a severe information disclosure vulnerability.',
      evidence: 'Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true',
      remediation: 'Set Access-Control-Allow-Origin to specific trusted domains. Never use wildcard with credentials.',
      cwe: 'CWE-942',
      cvss: 9.1,
    });
  }

  if (corsOrigin && corsOrigin !== '*' && corsOrigin !== 'null') {
    // Check if it reflects the request origin (potential SSRF/ORIGIN reflection)
    vulns.push({
      id: 'cors-3',
      severity: 'info',
      category: 'cors',
      title: 'CORS Origin Reflection',
      description: 'The Access-Control-Allow-Origin header reflects the request origin. This may expose sensitive data to cross-origin requests.',
      evidence: `Access-Control-Allow-Origin: ${corsOrigin}`,
      remediation: 'Implement strict CORS policy with an allowlist of trusted origins.',
      cwe: 'CWE-942',
      cvss: 3.7,
    });
  }

  return vulns;
}
