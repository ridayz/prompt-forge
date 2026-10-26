const http = require("http");
const fs = require("fs");
const path = require("path");

const KEY = "sk-zFesQXBpJmneLTZfgT90B8ff8dVaXn1q2NF26xiwOsEe0klR";
const BASE = "https://apihub.agnes-ai.com/v1";
const MODELS = ["agnes-2.5-flash", "agnes-3.0-flash"];

const tests = [
  { id: "math", label: "Hitungan", category: "Logika", prompt: "Budi membeli 7 pensil seharga Rp 3.000 per buah dan membayar dengan uang Rp 50.000. Berapa kembaliannya? Jawab angka saja.", check: (t) => /29[.,]?000/.test(t) },
  { id: "code", label: "Fungsi palindrom", category: "Koding", prompt: "Tulis fungsi JavaScript bernama isPalindrome(s) yang mengabaikan huruf besar/kecil dan karakter selain huruf atau angka. Balas hanya kode.", check: (t) => /isPalindrome/.test(t) && /(replace|match)/.test(t) && /(reverse|===|==|length)/.test(t) },
  { id: "json", label: "Output JSON", category: "Instruksi", prompt: 'Balas HANYA JSON valid dengan key "name" dan "age" untuk: Sinta, 27 tahun. Tanpa markdown dan tanpa penjelasan.', check: (t) => { try { const obj = JSON.parse(t.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")); return String(obj.name).includes("Sinta") && Number(obj.age) === 27; } catch { return false; } } },
  { id: "knowledge", label: "Pengetahuan umum", category: "Pengetahuan", prompt: "Apa ibu kota Australia? Jawab satu kata.", check: (t) => /canberra/i.test(t) },
  { id: "vision", label: "Baca gambar", category: "Vision", prompt: "Ada angka besar apa di gambar ini? Jawab angka saja.", check: (t) => /\b42\b/.test(t) },
];

function chatSync(model, messages) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ baseUrl: BASE, apiKey: KEY, model, messages, maxTokens: 512 });
    const req = http.request(
      { hostname: "localhost", port: 5174, path: "/api/chat", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => resolve(JSON.parse(d))); }
    );
    req.on("error", (e) => resolve({ ok: false, error: e.message, latencyMs: 0, tokens: null }));
    req.write(body);
    req.end();
  });
}

async function main() {
  const runs = [];
  for (const model of MODELS) {
    const results = [];
    for (const test of tests) {
      const res = await chatSync(model, [{ role: "user", content: test.prompt }]);
      const text = res.text ?? "";
      let verdict;
      if (!res.ok) verdict = "error";
      else if (!text.trim()) verdict = "empty";
      else verdict = test.check(text) ? "pass" : "fail";
      results.push({ test, verdict, text, error: res.error, latencyMs: res.latencyMs || 0, tokens: res.tokens ?? null });
    }
    runs.push({ model, results });
  }

  // Write results as JSON for React to read
  const outPath = path.join(__dirname, "bench-results.json");
  fs.writeFileSync(outPath, JSON.stringify(runs, null, 2), "utf8");
  console.log("Results written to bench-results.json");
  console.log(JSON.stringify(runs, null, 2));
}
main().catch(console.error);
