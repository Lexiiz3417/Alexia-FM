// src/imageProcessor.js
import { createCanvas, registerFont, loadImage } from 'canvas';
import sharp from 'sharp';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Daftarin Font Anti-Tofu!
try {
    registerFont(path.join(__dirname, '..', 'fonts', 'JetBrainsMono-Bold.ttf'), { family: 'JetBrains Mono', weight: 'bold' });
    registerFont(path.join(__dirname, '..', 'fonts', 'NotoSansJP-Bold.ttf'), { family: 'Noto Sans JP', weight: 'bold' });
} catch (e) {
    console.warn("⚠️ Custom fonts gagal diload di imageProcessor.");
}

export async function generateNowPlayingImage(song, dayCount) {
    // UKURAN 2K (Dikali 2 dari sebelumnya)
    const width = 1600; 
    const height = 900; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const mainFont = '"JetBrains Mono", "Noto Sans JP", sans-serif';
    const accentColor = '#FFD700';

    let bgImg, fgImg;

    // Proses gambar via Sharp
    try {
        const res = await fetch(song.coverUrl);
        const buffer = await res.buffer();

        const bgBuf = await sharp(buffer).resize(1600, 900, { fit: 'cover' }).blur(40).modulate({ brightness: 0.5 }).toBuffer();
        const fgBuf = await sharp(buffer).resize(600, 600, { fit: 'cover' }).toBuffer();

        bgImg = await loadImage(bgBuf);
        fgImg = await loadImage(fgBuf);
    } catch (e) {
        console.error("⚠️ Sharp error di Autopost:", e.message);
    }

    // 1. Background
    if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, width, height);
    } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Cover Art (Kotak HD)
    const coverSize = 600;
    const coverX = 150;
    const coverY = 150;

    if (fgImg) {
        ctx.shadowBlur = 50;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.drawImage(fgImg, coverX, coverY, coverSize, coverSize);
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(coverX, coverY, coverSize, coverSize);
        ctx.fillStyle = accentColor;
        ctx.font = `bold 80px ${mainFont}`;
        ctx.fillText('( ˘ω˘ ) zZ', coverX + 100, coverY + 320); // Fallback Kaomoji Aman
    }

    // 3. Teks Info Lagu (Auto-Corrected dari Deezer)
    const textX = 820;
    
    // Day Banner
    ctx.fillStyle = accentColor;
    ctx.font = `bold 36px ${mainFont}`;
    ctx.fillText(`DAY #${dayCount}`, textX, 360);

    // Title (Anti-Tofu & Bersih)
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 72px ${mainFont}`;
    let title = song.title || "Unknown Title";
    ctx.fillText(title.length > 25 ? title.substring(0, 22) + '...' : title, textX, 460);

    // Artist
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `bold 48px ${mainFont}`;
    let artist = song.artist || "Unknown Artist";
    ctx.fillText(artist.length > 30 ? artist.substring(0, 27) + '...' : artist, textX, 540);

    // Watermark
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = `italic 28px ${mainFont}`;
    ctx.fillText('@alexiazaphyra', width - 50, height - 40);

    return canvas.toBuffer();
}