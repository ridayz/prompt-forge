# 🛡️ Vulnerability Report — Responsible Disclosure

**Target:** https://celestialuna.com
**Date:** 2026-10-19 11:48:52
**Scanner:** VulnScan v1.0

## Executive Summary

This automated security scan identified **23 potential vulnerabilities** in https://celestialuna.com.

| Severity | Count | Risk Level |
|----------|-------|------------|
| 🔴 Critical | 1 | IMMEDIATE ACTION REQUIRED |
| 🟠 High | 10 | Fix within 7 days |
| 🟡 Medium | 7 | Fix within 30 days |
| 🔵 Low | 5 | Fix within 90 days |
| **Total** | **23** | |

## Technology Stack

Nginx, Via: 1.1 google

## Server Information

- Server: nginx

## Critical Vulnerabilities
### 🔴 .env is publicly accessible

- **CVSS:** 9.8
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/.env

**Evidence:**`n$(@{id=file--.env; severity=critical; category=file; title=.env is publicly accessible; description=Environment variables including secrets. Accessing this path may expose sensitive information.; evidence=HTTP 200 returned at /.env; remediation=Restrict access to /.env using server configuration. Remove or deny public access.; cwe=CWE-200; cvss=9.8; location=https://celestialuna.com/.env}.evidence)`n
**Remediation:**
Restrict access to /.env using server configuration. Remove or deny public access.

---

## High Severity Vulnerabilities
### 🟠 Missing Security Header: Strict-Transport-Security

- **CVSS:** 7.4
- **CWE:** CWE-319
- **Location:** 

**Evidence:**`n$(@{id=hdr-0; severity=high; category=header; title=Missing Security Header: Strict-Transport-Security; description=The Strict-Transport-Security header is not set. This header provides defense-in-depth against common web attacks.; evidence=Header Strict-Transport-Security not found in response.; remediation=Add the following header to all responses:
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload; cwe=CWE-319; cvss=7.4}.evidence)`n
**Remediation:**
Add the following header to all responses:
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

---

### 🟠 Missing Security Header: Content-Security-Policy

- **CVSS:** 7.5
- **CWE:** CWE-79
- **Location:** 

**Evidence:**`n$(@{id=hdr-1; severity=high; category=header; title=Missing Security Header: Content-Security-Policy; description=The Content-Security-Policy header is not set. This header provides defense-in-depth against common web attacks.; evidence=Header Content-Security-Policy not found in response.; remediation=Add the following header to all responses:
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; cwe=CWE-79; cvss=7.5}.evidence)`n
**Remediation:**
Add the following header to all responses:
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'

---

### 🟠 Cookie "csrftoken" missing Secure flag

- **CVSS:** 7.5
- **CWE:** CWE-614
- **Location:** 

**Evidence:**`n$(@{id=cookie-sec-0; severity=high; category=cookie; title=Cookie "csrftoken" missing Secure flag; description=Cookie is transmitted over unencrypted HTTP connections, exposing session tokens to interception.; evidence=Cookie: csrftoken, Secure: missing; remediation=Add Secure attribute to all cookies, especially session tokens.; cwe=CWE-614; cvss=7.5}.evidence)`n
**Remediation:**
Add Secure attribute to all cookies, especially session tokens.

---

### 🟠 phpmyadmin is publicly accessible

- **CVSS:** 7.5
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/phpmyadmin/

**Evidence:**`n$(@{id=file--phpmyadmin-; severity=high; category=file; title=phpmyadmin is publicly accessible; description=phpMyAdmin exposed. Accessing this path may expose sensitive information.; evidence=HTTP 200 returned at /phpmyadmin/; remediation=Restrict access to /phpmyadmin/ using server configuration. Remove or deny public access.; cwe=CWE-200; cvss=7.5; location=https://celestialuna.com/phpmyadmin/}.evidence)`n
**Remediation:**
Restrict access to /phpmyadmin/ using server configuration. Remove or deny public access.

---

### 🟠 backup directory is publicly accessible

- **CVSS:** 7.5
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/backup/

**Evidence:**`n$(@{id=file--backup-; severity=high; category=file; title=backup directory is publicly accessible; description=Backup files may be accessible. Accessing this path may expose sensitive information.; evidence=HTTP 200 returned at /backup/; remediation=Restrict access to /backup/ using server configuration. Remove or deny public access.; cwe=CWE-200; cvss=7.5; location=https://celestialuna.com/backup/}.evidence)`n
**Remediation:**
Restrict access to /backup/ using server configuration. Remove or deny public access.

