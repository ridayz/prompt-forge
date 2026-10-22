import { NextResponse } from 'next/server';
import { scanTarget } from '@/lib/scanner';

export async function POST(request: Request) {
  const body = await request.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const result = await scanTarget(targetUrl);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Scan failed', details: String(err) }, { status: 500 });
  }
}
