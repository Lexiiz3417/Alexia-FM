# 🎶 Spotify Facebook Autoposter v2

> Otomatis ambil lagu dari playlist Spotify, buat caption estetik, dan post ke Facebook Page setiap hari. ✨

---

## 🚀 Fitur
- Ambil lagu secara acak dari playlist Spotify
- Dapatkan genre artis dan buat caption berdasarkan mood
- Konversi link Spotify ke link universal (via Songlink)
- Upload cover lagu + caption ke Facebook Page (langsung muncul di timeline!)
- Auto-komentar follow-up di setiap post
- Jadwal otomatis via GitHub Actions (atau manual trigger)

---

## 🗂️ Struktur Project
```
spotify-facebook-autoposter-v2/
├── captions/
│   └── default.txt          # Template caption (pakai {title}, {artist}, dst)
├── src/
│   ├── index.js             # Main script
│   ├── spotify.js           # Ambil data dari Spotify
│   ├── songlink.js          # Konversi URL Spotify ke universal
│   ├── caption.js           # Generate caption dari template
│   └── facebook.js          # Posting ke Facebook
├── .github/workflows/
│   └── autopost.yml         # Workflow GitHub Actions
├── .env.example             # Template variabel rahasia
├── .gitignore               # Ignore .env dan node_modules
├── package.json             # NPM metadata
└── README.md                # Dokumentasi ini
```

---

## ⚙️ Cara Pakai (Local)
1. Clone repo ini:
```bash
git clone https://github.com/lexiiz3417/spotify-facebook-autoposter-v2.git
cd spotify-facebook-autoposter-v2
```

2. Install dependensi:
```bash
npm install
```

3. Copy file `.env.example` jadi `.env` dan isi:
```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_PLAYLIST_ID=
FACEBOOK_PAGE_ID=
FACEBOOK_ACCESS_TOKEN=
START_DATE=2025-07-08
```

4. Jalankan lokal:
```bash
node src/index.js
```

---

## 🤖 Otomatis via GitHub Actions
1. Fork repo ini
2. Masuk ke `Settings → Secrets and variables → Actions`
3. Tambahkan secrets berikut:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_PLAYLIST_ID`
   - `FACEBOOK_PAGE_ID`
   - `FACEBOOK_ACCESS_TOKEN`
   - `START_DATE`
4. Buka tab **Actions** → klik **Run workflow** buat testing manual

> Workflow juga jalan otomatis setiap hari jam 17:00 WIB

---

## ✍️ Template Caption
Lihat file [`captions/default.txt`](captions/default.txt) — kamu bisa edit, tambah, atau ubah format sesuai style kamu!

Gunakan placeholder:
- `{day}`
- `{title}`
- `{artist}`
- `{genre}`
- `{link}`
- `{mood}`
- `{tags}`

Pisahkan antar template dengan `---`

---

## ❤️ Credits
Project ini dikembangkan oleh [Lexiiz3417](https://github.com/Lexiiz3417) buat kamu yang pengen Facebook Page-nya tampil beda setiap hari.


Feel free to fork & remix ✨

---

## 🧠 Next Idea?
- Support multiple playlist?
- Track history posted?
- Add reactions or likes via API?

Pull request welcome 🚀
