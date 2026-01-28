// src/imageProcessor.js

import { createCanvas, loadImage } from 'canvas';

/**
 * Fungsi Canggih: Menulis teks yang otomatis turun baris (Word Wrap)
 * Mengembalikan posisi Y terakhir supaya elemen di bawahnya bisa menyesuaikan.
 */
function drawTextWithWrap(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(' ');
    let line = '';
    let testLine = '';
    let lineCount = 1;

    for (let n = 0; n < words.length; n++) {
        testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
            // Kalau baris ini sudah penuh...
            
            // Cek apakah kita sudah mencapai batas maksimal baris?
            if (lineCount >= maxLines) {
                // Kalau sudah mentok maxLines, potong dan kasih "..."
                while (ctx.measureText(line + "...").width > maxWidth) {
                    line = line.slice(0, -1);
                }
                ctx.fillText(line + "...", x, y);
                return y + lineHeight; // Stop di sini
            }

            // Kalau belum mentok, tulis baris ini dan lanjut ke bawah
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
            lineCount++;
        } else {
            line = testLine;
        }
    }
    // Tulis sisa kata terakhir
    ctx.fillText(line, x, y);
    
    // Kembalikan posisi Y terakhir + spasi buat elemen selanjutnya
    return y + lineHeight;
}

export async function createMusicCard({ imageUrl, title, artist, day }) {
    try {
        const canvas = createCanvas(1200, 630);
        const ctx = canvas.getContext('2d');

        // 1. Load Gambar Cover
        const cover = await loadImage(imageUrl).catch(() => null);
        if (!cover) return null;

        // 2. Background Blur Effect
        ctx.drawImage(cover, 0, 0, 1200, 1200 * (cover.height / cover.width));
        
        // Gradient Overlay (Gelap)
        const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1200, 630);

        // 3. Gambar Cover Album (Kiri)
        const coverSize = 450;
        const coverX = 80;
        const coverY = (630 - coverSize) / 2;
        
        // Shadow Effect
        ctx.shadowColor = "black";
        ctx.shadowBlur = 40;
        ctx.drawImage(cover, coverX, coverY, coverSize, coverSize);
        ctx.shadowBlur = 0; 

        // 4. TEXT SECTION (Kanan)
        const textX = 580;
        const maxTextWidth = 550; // Lebar area teks
        let currentY = 200; // Posisi awal Y

        // --- A. DAY NUMBER ---
        ctx.fillStyle = '#FFD700'; // Emas
        ctx.font = 'bold 30px "Courier New", monospace';
        ctx.fillText(`DAY #${day}`, textX, currentY);
        
        currentY += 80; // Jarak ke judul

        // --- B. JUDUL LAGU (Support Wrap & Kanji) ---
        ctx.fillStyle = '#FFFFFF';
        // Font Priority: Arial -> Noto Sans JP (Kanji) -> Sans Serif
        ctx.font = 'bold 70px "Arial", "Noto Sans CJK JP", "sans-serif"';
        
        // Panggil fungsi wrap. Max 2 baris. Line height 80px.
        // Fungsi ini akan mengembalikan posisi Y baru untuk Artis.
        currentY = drawTextWithWrap(ctx, title, textX, currentY, maxTextWidth, 80, 2);

        // Tambah dikit jarak sebelum nama artis
        currentY += 10; 

        // --- C. NAMA ARTIS ---
        ctx.fillStyle = '#CCCCCC'; // Abu-abu
        ctx.font = '40px "Arial", "Noto Sans CJK JP", "sans-serif"';
        
        // Artis juga kita wrap kalau kepanjangan (Max 1 baris cukup, atau 2 kalau mau)
        drawTextWithWrap(ctx, artist, textX, currentY, maxTextWidth, 50, 1);

        // --- D. WATERMARK ---
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('@alexiazaphyra', 1150, 600);

        return canvas.toBuffer('image/png');

    } catch (error) {
        console.error("❌ Error generating image card:", error);
        return null;
    }
}