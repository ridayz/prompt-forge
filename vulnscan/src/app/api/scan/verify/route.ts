import { NextResponse } from 'next/server';
import { verifyExploit } from '@/lib/exploit';
import { executePoC } from '@/lib/poc';
import type { Vulnerability } from '@/types';

export async function POST(request: Request) {
  const body = await request.json();
  const { targetUrl, vulnerabilities }: { targetUrl: string; vulnerabilities: Vulnerability[] } = body;

  if (!targetUrl || !vulnerabilities) {
    return NextResponse.json({ error: 'targetUrl and vulnerabilities are required' }, { status: 400 });
  }

  const verified = await Promise.all(
    vulnerabilities.map(async v => {
      if (v.severity === 'critical' || v.severity === 'high') {
        const exploit = await verifyExploit(v, targetUrl);
        const poc = await executePoC(v, targetUrl);
        return { ...v, exploit, poc };
      }
      return { ...v, exploit: null, poc: null };
    })
  );

  return NextResponse.json({ vulnerabilities: verified });
}
