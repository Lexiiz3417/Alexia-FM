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

// --- HELPER CERDAS: TEXT WRAPPER ANTI KEPOTONG SADIS ---
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    let lineCount = 1;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        // Kalo kepanjangan, lempar ke baris bawah
        if (testWidth > maxWidth && n > 0) {
            if (lineCount >= maxLines) {
                // Kalo udah batas maksimal baris, baru kita pasang elipsis (...)
                ctx.fillText(line.trim() + '...', x, currentY);
                return currentY;
            }
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
            lineCount++;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
    return currentY; // Balikin Y terakhir biar artis posisinya ngikutin
}

export async function generateNowPlayingImage(song, topTextParam) {
    // UKURAN 2K
    const width = 1600; 
    const height = 900; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const mainFont = '"JetBrains Mono", "Noto Sans JP", sans-serif';
    const accentColor = '#FFD700';

    let bgImg, fgImg;

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
        ctx.fillText('( ˘ω˘ ) zZ', coverX + 100, coverY + 320); 
    }

    // 3. Teks Info Lagu
    const textX = 820;
    const maxTextWidth = 720; // Kasih margin sisa dari lebar canvas (1600)
    
    // PERBAIKAN BUG DAY #SHARED MUSIC
    let displayTopText = String(topTextParam);
    if (/^\d+$/.test(displayTopText)) {
        displayTopText = `DAY #${displayTopText}`; // Kalau isinya murni angka doang
    }

    // Gambar Day Banner / Tag
    ctx.fillStyle = accentColor;
    ctx.font = `bold 36px ${mainFont}`;
    ctx.fillText(displayTopText, textX, 360);

    // Gambar Title (Bisa 2 Baris, Posisi Dinamis)
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 72px ${mainFont}`;
    const nextY = wrapText(ctx, song.title || "Unknown Title", textX, 460, maxTextWidth, 80, 2);

    // Gambar Artist (1 Baris) di bawah title yang posisinya dinamis
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `bold 48px ${mainFont}`;
    wrapText(ctx, song.artist || "Unknown Artist", textX, nextY + 70, maxTextWidth, 60, 1);

    // Watermark
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = `italic 28px ${mainFont}`;
    ctx.fillText('@alexiazaphyra', width - 50, height - 40);

    return canvas.toBuffer();
}

