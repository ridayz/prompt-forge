# REALUNA.md — Modding Luna NextGen (Client-Side)

> Dokumentasi semua yang udah kita lakuin buat mod Luna NextGen client.
> Dibuat: 27 Okt 2026. Semua script ada di `H:\Default Project\ghidra_proj\`.

---

## 1. Fondasi Teknis (WAJIB Paham Dulu)

### Enkripsi file `.bin` Luna
- **AES-256-ECB**, key = **32 byte nol** (`Buffer.alloc(32)`)
- Format file: `[12B header][1B crc][ciphertext][1B crc]`
- **CRC formula:** `(byte_header_offset4 & 0xff) + SUM(plaintext bytes) mod 256`
- Plaintext harus **kelipatan 16 byte** (AES block size)
- Decrypt/encrypt pakai `crypto.createDecipheriv` / `createCipheriv` + `setAutoPadding(false)`

### File yang GAME BACA (bukti via binary strings `LunaClient.exe`)
Game baca dari **`H:\Luna NextGen\System\Resource\`** — BUKAN dari `Lang\id\...`.
- Bukti: string `System/Resource/StaticNpc.bin` & `System/Resource/NpcList.bin` ada di binary.
- `Lang\id\System\Resource\` = file teks Indonesia (untuk tampilan). **Game tidak baca ini** (kecuali via path lain).
- Jadi kalau mau patch yang beneran jalan → **patch di `System\Resource\`**

### Kolom penting di ItemList.bin (format plaintext, tab-separated)
| Kolom | Isi |
|---|---|
| col0 | Item ID |
| col1 | Nama item (dengan `^s` = spasi) |
| col3 | Visual ID utama |
| **col5** | **VISUAL MODEL (index model yang dirender)** ← kunci mod visual |
| col14 | Level requirement |
| col22 | Base attack |
| col30 | Weapon type (1=sword, 4=dagger) |

---

## 2. YANG SUDAH TERBUKTI JALAN

### A. Rename NPC — BERHASIL
- **File:** `System\Resource\StaticNpc.bin`
- **Format:** `[map_id]\t[type]\t[nama]\t[npc_id]\t[x]\t[y]\t[rot]\t[flag]`
- **Contoh yang jalan:** NPC id 20 di map 20 (Alker), nama "Zank" → **"Ridwan"** — tampil di game setelah relog.
- **Script:** `patch_alker_npcs_ridwan.js` (rename 21 NPC Alker semua jadi Ridwan)
- **Note:** Ini rename **semua** NPC Alker, bukan cuma Zank. Kalau mau balikin → restore `.bak`.

### B. Visual Armor → Costume — BERHASIL
- **File:** `System\Resource\ItemList.bin`
- **Contoh yang jalan:** Bone Armor (id `12000063`, visual col5=`641`) → **Panda Costume** (visual col5=`1072`)
- **Cara:** Ganti **col5** (visual model) dari armor ke visual costume yang mau.
- **Hasil:** Karakter masih pakai Bone Armor (stat asli tetap), tapi **tampilannya jadi Panda Costume**.
- **Script:** `patch_bonearmor_panda.js`

### C. Visual Weapon → Weapon lain — BERHASIL
- **File:** `System\Resource\ItemList.bin`
- **Contoh yang jalan:** Zweihander (id `11000095`, lvl 5, visual col5=`182`) → **Blade of the Sun** (id `11007482`, lvl 100, visual col5=`202`)
- **Cara:** Ganti **col5** Zweihander → `202` (visual Blade of the Sun).
- **Hasil:** Pedang lvl 5 atk 590 tampil kayak pedang lvl 100.
- **Script:** `patch_zweihander_bladeofsun.js`

**Formula universal visual swap:**
```
col5(item_sumber) = col5(item_target_visual)
→ item_sumber tampil kayak item_target_visual (stat asli tetap)
```

---

## 3. YANG TIDAK BISA (Server-Side)

### A. Drop rate (MonsterList.bin / droprate.txt)
- Coba patch drop rate ×10, samain ke common, ubah ke nilai kecil — **SEMUA GAGAL.**
- Monster drop rate, EXP rate, dll = **diputuskan server**, bukan client.
- `System\Resource\droprate.txt` (ada `#EXP 30.0`, `#ITEM 10.0`) juga **tidak berpengaruh** — mungkin file konfigurasi lama / tidak dipakai.
- **Script yang sudah dicoba:** `patch_droprate_test.js`, `patch_rare_to_common.js`, `patch_droprate_system.js`
- **Status:** Tidak bisa client-side. Butuh akses folder server.

### B. Item instance yang sudah dimiliki (Knife → Advanced Knife)
- Awal sesi: coba ubah item `Knife` (11000187) jadi Advanced Knife (11007367) di `Data\System\ItemList.bin` — **tidak jalan**, karena item yang sudah dimiliki = **instance server**, bukan template client.
- Tapi **visual** (col5) itu tetap bisa diubah — lihat bagian 2B & 2C di atas.

---

## 4. Script yang Tersedia di `ghidra_proj\`

