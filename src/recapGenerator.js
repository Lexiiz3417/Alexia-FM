// src/recapGenerator.js
import { createCanvas, registerFont } from 'canvas';
import sharp from 'sharp';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

// 🌟 Import mesin pencari cover HD dan Pembersih Judul lu!
import { getTrackInfo, cleanMetadata } from './coverFinder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- DAFTARIN FONT ANTI-TOFU ---
// Pastiin file .ttf ini ada di folder /fonts !
try {
    registerFont(path.join(__dirname, '..', 'fonts', 'JetBrainsMono-Bold.ttf'), { family: 'JetBrains Mono', weight: 'bold' });
    registerFont(path.join(__dirname, '..', 'fonts', 'NotoSansJP-Bold.ttf'), { family: 'Noto Sans JP', weight: 'bold' });
    console.log("✅ Fonts loaded successfully!");
} catch (e) {
    console.warn("⚠️ Custom fonts gagal diload. Pastikan folder /fonts dan file .ttf tersedia.");
}

// --- HELPER: SHARP IMAGE PROCESSOR ---
async function prepareImages(coverUrl) {
    if (!coverUrl) return null;
    try {
        const res = await fetch(coverUrl);
        const buffer = await res.buffer();

        // Background: Blur parah biar estetik
        const bgImgBuf = await sharp(buffer)
            .resize(1600, 2000, { fit: 'cover' }) // UKURAN 2K!
            .blur(50)
            .modulate({ brightness: 0.6 })
            .toBuffer();

        // Foreground: Kotak HD tajam
        const fgImgBuf = await sharp(buffer)
            .resize(640, 640, { fit: 'cover' }) // Cover dibesarin 2x
            .toBuffer();

        const { loadImage } = await import('canvas');
        return {
            bgImg: await loadImage(bgImgBuf),
            fgImg: await loadImage(fgImgBuf)
        };
    } catch (e) {
        console.error("⚠️ Gagal memproses gambar dengan Sharp:", e.message);
        return null;
    }
}

