export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ScanType = 'header' | 'xss' | 'sqli' | 'redirect' | 'file' | 'cors' | 'ssl' | 'tech' | 'server' | 'cookie' | 'csp' | 'mixed';

export interface Vulnerability {
  id: string;
  title: string;
  severity: Severity;
  category: ScanType;
  description: string;
  evidence: string;
  remediation: string;
  cwe: string;
  cvss: number;
  location?: string;
  method?: string;
  exploit?: ExploitResult | null;
  poc?: PocResult | null;
}

export interface ExploitResult {
  verified: boolean;
  proof?: string;
  impact: string;
  worstCase: string;
  method: string;
}

export interface PocResult {
  success: boolean;
  proof: string;
  impact: string;
  worstCase: string;
  method: string;
  steps: string[];
}

export interface ScanResult {
  target: string;
  timestamp: string;
  vulnerabilities: Vulnerability[];
  summary: ScanSummary;
  techStack?: string[];
  serverInfo?: ServerInfo;
  cookieInfo?: CookieInfo;
}

export interface ScanSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ServerInfo {
  server?: string;
  xPoweredBy?: string;
  via?: string;
  cloudflare?: boolean;
  waf?: string;
}

export interface CookieInfo {
  cookies: Cookie[];
  insecureCookies: Cookie[];
}

export interface Cookie {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  domain: string;
  path?: string;
  maxAge?: number;
}
