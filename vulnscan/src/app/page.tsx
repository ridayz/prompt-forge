'use client';

import { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Search, Download, RefreshCw, Server, Globe, Lock, Bug, Zap, Eye, Skull, FileText, ChevronRight } from 'lucide-react';
import { scanTarget } from '@/lib/scanner';
import type { ScanResult, Vulnerability, Severity, ExploitResult } from '@/types';

const severityColors: Record<Severity, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  high:     { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  medium:   { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  low:      { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  info:     { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30', dot: 'bg-zinc-500' },
};

const categoryLabels: Record<string, string> = {
  header: 'Security Header', csp: 'Content Security', redirect: 'Redirect',
  file: 'Sensitive File', ssl: 'SSL/TLS', cors: 'CORS', cookie: 'Cookie',
  server: 'Server', tech: 'Technology',
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const [copied, setCopied] = useState(false);
  const [expandedVuln, setExpandedVuln] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleScan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Auto-verify exploits for critical + high findings
      const verifiedRes = await fetch('/api/scan/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: data.target, vulnerabilities: data.vulnerabilities }),
      });
      const verifiedData = await verifiedRes.json();
      if (verifiedData.vulnerabilities) {
        data.vulnerabilities = verifiedData.vulnerabilities;
      }

      setResult(data);
      // Auto-expand first critical/high vulnerability
      const firstHigh = data.vulnerabilities.find((v: any) => v.severity === 'critical' || v.severity === 'high');
      if (firstHigh) setTimeout(() => setExpandedVuln(firstHigh.id), 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleVerify = async () => {
    if (!result) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/scan/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: result.target, vulnerabilities: result.vulnerabilities }),
      });
      const data = await res.json();
      if (data.vulnerabilities) {
        setResult(prev => prev ? { ...prev, vulnerabilities: data.vulnerabilities } : null);
      }
    } catch (e) {
      console.error('Verify error:', e);
    } finally {
      setVerifying(false);
    }
  };

  const filteredVulns = result
    ? filter === 'all' ? result.vulnerabilities : result.vulnerabilities.filter(v => v.severity === filter)
    : [];

  const generateReport = () => {
    if (!result) return '';
    const lines: string[] = [];
    lines.push('# 🛡️ Vulnerability Report — Responsible Disclosure');
    lines.push('');
    lines.push(`**Target:** ${result.target}`);
    lines.push(`**Date:** ${new Date(result.timestamp).toLocaleString()}`);
    lines.push(`**Scanner:** VulnScan v1.0 (Automated Security Assessment)`);
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`This automated security scan identified **${result.summary.total} potential vulnerabilities** in ${result.target}.`);
    lines.push('');
    lines.push('| Severity | Count | Risk Level |');
    lines.push('|----------|-------|------------|');
    lines.push(`| 🔴 Critical | ${result.summary.critical} | ${result.summary.critical > 0 ? 'IMMEDIATE ACTION REQUIRED' : '—'} |`);
    lines.push(`| 🟠 High | ${result.summary.high} | ${result.summary.high > 0 ? 'Fix within 7 days' : '—'} |`);
    lines.push(`| 🟡 Medium | ${result.summary.medium} | ${result.summary.medium > 0 ? 'Fix within 30 days' : '—'} |`);
    lines.push(`| 🔵 Low | ${result.summary.low} | ${result.summary.low > 0 ? 'Fix within 90 days' : '—'} |`);
    lines.push(`| ⚪ Info | ${result.summary.info} | Informational |`);
    lines.push(`| **Total** | **${result.summary.total}** | |`);
    lines.push('');

    if (result.techStack) {
      lines.push('## Technology Stack Detected');
      lines.push('');
      lines.push(result.techStack.join(', '));
      lines.push('');
    }
    if (result.serverInfo?.server) {
      lines.push('## Server Information');
      lines.push('');
      lines.push(`- Server: ${result.serverInfo.server}`);
      if (result.serverInfo.waf) lines.push(`- WAF: ${result.serverInfo.waf}`);
      if (result.serverInfo.cloudflare) lines.push(`- CDN: Cloudflare`);
      if (result.serverInfo.xPoweredBy) lines.push(`- X-Powered-By: ${result.serverInfo.xPoweredBy}`);
      lines.push('');
    }

    const exploitable = result.vulnerabilities.filter(v => v.exploit?.verified);
    lines.push('## Exploitable Vulnerabilities');
    lines.push('');
    lines.push(`**${exploitable.length} vulnerability(ies) can be automatically verified.**`);
    lines.push('');

    for (const v of result.vulnerabilities) {
      lines.push(`### ${v.title}`);
      lines.push('');
      lines.push(`- **Severity:** ${v.severity.toUpperCase()} (CVSS ${v.cvss})`);
      lines.push(`- **Category:** ${categoryLabels[v.category] || v.category}`);
      lines.push(`- **CWE:** ${v.cwe}`);
      if (v.location) lines.push(`- **Location:** ${v.location}`);
      lines.push('');
      lines.push('**Description:**');
      lines.push(v.description);
      lines.push('');
      lines.push('**Evidence:**');
      lines.push('```');
      lines.push(v.evidence);
      lines.push('```');
      lines.push('');
      if (v.exploit) {
        lines.push('**⚠️ EXPLOIT VERIFICATION:**');
        lines.push('');
        lines.push(`- **Verified:** ${v.exploit.verified ? 'YES — vulnerability is CONFIRMED' : 'NO — could not verify automatically'}`);
        lines.push(`- **Impact:** ${v.exploit.impact}`);
        lines.push(`- **Worst Case:** ${v.exploit.worstCase}`);
        lines.push(`- **Attack Method:** ${v.exploit.method}`);
        if (v.exploit.proof) {
          lines.push('');
          lines.push('**Proof of Concept:**');
          lines.push('```');
          lines.push(v.exploit.proof);
          lines.push('```');
        }
        lines.push('');
      }
      lines.push('**Remediation:**');
      lines.push(v.remediation);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    lines.push('## Responsible Disclosure Notice');
    lines.push('');
    lines.push('This report was generated by **VulnScan** for responsible disclosure purposes.');
    lines.push('');
    lines.push('### If you are the website owner:');
    lines.push('1. Review each vulnerability and its remediation advice');
    lines.push('2. Prioritize fixing Critical and High severity issues immediately');
    lines.push('3. Test fixes in a staging environment before applying to production');
    lines.push('4. Consider engaging a professional security firm for comprehensive testing');
    lines.push('');
    lines.push('### If you found this via bug bounty:');
    lines.push('Please submit your findings through the appropriate channel:');
    lines.push('- HackerOne, Bugcrowd, or directly to the security team');
    lines.push('- Include screenshots and step-by-step reproduction instructions');
    lines.push('- Do NOT exploit vulnerabilities beyond what is necessary for proof');
    lines.push('');
    lines.push('---');
    lines.push('*Report generated by VulnScan v1.0 — For authorized security testing only.*');
    lines.push('*Unauthorized access to computer systems is illegal under applicable laws.*');

    return lines.join('\n');
  };

  const copyReport = () => {
    const report = generateReport();
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = `vulnscan-report-${new Date().toISOString().slice(0,10)}.md`;
    a.click();
    URL.revokeObjectURL(urlObj);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan();
  };

  const totalExploitable = result?.vulnerabilities.filter(v => v.exploit?.verified).length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">VulnScan</h1>
            <p className="text-xs text-zinc-500">Security Scanner + Exploit Verifier</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {result && (
              <span className="text-xs text-zinc-500">
                {totalExploitable > 0 ? `🔴 ${totalExploitable} exploitable` : '✅ No exploitable vulns'}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Authorized Use Only</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Input */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-medium text-zinc-200">Target URL</h2>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com"
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={scanning || !url.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {scanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            ⚠️ Only scan websites you own or have explicit written authorization. Unauthorized scanning violates computer fraud laws.
          </p>
          {error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Loading */}
        {scanning && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Scanning {url}...</p>
            <p className="text-xs text-zinc-600 mt-1">Headers → Cookies → CORS → Sensitive Files → Exploit Verification</p>
          </div>
        )}

        {/* Verifying */}
        {verifying && (
          <div className="bg-zinc-900 border border-amber-500/30 rounded-xl p-6 text-center">
            <Bug className="w-8 h-8 text-amber-400 animate-pulse mx-auto mb-3" />
            <p className="text-sm text-amber-400">Verifying exploits...</p>
            <p className="text-xs text-zinc-500 mt-1">Testing each vulnerability to confirm it's exploitable</p>
          </div>
        )}

        {/* Results */}
        {result && !scanning && (
          <div ref={resultsRef} className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Total', value: result.summary.total, color: 'text-zinc-100', icon: AlertTriangle },
                { label: 'Critical', value: result.summary.critical, color: 'text-red-400', icon: XCircle },
                { label: 'High', value: result.summary.high, color: 'text-orange-400', icon: AlertTriangle },
                { label: 'Medium', value: result.summary.medium, color: 'text-yellow-400', icon: AlertTriangle },
                { label: 'Low/Info', value: result.summary.low + result.summary.info, color: 'text-blue-400', icon: CheckCircle },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`bg-zinc-900 border rounded-xl p-4 ${s.label === 'Critical' ? 'border-red-500/30' : s.label === 'High' ? 'border-orange-500/30' : 'border-zinc-800'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${s.color}`} />
                      <span className="text-xs text-zinc-500">{s.label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                <Bug className="w-3.5 h-3.5" />
                {verifying ? 'Verifying...' : 'Verify Exploits'}
              </button>
              <button
                onClick={copyReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Report'}
              </button>
              <button
                onClick={downloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Markdown
              </button>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-zinc-500">Filter:</span>
                {(['all', 'critical', 'high', 'medium', 'low', 'info'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      filter === f ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Info cards */}
            {(result.techStack || result.serverInfo) && (
              <div className="grid grid-cols-2 gap-3">
                {result.techStack && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Server className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Tech Stack</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.techStack.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded-md border border-zinc-700">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.serverInfo && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Server</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      {result.serverInfo.server && <p className="text-zinc-300"><span className="text-zinc-500">Server:</span> {result.serverInfo.server}</p>}
                      {result.serverInfo.waf && <p className="text-zinc-300"><span className="text-zinc-500">WAF:</span> {result.serverInfo.waf}</p>}
                      {result.serverInfo.cloudflare && <p className="text-zinc-300"><span className="text-zinc-500">CDN:</span> Cloudflare</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vulnerabilities */}
            <div className="space-y-3">
              {filteredVulns.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm text-zinc-300">No vulnerabilities found</p>
                  <p className="text-xs text-zinc-500 mt-1">This target appears to have good security practices.</p>
                </div>
              ) : (
                filteredVulns.map(v => {
                  const c = severityColors[v.severity];
                  const isExpanded = expandedVuln === v.id;
                  return (
                    <div key={v.id} className={`bg-zinc-900 border ${c.border} rounded-xl overflow-hidden`}>
                      {/* Header */}
                      <button
                        onClick={() => setExpandedVuln(isExpanded ? null : v.id)}
                        className="w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-sm">{v.severity === 'critical' ? '💀' : v.severity === 'high' ? '🔥' : v.severity === 'medium' ? '⚠️' : v.severity === 'low' ? 'ℹ️' : '📋'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-medium text-zinc-100">{v.title}</h3>
                            {v.exploit?.verified && (
                              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                <Skull className="w-2.5 h-2.5" /> EXPLOITABLE
                              </span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${c.bg} ${c.text} border ${c.border}`}>
                              CVSS {v.cvss}
                            </span>
                            <span className="text-[10px] text-zinc-600">{v.cwe}</span>
                            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">{categoryLabels[v.category] || v.category}</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{v.description}</p>
                        </div>
                        <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-zinc-800 p-4 space-y-4">
                          {/* Evidence */}
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Evidence</p>
                            <code className="text-xs text-zinc-300 font-mono bg-zinc-950 px-3 py-2 rounded-lg block">{v.evidence}</code>
                            {v.location && <p className="text-xs text-zinc-600 mt-1 font-mono">📍 {v.location}</p>}
                          </div>

                          {/* Exploit verification */}
                          {v.exploit && (
                            <div className={`rounded-lg p-4 border ${v.exploit.verified ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-800/50 border-zinc-700'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                {v.exploit.verified ? (
                                  <><Skull className="w-4 h-4 text-red-400" /><span className="text-sm font-medium text-red-400">Exploit Verified ✅</span></>
                                ) : (
                                  <><Eye className="w-4 h-4 text-zinc-400" /><span className="text-sm font-medium text-zinc-400">Manual Verification Needed</span></>
                                )}
                              </div>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <span className="text-zinc-500">Impact: </span>
                                  <span className="text-zinc-300">{v.exploit.impact}</span>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Worst Case: </span>
                                  <span className="text-red-300/80">{v.exploit.worstCase}</span>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Method: </span>
                                  <span className="text-zinc-300 font-mono">{v.exploit.method}</span>
                                </div>
                                {v.exploit.proof && (
                                  <div>
                                    <span className="text-zinc-500">Proof: </span>
                                    <code className="text-zinc-300 font-mono bg-zinc-950 px-2 py-0.5 rounded">{v.exploit.proof}</code>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Remediation */}
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Remediation</p>
                            <p className="text-xs text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 whitespace-pre-wrap">{v.remediation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Disclosure notice */}
            {result.summary.critical > 0 || result.summary.high > 0 ? (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Skull className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-medium text-red-400">⚠️ Critical/High Vulnerabilities Found</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {result.summary.critical > 0 && `🔴 ${result.summary.critical} Critical issue(s) found — these can lead to full system compromise. `}
                  {result.summary.high > 0 && `🟠 ${result.summary.high} High-severity issue(s) found — these can lead to data breach or account takeover. `}
                  {result.summary.critical + result.summary.high > 0 && (
                    <>
                      If you own this site, fix these <strong className="text-red-400">immediately</strong>.
                      If you found this via bug bounty, submit through the proper channel with proof of concept.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                <p className="text-xs text-emerald-400/80">
                  ✅ No critical or high-severity exploitable vulnerabilities found. Good security posture!
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 mt-8 py-4">
        <p className="text-center text-xs text-zinc-700">
          VulnScan v1.0 — Automated security scanner with exploit verification. For authorized testing only.
        </p>
      </footer>
    </div>
  );
}
