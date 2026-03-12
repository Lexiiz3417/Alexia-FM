// src/imageProcessor.js

import fetch from 'node-fetch';
import sharp from 'sharp';

/**
 * Helper: Memaksa API ngasih gambar resolusi paling tinggi (HD)
 */
function getHighResImageUrl(url) {
    if (!url) return url;
    
    // Hack URL YouTube Music / Google Image
    if (url.includes('googleusercontent.com') || url.includes('yt3.ggpht.com')) {
        return url.replace(/=w\d+-h\d+[a-zA-Z0-9\-]*/, '=w1200-h1200-l100-rj');
    }
    
    // Hack URL Apple Music
    if (url.includes('mzstatic.com')) {
        return url.replace(/\/\d+x\d+([a-zA-Z]*\.[a-zA-Z]+)/, '/1200x1200$1');
    }
    
    return url;
}

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
    const hdImageUrl = getHighResImageUrl(imageUrl);
    console.log(`📥 Downloading HD Cover from: ${hdImageUrl}`);
    
    const response = await fetch(hdImageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    const CARD_WIDTH = 1200;
    const CARD_HEIGHT = 630;
    const COVER_SIZE = 450;
    
    // --- FIX BUG MARGIN KANAN: Limit artist diturunin dikit ---
    const MAX_ARTIST_CHARS = 24; 
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

    let rawTitle = title ? title : 'Unknown';
    let rawArtist = artist ? artist : 'Unknown';

    // --- FIX BUG OVERFLOW TITIK-TITIK MENTOK KANAN ---
    // Potong lebih awal, hapus spasi nyangkut pake trim(), baru kasih ...
    if (rawTitle.length > 36) {
        rawTitle = rawTitle.substring(0, 33).trim() + '...';
    }

    if (rawArtist.length > 40) {
        rawArtist = rawArtist.substring(0, 37).trim() + '...';
    }

    const sanitize = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeTitle = sanitize(rawTitle);
    const safeArtist = sanitize(rawArtist);

    const hasKanji = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(rawTitle);

    let titleFontSize = 65;
    let titleLineHeight = 80;
    let maxTitleChars = 15;

    if (rawTitle.length > 12 || hasKanji) {
        titleFontSize = 50;       
        titleLineHeight = 60;     
        
        // --- FIX BUG OVERFLOW TITIK-TITIK MENTOK KANAN ---
        // Diturunkan dari 22 jadi 19 biar lebih milih turun baris daripada nabrak kanan
        maxTitleChars = 19;       
    }

    const titleLines = wrapText(safeTitle, maxTitleChars);
    const artistLines = wrapText(safeArtist, MAX_ARTIST_CHARS);

    const titleGap = 70; 
    const artistGap = 60; 
    const artistLineHeight = 50;

    const totalTextHeight = 
        titleGap + 
        ((titleLines.length - 1) * titleLineHeight) + 
        artistGap + 
        ((artistLines.length - 1) * artistLineHeight);

    const startY = 315 - (totalTextHeight / 2);

    let titleSvg = '';
    let currentY = startY + titleGap; 
    
    titleLines.forEach((line, index) => {
        if (index === 0) {
            titleSvg += `<tspan x="550" y="${currentY}">${line}</tspan>`;
        } else {
            titleSvg += `<tspan x="550" dy="${titleLineHeight}">${line}</tspan>`;
            currentY += titleLineHeight;
        }
    });

    let artistSvg = '';
    currentY += artistGap; 

    artistLines.forEach((line, index) => {
        if (index === 0) {
            artistSvg += `<tspan x="550" y="${currentY}">${line}</tspan>`;
        } else {
            artistSvg += `<tspan x="550" dy="${artistLineHeight}">${line}</tspan>`;
        }
    });

    // --- PROSES GAMBAR ---

    const background = await sharp(originalBuffer)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
      .blur(40)
      .modulate({ brightness: 0.6 })
      .toBuffer();

    const foreground = await sharp(originalBuffer)
      .resize(COVER_SIZE, COVER_SIZE, { 
          fit: 'cover',
          kernel: sharp.kernel.lanczos3,
          fastShrinkOnLoad: false 
      })
      .sharpen({ sigma: 1.2 }) 
      .toBuffer();

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
        
        <text x="550" y="${startY}" class="font-style top-text">${headerText}</text>
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
      .png({ 
          compressionLevel: 0, 
          force: true, 
          palette: false 
      })
      .toBuffer();

    return finalImage;

  } catch (error) {
    console.error('❌ Failed to generate music card:', error);
    return null;
  }
}

export async function cropToSquare(imageUrl) {
    try {
        const hdImageUrl = getHighResImageUrl(imageUrl);
        const response = await fetch(hdImageUrl);
        const originalBuffer = Buffer.from(await response.arrayBuffer());
        return await sharp(originalBuffer).resize(500, 500, { fit: 'cover' }).png().toBuffer();
    } catch (e) { return null; }
}