# Router AI dan Terminal Audit

## Router AI / API key

Kuro Akira 2.7 menyediakan penyimpanan provider AI OpenAI-compatible.

Di **Pengaturan → AI & API**:
1. Pilih sumber AI **Router AI / 9Router / OpenAI-compatible**.
2. Pilih preset 9Router lokal atau cloud, atau isi Base URL sendiri.
3. Masukkan API key dan model.
4. Simpan lalu gunakan tombol **Tes**.
5. Kuro AI akan mengirim chat ke endpoint `/chat/completions`.

### 9Router

Dokumentasi 9Router menyatakan API-nya kompatibel dengan format OpenAI. Untuk instalasi lokal, endpoint yang didokumentasikan adalah:

```
Base URL: http://127.0.0.1:20128/v1
API Key: key dari dashboard 9Router
Model: ID model yang tersedia di router
```

Untuk endpoint cloud, gunakan Base URL sesuai dokumentasi 9Router yang sedang berlaku.

**Catatan:** Kuro Akira tidak menghasilkan API key gratis dan tidak menjamin sebuah provider selalu gratis. Pengguna tetap harus memperoleh key melalui layanan yang dipilih.

### Penyimpanan key

Key provider Router disimpan melalui proses utama Electron menggunakan `safeStorage` jika tersedia. Renderer hanya menerima metadata provider; key mentah tidak dikembalikan oleh API daftar provider.

## Terminal audit defensif

Perintah baru:

```
audit
api list
api test <id-provider>
ai <pertanyaan>
```

`audit` memeriksa halaman aktif untuk pola seperti:
- HTTP/mixed content
- password form melalui HTTP
- form tanpa action
- `target="_blank"` tanpa `noopener/noreferrer`
- script eksternal tanpa SRI
- iframe tanpa sandbox
- inline event handler
- `javascript:` URL
- gambar rusak
- link kosong
- kontrol form tanpa label
- indikasi secret di Web Storage
- CSP yang tidak terdeteksi dari meta tag

Audit ini adalah **scanner defensif client-side**, bukan bukti bahwa server aman dan bukan alat eksploitasi. Audit server, dependency, konfigurasi Electron, dan endpoint API tetap perlu dilakukan terpisah.

## Batasan

- Provider harus menyediakan endpoint OpenAI-compatible `/chat/completions`.
- Base URL non-HTTPS hanya diterima untuk localhost/127.0.0.1/::1.
- Model `auto` hanya bekerja bila router/provider mendukungnya.
- CI/build belum dianggap lulus hanya karena perubahan sudah masuk GitHub; lakukan `npm install` lalu `npm run build` pada mesin pengembang sebelum rilis.
