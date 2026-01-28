// src/imageProcessor.js

import { createCanvas, loadImage } from 'canvas';

/**
 * Fungsi Canggih: Menulis teks yang otomatis turun baris (Word Wrap).
 * * @param {object} ctx - Canvas Context
 * @param {string} text - Teks yang akan ditulis
 * @param {number} x - Posisi X
 * @param {number} y - Posisi Y
 * @param {number} maxWidth - Lebar maksimal sebelum turun baris
 * @param {number} lineHeight - Jarak antar baris
 * @param {number} maxLines - Batas maksimal jumlah baris (sisanya dipotong "...")
 * * @returns {number} Posisi Y terakhir (untuk elemen selanjutnya)
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
                // Kalau sudah mentok maxLines, potong sisa teks dan kasih "..."
                while (ctx.measureText(line + "...").width > maxWidth) {
                    line = line.slice(0, -1);
                }
                ctx.fillText(line + "...", x, y);
                return y + lineHeight; // Stop di sini, kembalikan posisi Y baru
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

/**
 * Fungsi Utama: Membuat Kartu Musik
 */
export async function createMusicCard({ imageUrl, title, artist, topText }) {
    try {
        const canvas = createCanvas(1200, 630);
        const ctx = canvas.getContext('2d');

        // 1. Load Gambar Cover
        // Gunakan try-catch saat load image untuk menghindari crash jika URL rusak
        const cover = await loadImage(imageUrl).catch(() => null);
        if (!cover) return null;

        // 2. Background Effect (Zoom & Darken)
        // Gambar cover ditarik full canvas sebagai background
        ctx.drawImage(cover, 0, 0, 1200, 1200 * (cover.height / cover.width));
        
        // Gradient Overlay (Gelap) supaya teks terbaca jelas
        const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');  // Kiri agak terang
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)'); // Kanan gelap pekat (tempat teks)
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1200, 630);

        // 3. Gambar Cover Album Asli (Di Kiri)
        const coverSize = 450;
        const coverX = 80;
        const coverY = (630 - coverSize) / 2; // Vertikal Center
        
        // Efek Bayangan (Shadow)
        ctx.shadowColor = "black";
        ctx.shadowBlur = 40;
        ctx.drawImage(cover, coverX, coverY, coverSize, coverSize);
        ctx.shadowBlur = 0; // Reset shadow biar teks gak nge-blur

        // 4. TEXT SECTION (Di Kanan)
        const textX = 580;
        const maxTextWidth = 550; // Lebar area teks
        let currentY = 200; // Posisi awal Y (akan bertambah ke bawah)

        // --- A. TOP TEXT (Custom Header / Day Count) ---
        ctx.fillStyle = '#FFD700'; // Warna Emas
        ctx.font = 'bold 30px "Courier New", monospace';
        
        // Default text jika kosong
        const header = topText ? topText.toUpperCase() : "NOW PLAYING";
        ctx.fillText(header, textX, currentY);
        
        currentY += 80; // Jarak ke Judul Lagu

        // --- B. JUDUL LAGU (Support Wrap & Kanji) ---
        ctx.fillStyle = '#FFFFFF';
        // FONT STACK PENTING:
        // 1. Arial (Standar)
        // 2. Noto Sans CJK JP (Fallback untuk Kanji/Mandarin - Diinstal via Nixpacks)
        // 3. Sans-serif (Fallback terakhir)
        ctx.font = 'bold 70px "Arial", "Noto Sans CJK JP", "sans-serif"';
        
        // Panggil fungsi wrap. Max 2 baris. Line height 80px.
        // Fungsi ini mengembalikan posisi Y baru untuk Artis.
        currentY = drawTextWithWrap(ctx, title, textX, currentY, maxTextWidth, 80, 2);

        // Tambah sedikit jarak napas sebelum nama artis
        currentY += 10; 

        // --- C. NAMA ARTIS ---
        ctx.fillStyle = '#CCCCCC'; // Abu-abu terang
        ctx.font = '40px "Arial", "Noto Sans CJK JP", "sans-serif"';
        
        // Artis juga di-wrap (Max 1 baris, kalau kepanjangan dipotong)
        drawTextWithWrap(ctx, artist, textX, currentY, maxTextWidth, 50, 1);

        // --- D. WATERMARK (Pojok Kanan Bawah) ---
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