export type Category = 'Logika' | 'Koding' | 'Instruksi' | 'Pengetahuan' | 'Vision';

export type TestCase = {
  id: string;
  label: string;
  category: Category;
  prompt: string;
  vision?: boolean;
  check: (text: string) => boolean;
};

export const TESTS: TestCase[] = [
  {
    id: 'math',
    label: 'Hitungan',
    category: 'Logika',
    prompt: 'Budi membeli 7 pensil seharga Rp 3.000 per buah dan membayar dengan uang Rp 50.000. Berapa kembaliannya? Jawab angka saja.',
    check: (t) => /29[.,]?000/.test(t),
  },
  {
    id: 'code',
    label: 'Fungsi palindrom',
    category: 'Koding',
    prompt: 'Tulis fungsi JavaScript bernama isPalindrome(s) yang mengabaikan huruf besar/kecil dan karakter selain huruf atau angka. Balas hanya kode.',
    check: (t) => /isPalindrome/.test(t) && /(replace|match)/.test(t) && /(reverse|===|==|length)/.test(t),
  },
  {
    id: 'json',
    label: 'Output JSON',
    category: 'Instruksi',
    prompt: 'Balas HANYA JSON valid dengan key "name" dan "age" untuk: Sinta, 27 tahun. Tanpa markdown dan tanpa penjelasan.',
    check: (t) => {
      try {
        const obj = JSON.parse(t.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
        return String(obj.name).includes('Sinta') && Number(obj.age) === 27;
      } catch {
        return false;
      }
    },
  },
  {
    id: 'knowledge',
    label: 'Pengetahuan umum',
    category: 'Pengetahuan',
    prompt: 'Apa ibu kota Australia? Jawab satu kata.',
    check: (t) => /canberra/i.test(t),
  },
  {
    id: 'vision',
    label: 'Baca gambar',
    category: 'Vision',
    vision: true,
    prompt: 'Ada angka besar apa di gambar ini? Jawab angka saja.',
    check: (t) => /\b42\b/.test(t),
  },
];
