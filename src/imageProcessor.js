// src/imageProcessor.js

import fetch from 'node-fetch';
import sharp from 'sharp';

/**
 * Helper: Memotong teks agar turun baris (Word Wrap)
 */
function wrapText(text, maxChars) {
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    if (currentLine.length + 1 + words[i].length <= maxChars) {
      currentLine += ' ' + words[i];
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Membuat Kartu Musik Estetik (Sharp + SVG Overlay)
 */
export async function createMusicCard({ imageUrl, title, artist, topText }) {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    const CARD_WIDTH = 1200;
    const CARD_HEIGHT = 630;
    const COVER_SIZE = 450;
    const MAX_ARTIST_CHARS = 25; 
    const WATERMARK_TEXT = "@alexiazaphyra";
    
    // Logic Top Text
    let headerText = "NOW PLAYING";
    if (topText) {
         if (!isNaN(topText) || typeof topText === 'number') {
             headerText = `DAY #${topText}`;
         } else {
             headerText = topText.toUpperCase().startsWith("DAY #") ? topText.toUpperCase() : topText.toUpperCase();
         }
    }

    // --- LOGIKA JUDUL PINTAR ---
    let rawTitle = title ? title : 'Unknown';
    let rawArtist = artist ? artist : 'Unknown';

    // 1. Potong judul mentah dulu kalau kepanjangan (> 40 char)
    if (rawTitle.length > 40) {
        rawTitle = rawTitle.substring(0, 37) + '...';
    }

    // 2. Baru di-sanitize untuk keamanan SVG
    const sanitize = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeTitle = sanitize(rawTitle);
    const safeArtist = sanitize(rawArtist);

    // 3. Deteksi Kanji/Jepang pada judul
    const hasKanji = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(rawTitle);

    // Setup Default (Teks Latin Pendek)
    let titleFontSize = 65;
    let titleLineHeight = 80;
    let maxTitleChars = 15;

    // Opsi Dinamis: Kalau ada Kanji atau judul panjang, font menciut
    if (rawTitle.length > 12 || hasKanji) {
        titleFontSize = 50;       
        titleLineHeight = 60;     
        maxTitleChars = 22;       
    }

    // --- PROSES WRAPPING ---
    const titleLines = wrapText(safeTitle, maxTitleChars);
    let titleSvg = '';
    let currentY = 250; 
    
    titleLines.forEach((line, index) => {
        if (index === 0) {
            titleSvg += `<tspan x="550" y="${currentY}">${line}</tspan>`;
        } else {
            titleSvg += `<tspan x="550" dy="${titleLineHeight}">${line}</tspan>`;
            currentY += titleLineHeight;
        }
    });

    let artistY = currentY + 60; 
    const artistLines = wrapText(safeArtist, MAX_ARTIST_CHARS);
    let artistSvg = '';

    artistLines.forEach((line, index) => {
        if (index === 0) {
            artistSvg += `<tspan x="550" y="${artistY}">${line}</tspan>`;
        } else {
            artistSvg += `<tspan x="550" dy="50">${line}</tspan>`;
        }
    });

    // --- PROSES GAMBAR ---
    const background = await sharp(originalBuffer)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
      .blur(40)
      .modulate({ brightness: 0.6 })
      .toBuffer();

    const foreground = await sharp(originalBuffer)
      .resize(COVER_SIZE, COVER_SIZE, { fit: 'cover' })
      .toBuffer();

    // SVG OVERLAY (GAK ADA KOMEN ANEH-ANEH LAGI)
    const textSvg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <style>
          .font-style { 
             font-family: 'JetBrains Mono', 'Noto Sans CJK JP', 'Noto Sans CJK SC', monospace, sans-serif; 
          }
          .top-text { 
            fill: #f1c40f; font-size: 28px; font-weight: bold; letter-spacing: 4px; 
          }
          .title { 
            fill: #ffffff; 
            font-size: ${titleFontSize}px; 
            font-weight: 800; 
          }
          .artist { 
            fill: #cccccc; font-size: 40px; font-weight: 600; 
          }
          .watermark {
            fill: rgba(255, 255, 255, 0.4); font-size: 20px; font-weight: normal; text-anchor: end;
          }
        </style>
        
        <text x="550" y="180" class="font-style top-text">${headerText}</text>
        <text class="font-style title">${titleSvg}</text>
        <text class="font-style artist">${artistSvg}</text>
        <text x="1150" y="605" class="font-style watermark">${WATERMARK_TEXT}</text>
      </svg>
    `;

    const finalImage = await sharp(background)
      .composite([
        { input: foreground, top: Math.floor((CARD_HEIGHT - COVER_SIZE) / 2), left: 50 },
        { input: Buffer.from(textSvg), top: 0, left: 0 }
      ])
      .png()
      .toBuffer();

    return finalImage;

  } catch (error) {
    console.error('❌ Failed to generate music card:', error);
    return null;
  }
}

export async function cropToSquare(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const originalBuffer = Buffer.from(await response.arrayBuffer());
        return await sharp(originalBuffer).resize(500, 500, { fit: 'cover' }).png().toBuffer();
    } catch (e) { return null; }
}