const http = require("http");

const KEY = "sk-zFesQXBpJmneLTZfgT90B8ff8dVaXn1q2NF26xiwOsEe0klR";
const MODELS = ["agnes-2.5-flash", "agnes-3.0-flash"];

const tests = [
  { id: "math", label: "Hitungan", category: "Logika", prompt: "Budi membeli 7 pensil seharga Rp 3.000 per buah dan membayar dengan uang Rp 50.000. Berapa kembaliannya? Jawab angka saja.", check: (t) => /29[.,]?000/.test(t) },
  { id: "code", label: "Fungsi palindrom", category: "Koding", prompt: "Tulis fungsi JavaScript bernama isPalindrome(s) yang mengabaikan huruf besar/kecil dan karakter selain huruf atau angka. Balas hanya kode.", check: (t) => /isPalindrome/.test(t) && /(replace|match)/.test(t) && /(reverse|===|==|length)/.test(t) },
  { id: "json", label: "Output JSON", category: "Instruksi", prompt: 'Balas HANYA JSON valid dengan key "name" dan "age" untuk: Sinta, 27 tahun. Tanpa markdown dan tanpa penjelasan.', check: (t) => { try { const obj = JSON.parse(t.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")); return String(obj.name).includes("Sinta") && Number(obj.age) === 27; } catch { return false; } } },
  { id: "knowledge", label: "Pengetahuan umum", category: "Pengetahuan", prompt: "Apa ibu kota Australia? Jawab satu kata.", check: (t) => /canberra/i.test(t) },
  { id: "vision", label: "Baca gambar", category: "Vision", prompt: "Ada angka besar apa di gambar ini? Jawab angka saja.", check: (t) => /\b42\b/.test(t) },
];

async function chat(model, messages) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ baseUrl: "https://apihub.agnes-ai.com/v1", apiKey: KEY, model, messages, maxTokens: 512 });
    const req = http.request(
      { hostname: "localhost", port: 5174, path: "/api/chat", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => resolve(JSON.parse(d))); }
    );
    req.on("error", (e) => resolve({ ok: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

async function main() {
  for (const model of MODELS) {
    console.log(`\n========== ${model} ==========`);
    for (const test of tests) {
      const messages = [{ role: "user", content: test.prompt }];
      const res = await chat(model, messages);
      const text = res.text ?? "";
      let verdict;
      if (!res.ok) verdict = "error";
      else if (!text.trim()) verdict = "empty";
      else verdict = test.check(text) ? "pass" : "fail";
      const tokens = res.tokens ?? "?";
      console.log(`[${verdict}] ${test.label} | ${res.latencyMs}ms ${tokens} token | "${text.trim().slice(0, 80)}"`);
    }
  }
}
main().catch(console.error);