| Script | Fungsi | Status |
|---|---|---|
| `patch_alker_npcs_ridwan.js` | Rename 21 NPC Alker jadi Ridwan | jalan |
| `patch_bonearmor_panda.js` | Bone Armor visual → Panda | jalan |
| `patch_zweihander_bladeofsun.js` | Zweihander visual → Blade of the Sun | jalan |
| `patch_droprate_test.js` | Coba naikin drop rate ×10 | gagal |
| `patch_rare_to_common.js` | Samakan drop rare ke common | gagal |
| `patch_droprate_system.js` | Set semua rare rate → kecil | gagal |
| `patch_knife_to_advancedknife.js` | Knife → Advanced Knife (stat) | gagal |
| `patch_knife_to_bluestorm.js` | Knife → Blue Storm (stat) | gagal |
| `patch_magic_powder.js` | Magic Powder → enchant material | park (server-side) |
| `inspect_lang.js` | Cek format decrypt Lang file | util |
| `scan_lang_all.js` | Scan semua file Lang | util |
| `patch_npcname.js` | Rename NPC di Lang (salah file) | salah path |
| `patch_skillname.js` | Rename skill di Lang (salah file) | salah path |
| `patch_staticnpc_zank.js` | Rename Zank di Lang (salah file) | salah path |

---

## 5. Step-by-Step Cara Patch Visual Item (Recipe)

1. **Backup dulu:** `Copy-Item "H:\Luna NextGen\System\Resource\ItemList.bin" "...\ItemList.bin.bak" -Force`
2. **Cari item ID yang mau diubah** (scan `System\Resource\ItemList.bin` yang udah didecrypt)
3. **Cari item target visual** (yang mau keliatan) — catat `col5`-nya
4. **Patch col5** item sumber → nilai `col5` item target
5. **Re-encrypt:** AES-256-ECB key nol, jaga panjang file tetap (kompensasi delta di baris terakhir)
6. **Update CRC** di offset 12 & offset terakhir
7. **Relogin** game client
8. **Verifikasi di game** — tampilan item harus berubah

---

## 6. List Pedang lvl 100 (untuk target visual)

| ID | Nama | Visual col5 |
|---|---|---|
| 11000021 | Magnum Blade | 21 |
| 11000114 | Titan Blade | 201 |
| 11000115 | Requiem Blade | 202 |
| 11000121 | Sword of Glory | 202 |
| 11000209 | Dark Blade | 383 |
| 11007482 | Blade of the Sun | 202 |
| 11007488 | Dimensional Edge | 442 |
| 11007610 | Onyx Edge | 1622 |
| 11007666 | Glimmering Onyx Sword | 1749 |
| 11007774 | Cyclops Sword (2H) | 2055 |
| 11007793 | Ancient Crusader Sword | 2069 |

---

## 7. List Costume (untuk visual armor)

| ID | Nama | Visual col5 |
|---|---|---|
| 13000098 | Panda Costume [7 days] | 1072 |
| 13000102 | Chicken Costume [7 days] | 1076 |
| 13000165 | White Cat Costume (7 days) | 1124 |

---

## 8. Catatan Penting

- **Semua patch file `System\Resource\`** — jangan patch `Lang\id\` (salah path, tidak dibaca game).
- **Kompensasi panjang file** penting: plaintext harus tetap kelipatan 16 byte. Kalau perubahan bikin panjang beda, kompensasi dengan menambah/mengurangi tab di baris terakhir.
- **Setiap patch: backup `.bak` dulu** sebelum ubah.
- **Relogin wajib** setelah patch — client baca file saat startup.
- **Item instance yang dimainkan** statnya dari server, tapi **visualnya** (col5) dari client ItemList — jadi bisa "item lemah tampil kayak item gede".
- Kalau mau mod yang lain (skill, monster, title) → pakai pattern yang sama: decrypt `System\Resource\<file>.bin`, edit plaintext, re-encrypt.

---

## 9. Kalau Mau Lanjut (Ide Mod Lain)

- **Ganti nama item** di tooltip (`System\Resource\ItemList.bin` col1)
- **Ganti nama skill** (`System\Resource\SkillList.bin`)
- **Ganti nama monster** (`System\Resource\MonsterList.bin`)
- **Ganti nama title** (`System\Resource\TitleList.bin`)
- **Ganti nama achievement** (`System\Resource\AchievementList.bin`)
- **Ganti teks quest** (`System\Resource\QuestString.bin`)
- **Ganti monologue NPC** (`System\Resource\MonsterSpeechList.bin`)

Semua pakai pattern yang sama: decrypt → edit plaintext → encrypt → relogin.

---

## 10. Cheat Sheet Decrypt/Encrypt (Node.js)

```js
const crypto = require('crypto');
const K = Buffer.alloc(32); // key = 32 zero bytes

// decrypt
const dec = b => { const d = crypto.createDecipheriv('aes-256-ecb', K, null); d.setAutoPadding(false); return Buffer.concat([d.update(b), d.final()]); };
// encrypt
const enc = b => { const c = crypto.createCipheriv('aes-256-ecb', K, null); c.setAutoPadding(false); return Buffer.concat([c.update(b), c.final()]); };

// CRC formula (initCrc = byte di offset 4 dari header)
const initCrc = orig.readUInt32LE(4) & 0xff;
const crcOf = p => { let s = initCrc; for (let i=0;i<p.length;i++) s = (s + p[i]) & 0xff; return s; };

// layout file:
// [0..11]  = header (12 bytes)
// [12]     = crc byte
// [13..N-2] = ciphertext
// [N-1]    = crc byte
// Baca:    plain = dec(orig.subarray(13, orig.length-1))
// Tulis:   out = Buffer.concat([orig.subarray(0,12), Buffer.from([crc]), enc(newPlain), Buffer.from([crc])]);
```
