# VulnScan — Web Security Scanner

## What this does
- Scan any website URL for security vulnerabilities
- Detects: missing security headers, CORS misconfig, cookie issues, open redirects, sensitive files, mixed content, clickjacking
- Generates professional Markdown reports for responsible disclosure

## Usage
```bash
npm run dev
# Open http://localhost:3001
# Enter a target URL → Scan → Review findings → Download/Copy report
```

## Checks Performed
| Category | What's checked |
|----------|---------------|
| Security Headers | X-Frame-Options, CSP, HSTS, X-Content-Type-Options, Referrer-Policy, etc. |
| CSP Analysis | unsafe-inline, wildcard sources, deprecated report-uri |
| HSTS | max-age, includeSubDomains, preload |
| Cookies | Secure, HttpOnly, SameSite flags |
| CORS | Wildcard origin, origin reflection, credentials + wildcard combo |
| Open Redirect | HTTP→HTTPS downgrade, external domain redirects |
| Sensitive Files | .env, .git, wp-admin, phpmyadmin, server-status, etc. |
| Mixed Content | HTTP resources on HTTPS pages |
| Clickjacking | X-Frame-Options + CSP frame-ancestors |
| Tech Detection | Framework, server, CDN/WAF identification |

## Important
- Only scan websites you own or have written authorization to test
- Use findings for responsible disclosure, not exploitation
- Report generated in Markdown format for bug bounty platforms
