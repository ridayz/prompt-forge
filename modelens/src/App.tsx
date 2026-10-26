import { useState } from 'react';
import type { TestCase } from './tests';
import { TESTS } from './tests';

type ModelInfo = { id: string; ownedBy: string };
type Verdict = 'pass' | 'fail' | 'empty' | 'error' | 'timeout';
type CaseResult = {
  test: TestCase;
  verdict: Verdict;
  text: string;
  error?: string;
  latencyMs: number;
  tokens: number | null;
};
type ModelRun = { model: string; results: CaseResult[] };

const VERDICT_LABEL: Record<Verdict, string> = {
  pass: 'Lulus',
  fail: 'Salah',
  empty: 'Kosong',
  error: 'Error',
  timeout: 'Timeout',
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await r.json()) as T;
}

async function loadVisionDataUrl(): Promise<string | null> {
  try {
    const img = new Image();
    img.src = '/vision-fixture.svg';
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    canvas.getContext('2d')!.drawImage(img, 0, 0, 800, 450);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function buildMessages(test: TestCase, imageUrl: string | null) {
  if (test.vision && imageUrl) {
    return [
      {
        role: 'user',
        content: [
          { type: 'text', text: test.prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ];
  }
  return [{ role: 'user', content: test.prompt }];
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState('https://apihub.agnes-ai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualModel, setManualModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [openModel, setOpenModel] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<'unknown' | 'ok' | 'fail'>('unknown');

  const selectedList = [...selected].sort();

  async function fetchModels() {
    setLoadingModels(true);
    setModelError('');
    setConnStatus('unknown');
    const data = await postJson<{ models?: ModelInfo[]; error?: string }>('/api/models', { baseUrl, apiKey });
    setLoadingModels(false);
    if (data.error || !data.models) {
      setModelError(data.error ?? 'Gagal mengambil daftar model');
      setConnStatus('fail');
      return;
    }
    setModels(data.models);
    setConnStatus('ok');
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addManual() {
    const id = manualModel.trim();
    if (!id) return;
    if (!models.some((m) => m.id === id)) setModels((prev) => [...prev, { id, ownedBy: 'manual' }]);
    setSelected((prev) => new Set(prev).add(id));
    setManualModel('');
  }

  async function runBenchmark() {
    if (!selectedList.length) return;
    setRunning(true);
    setRuns([]);
    setOpenModel(null);
    const imageUrl = await loadVisionDataUrl();
    const collected: ModelRun[] = [];

    for (const model of selectedList) {
      const results: CaseResult[] = [];
      for (const test of TESTS) {
        setProgress(`${model} → ${test.label}`);
        if (test.vision && !imageUrl) {
          results.push({ test, verdict: 'error', text: '', error: 'Gambar uji gagal dimuat', latencyMs: 0, tokens: null });
          continue;
        }
        const res = await postJson<{ ok: boolean; latencyMs: number; text?: string; tokens?: number | null; error?: string }>(
          '/api/chat',
          { baseUrl, apiKey, model, messages: buildMessages(test, imageUrl), maxTokens: 512 },
        );
        const text = res.text ?? '';
        let verdict: Verdict;
        if (!res.ok) verdict = res.error?.startsWith('Timeout') ? 'timeout' : 'error';
        else if (!text.trim()) verdict = 'empty';
        else verdict = test.check(text) ? 'pass' : 'fail';
        results.push({
          test,
          verdict,
          text,
          error: res.ok ? undefined : res.error,
          latencyMs: res.latencyMs,
          tokens: res.tokens ?? null,
        });
      }
      collected.push({ model, results });
      setRuns([...collected]);
    }
    setProgress('');
    setRunning(false);
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Modelens</p>
          <h1>AI Benchmark Studio</h1>
          <p className="sub">Benchmark kualitas, kecepatan, dan ketahanan model AI dari berbagai provider dalam satu tempat.</p>
        </div>
        <div className="heroBadge">
          <span>5 Tes · Logika · Koding · Instruksi · Pengetahuan · Vision</span>
        </div>
      </header>

      <section className="card">
        <h2>1. Koneksi API</h2>
        <div className="grid2">
          <label>
            Base URL
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://apihub.agnes-ai.com/v1" />
          </label>
          <label>
            API Key
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          </label>
        </div>
        <p className="hint">API key hanya ada di memori halaman ini dan tidak disimpan.</p>
        <button className="btn" onClick={fetchModels} disabled={!baseUrl || !apiKey || loadingModels}>
          {loadingModels ? 'Mengambil model…' : 'Ambil daftar model'}
        </button>
        {connStatus === 'ok' && <p className="hint" style={{ color: 'var(--ok)' }}>✅ Terhubung — {models.length} model ditemukan</p>}
        {connStatus === 'fail' && <p className="error">{modelError}</p>}
      </section>

      <section className="card">
        <h2>2. Pilih model</h2>
        {models.length === 0 && <p className="hint">Belum ada model. Isi API di atas lalu klik "Ambil daftar model".</p>}
        {models.length > 0 && (
          <div className="checkboxRow">
            <button className="btn ghost small" onClick={() => setSelected(new Set(models.map((m) => m.id)))}>Pilih Semua</button>
            <button className="btn ghost small" onClick={() => setSelected(new Set())}>Hapus Semua</button>
            <span className="hint" style={{ alignSelf: 'center' }}>{selected.size} dipilih dari {models.length}</span>
          </div>
        )}
        <div className="modelGrid">
          {models.map((m) => (
            <label key={m.id} className={`modelItem ${selected.has(m.id) ? 'on' : ''}`}>
              <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
              <span>
                <strong>{m.id}</strong>
                {m.ownedBy && <small>{m.ownedBy}</small>}
              </span>
            </label>
          ))}
        </div>
        <div className="manual">
          <input
            value={manualModel}
            onChange={(e) => setManualModel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addManual()}
            placeholder="atau ketik ID model manual"
          />
          <button className="btn ghost" onClick={addManual}>Tambah</button>
        </div>
      </section>

      <section className="card">
        <h2>3. Jalankan benchmark</h2>
        <p className="hint">
          {TESTS.length} tes per model: {TESTS.map((t) => t.label).join(', ')}.
        </p>
        <button className="btn primary" onClick={runBenchmark} disabled={running || selected.size === 0}>
          {running ? `Sedang menguji… ${selected.size} model` : `🚀 Jalankan Benchmark (${selected.size} model)`}
        </button>
        {running && progress && <p className="progress">{progress}</p>}
      </section>

      {runs.length > 0 && (
        <section className="card">
          <h2>📊 Hasil Benchmark</h2>
          <table className="summary">
            <thead>
              <tr>
                <th>Model</th>
                <th>Skor</th>
                <th>Rata-rata Latency</th>
                <th>Tanda</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const pass = run.results.filter((r) => r.verdict === 'pass').length;
                const errors = run.results.filter((r) => r.verdict === 'error').length;
                const okRuns = run.results.filter((r) => r.latencyMs > 0);
                const avg = okRuns.length ? Math.round(okRuns.reduce((a, r) => a + r.latencyMs, 0) / okRuns.length) : 0;
                return (
                  <tr key={run.model} className={`clickable ${errors === run.results.length ? 'all-errors' : ''}`} onClick={() => setOpenModel(openModel === run.model ? null : run.model)}>
                    <td><strong>{run.model}</strong></td>
                    <td>{errors === run.results.length ? '❌ Error' : `${pass}/${run.results.length}`}</td>
                    <td>{avg > 0 ? `${avg} ms` : '-'}</td>
                    <td>
                      {errors === run.results.length ? (
                        <span className="badge error">Semua Error</span>
                      ) : (
                        run.results.map((r) => (
                          <span key={r.test.id} className={`badge ${r.verdict}`}>
                            {r.test.label}: {VERDICT_LABEL[r.verdict]}
                          </span>
                        ))
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {runs.filter((r) => r.model === openModel).map((run) => (
            <div key={run.model} className="detail">
              <h3>{run.model}</h3>
              {run.results.map((r) => (
                <div key={r.test.id} className={`case ${r.verdict}`}>
                  <div className="caseHead">
                    <strong>{r.test.label}</strong>
                    <span className="tag">{r.test.category}</span>
                    <span className={`badge ${r.verdict}`}>{VERDICT_LABEL[r.verdict]}</span>
                    <span className="meta">{r.latencyMs > 0 ? `${r.latencyMs} ms · ${r.tokens ?? '?'} token` : ''}</span>
                  </div>
                  {r.error && <p className="error">⚠️ {r.error}</p>}
                  {r.text && <pre>{r.text}</pre>}
                </div>
              ))}
            </div>
          ))}
          {!openModel && <p className="hint">Klik baris model untuk melihat jawaban detail.</p>}
        </section>
      )}
    </div>
  );
}
