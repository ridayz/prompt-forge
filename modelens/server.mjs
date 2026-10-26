import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 5174;
const app = express();
app.use(express.json({ limit: '6mb' }));

function normalizeBase(input) {
  const url = new URL(String(input ?? '').trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Base URL harus memakai http atau https');
  }
  return url.toString().replace(/\/+$/, '');
}

async function upstream(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

app.post('/api/models', async (req, res) => {
  try {
    const base = normalizeBase(req.body.baseUrl);
    const r = await upstream(
      `${base}/models`,
      { headers: { Authorization: `Bearer ${req.body.apiKey ?? ''}` } },
      20000,
    );
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message ?? `HTTP ${r.status}` });
    }
    const models = (data?.data ?? [])
      .map((m) => ({ id: String(m.id), ownedBy: String(m.owned_by ?? '') }))
      .sort((a, b) => a.id.localeCompare(b.id));
    res.json({ models });
  } catch (error) {
    res.status(400).json({ error: error.message ?? String(error) });
  }
});

app.post('/api/chat', async (req, res) => {
  const { baseUrl, apiKey, model, messages, maxTokens = 512 } = req.body;
  const started = Date.now();
  try {
    const base = normalizeBase(baseUrl);
    const r = await upstream(
      `${base}/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey ?? ''}` },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0 }),
      },
      60000,
    );
    const latencyMs = Date.now() - started;
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      return res.json({ ok: false, status: r.status, latencyMs, error: data?.error?.message ?? `HTTP ${r.status}` });
    }
    const text = data?.choices?.[0]?.message?.content ?? '';
    const tokens = data?.usage?.completion_tokens ?? null;
    res.json({ ok: true, status: r.status, latencyMs, text, tokens });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    res.json({
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      error: timedOut ? 'Timeout (>60 dtk)' : (error.message ?? String(error)),
    });
  }
});

app.use(express.static(path.join(root, 'dist')));

app.listen(port, () => console.log(`Modelens jalan di http://localhost:${port}`));