---

### 🟠 server-status is publicly accessible

- **CVSS:** 7.5
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/server-status

**Evidence:**`n$(@{id=file--server-status; severity=high; category=file; title=server-status is publicly accessible; description=Apache server status exposed. Accessing this path may expose sensitive information.; evidence=HTTP 200 returned at /server-status; remediation=Restrict access to /server-status using server configuration. Remove or deny public access.; cwe=CWE-200; cvss=7.5; location=https://celestialuna.com/server-status}.evidence)`n
**Remediation:**
Restrict access to /server-status using server configuration. Remove or deny public access.

---

### 🟠 server-info is publicly accessible

- **CVSS:** 7.5
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/server-info

**Evidence:**`n$(@{id=file--server-info; severity=high; category=file; title=server-info is publicly accessible; description=Apache server info exposed. Accessing this path may expose sensitive information.; evidence=HTTP 200 returned at /server-info; remediation=Restrict access to /server-info using server configuration. Remove or deny public access.; cwe=CWE-200; cvss=7.5; location=https://celestialuna.com/server-info}.evidence)`n
**Remediation:**
Restrict access to /server-info using server configuration. Remove or deny public access.

---

### 🟠 web.config is publicly accessible

- **CVSS:** 7.5
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/web.config

**Evidence:**`n$(@{id=file--web.config; severity=high; category=file; title=web.config is publicly accessible; description=IIS config file exposed. Accessing this path may expose sensitive information.; evidence=HTTP 200 returned at /web.config; remediation=Restrict access to /web.config using server configuration. Remove or deny public access.; cwe=CWE-200; cvss=7.5; location=https://celestialuna.com/web.config}.evidence)`n
**Remediation:**
Restrict access to /web.config using server configuration. Remove or deny public access.

---

### 🟠 elmah.axd is publicly accessible

- **CVSS:** 7.5
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/elmah.axd

**Evidence:**`n$(@{id=file--elmah.axd; severity=high; category=file; title=elmah.axd is publicly accessible; description=ELMAH error logs exposed (ASP.NET). Accessing this path may expose sensitive information.; evidence=HTTP 200 returned at /elmah.axd; remediation=Restrict access to /elmah.axd using server configuration. Remove or deny public access.; cwe=CWE-200; cvss=7.5; location=https://celestialuna.com/elmah.axd}.evidence)`n
**Remediation:**
Restrict access to /elmah.axd using server configuration. Remove or deny public access.

---

### 🟠 trace.axd is publicly accessible

- **CVSS:** 7.5
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/trace.axd

**Evidence:**`n$(@{id=file--trace.axd; severity=high; category=file; title=trace.axd is publicly accessible; description=ASP.NET tracing exposed. Accessing this path may expose sensitive information.; evidence=HTTP 200 returned at /trace.axd; remediation=Restrict access to /trace.axd using server configuration. Remove or deny public access.; cwe=CWE-200; cvss=7.5; location=https://celestialuna.com/trace.axd}.evidence)`n
**Remediation:**
Restrict access to /trace.axd using server configuration. Remove or deny public access.

---

## Medium Severity Vulnerabilities
### 🟡 wp-admin is publicly accessible

- **CVSS:** 4.3
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/wp-admin/

---

### 🟡 wp-login.php is publicly accessible

- **CVSS:** 4.3
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/wp-login.php

---

### 🟡 admin panel is publicly accessible

- **CVSS:** 4.3
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/admin/

---

### 🟡 .DS_Store is publicly accessible

- **CVSS:** 5.3
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/.DS_Store

---

### 🟡 crossdomain.xml is publicly accessible

- **CVSS:** 5.3
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/crossdomain.xml

---

### 🟡 api.json is publicly accessible

- **CVSS:** 4.3
- **CWE:** CWE-200
- **Location:** https://celestialuna.com/api.json

---

### 🟡 Mixed Content Detected

- **CVSS:** 4.3
- **CWE:** CWE-319
- **Location:** 

---

## Responsible Disclosure

If you are the website owner, please address these vulnerabilities promptly.
For critical issues, consider engaging a professional security firm.

---
*Report generated by VulnScan v1.0*