// --- MESIN UTAMA: CANVAS 2K DYNAMIC HEIGHT ---
export async function generateRecapImage(type, songs) {
    const width = 1600; // RESOLUSI NAIK 2X LIPAT!
    
    // 🌟 PERBAIKAN 1: DYNAMIC HEIGHT!
    const listStartTop = 1360; 
    const itemSpacing = 124;
    // Ngitung butuh tinggi berapa berdasarkan jumlah lagu
    const calculatedHeight = listStartTop + ((songs.length - 1) * itemSpacing) + 200; 
    const height = Math.max(2000, calculatedHeight); // Kalo lagu dikit tetep 2000, kalo banyak dia melar!

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // SENJATA ANTI-TOFU (JetBrains + Noto Sans)
    const mainFont = '"JetBrains Mono", "Noto Sans JP", sans-serif'; 
    const accentColor = '#FFD700';
    
    let topSong = songs[0] || { title: "Unknown", artist: "Unknown", play_count: 0 };
    let finalImages = null;
    
    // --- 1. INTEGRASI COVER FINDER & FALLBACK CLEANER ---
    let displayTitle = topSong.title;
    let displayArtist = topSong.artist;
    let coverUrl = null;

    if (topSong.title !== "Unknown") {
        const hdInfo = await getTrackInfo(topSong.title, topSong.artist);
        if (hdInfo) {
            displayTitle = hdInfo.title; // Pake nama asli dari Deezer
            displayArtist = hdInfo.artist; // Bye "Release" / "Topic"!
            coverUrl = hdInfo.coverUrl;
        } else {
            // 🌟 FALLBACK DARURAT: Deezer Gagal, Bersihin Manual!
            const cleaned = cleanMetadata(topSong.title, topSong.artist);
            displayTitle = cleaned.cleanTitle || topSong.title;
            displayArtist = cleaned.cleanArtist || topSong.artist;
        }
        
        // Coba proses gambarnya
        if (coverUrl) {
            finalImages = await prepareImages(coverUrl);
        }
    }

    // --- 2. RENDER BACKGROUND ---
    if (finalImages && finalImages.bgImg) {
        ctx.drawImage(finalImages.bgImg, 0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Extra layer gelap
        ctx.fillRect(0, 0, width, height);
    } else {
        // FALLBACK KALO GAK ADA GAMBAR: Gradien Estetik Abu-abu Gelap
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#111111');
        grad.addColorStop(1, '#222222');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    // --- 3. HEADER ---
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 64px ${mainFont}`; // Ukuran font x2
    ctx.fillText(`ALEXIA ${type.toUpperCase()} RECAP`, width / 2, 160);
    
    ctx.fillStyle = accentColor;
    ctx.font = `bold 40px ${mainFont}`;
    ctx.fillText(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }), width / 2, 230);

    // --- 4. TOP 1 SECTION ---
    if (topSong.title !== "Unknown") {
        const coverSize = 640;
        const x = (width - coverSize) / 2;
        const y = 320;

        if (finalImages && finalImages.fgImg) {
            ctx.shadowBlur = 80; 
            ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
            ctx.drawImage(finalImages.fgImg, x, y, coverSize, coverSize);
            ctx.shadowBlur = 0;
        } else {
            // FALLBACK NATIVE CANVAS (Logo Inisial Alexia FM kalo API mati semua)
            ctx.fillStyle = '#333333';
            ctx.fillRect(x, y, coverSize, coverSize);
            ctx.fillStyle = accentColor;
            ctx.font = `bold 120px ${mainFont}`;
            ctx.fillText('ᶻ 𝗓 𐰁 .ᐟ', width / 2, y + 360);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 76px ${mainFont}`;
        ctx.fillText(displayTitle.length > 25 ? displayTitle.substring(0, 25) + '...' : displayTitle, width / 2, 1070);
        
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `bold 48px ${mainFont}`;
        ctx.fillText(displayArtist, width / 2, 1150);
        
        ctx.fillStyle = accentColor;
        ctx.font = `bold 44px ${mainFont}`;
        ctx.fillText(`TOP 1 • ${topSong.play_count} PLAYS THIS ${type.toUpperCase()}`, width / 2, 1230);
    }

    // --- 5. LIST RANKING ---
    songs.slice(1).forEach((song, index) => {
        const rank = index + 2;
        const y = listStartTop + (index * itemSpacing); // Spacing x2

        // 🌟 EKSTRA: Bersihin juga judul di list biar rapi!
        const cleanedList = cleanMetadata(song.title, song.artist);
        const listTitle = cleanedList.cleanTitle || song.title || 'Unknown';
        const listArtist = cleanedList.cleanArtist || song.artist || 'Unknown';

        // Gambar Background Box List
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        if (ctx.roundRect) { 
            ctx.beginPath(); // Biasakan beginPath sebelum ngegambar shape
            ctx.roundRect(160, y - 84, width - 320, 104, 20); 
            ctx.fill();
        } 
        else { 
            ctx.fillRect(160, y - 84, width - 320, 104); 
        }

        // Tulis Angka Ranking (Kiri)
        ctx.textAlign = 'left';
        ctx.fillStyle = rank === 2 ? accentColor : (rank === 3 ? '#C0C0C0' : '#ffffff');
        ctx.font = `bold 44px ${mainFont}`;
        ctx.fillText(`${rank}`, 220, y - 12);

        // Tulis Angka PTS (Kanan) -> Kita gambar duluan biar tau sisa space buat teks lagu
        ctx.textAlign = 'right';
        ctx.fillStyle = accentColor;
        ctx.font = `bold 32px ${mainFont}`;
        const ptsText = `${song.play_count || 0} PTS`;
        ctx.fillText(ptsText, width - 220, y - 12);

        // 🌟 PERBAIKAN 2 (FINAL JUTSU): Pengukuran Lebar Pixel Presisi
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 36px ${mainFont}`;
        
        // Pake judul yang udah dibersihin
        let info = `${listTitle} - ${listArtist}`;
        
        // Hitung batas aman lebar piksel buat judul lagu
        // 320 = titik X awal judul, (width - 220) = titik X akhir (tempat PTS)
        // 120 = padding extra biar gak nempel banget sama PTS
        const maxTextWidth = (width - 220) - 320 - 120; 

        // Cek apakah lebar tulisan nembus batas maxTextWidth
        if (ctx.measureText(info).width > maxTextWidth) {
            // Kalo nembus, potong huruf belakangnya satu-satu sampe muat
            while (info.length > 0 && ctx.measureText(info + '...').width > maxTextWidth) {
                info = info.substring(0, info.length - 1);
            }
            info += '...';
        }

        // Gambar teks yang udah dipotong presisi
        ctx.fillText(info, 320, y - 12);
    });

    // --- 6. FOOTER WATERMARK ---
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `italic 32px ${mainFont}`;
    ctx.fillText('powered by @alexiazaphyra', width / 2, height - 70);

    return canvas.toBuffer('image/png'); // Tambahin 'image/png' biar buffer-nya jelas formatnya
}