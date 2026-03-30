//src/recapGenerator.js
import { createCanvas, registerFont } from 'canvas';
import sharp from 'sharp';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTrackInfo, cleanMetadata, forceHDYouTubeCover } from './coverFinder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    registerFont(path.join(__dirname, '..', 'fonts', 'JetBrainsMono-Bold.ttf'), { family: 'JetBrains Mono', weight: 'bold' });
    registerFont(path.join(__dirname, '..', 'fonts', 'NotoSansJP-Bold.ttf'), { family: 'Noto Sans JP', weight: 'bold' });
    console.log("✅ Fonts loaded successfully!");
} catch (e) {
    console.warn("⚠️ Custom fonts failed to load.");
}

async function prepareImages(coverUrl) {
    if (!coverUrl) return null;
    try {
        const res = await fetch(coverUrl);
        const buffer = await res.buffer();

        const bgImgBuf = await sharp(buffer)
            .resize(1600, 2000, { fit: 'cover' })
            .blur(50)
            .modulate({ brightness: 0.6 })
            .toBuffer();

        const fgImgBuf = await sharp(buffer)
            .resize(640, 640, { fit: 'cover' })
            .toBuffer();

        const { loadImage } = await import('canvas');
        return {
            bgImg: await loadImage(bgImgBuf),
            fgImg: await loadImage(fgImgBuf)
        };
    } catch (e) {
        console.error("⚠️ Sharp processing failed:", e.message);
        return null;
    }
}

export async function generateRecapImage(type, songs) {
    const width = 1600;
    const listStartTop = 1360; 
    const itemSpacing = 124;
    const calculatedHeight = listStartTop + ((songs.length - 1) * itemSpacing) + 200; 
    const height = Math.max(2000, calculatedHeight);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const mainFont = '"JetBrains Mono", "Noto Sans JP", sans-serif'; 
    const accentColor = '#FFD700';
    
    let topSong = songs[0] || { title: "Unknown", artist: "Unknown", play_count: 0, coverUrl: null };
    let finalImages = null;
    
    let displayTitle = topSong.title;
    let displayArtist = topSong.artist;
    let coverUrl = topSong.coverUrl;

    if (topSong.title !== "Unknown") {
        const hdInfo = await getTrackInfo(topSong.title, topSong.artist);
        if (hdInfo) {
            displayTitle = hdInfo.title;
            displayArtist = hdInfo.artist;
            coverUrl = hdInfo.coverUrl;
        } else {
            const cleaned = cleanMetadata(topSong.title, topSong.artist);
            displayTitle = cleaned.cleanTitle || topSong.title;
            displayArtist = cleaned.cleanArtist || topSong.artist;
            coverUrl = forceHDYouTubeCover(coverUrl); 
        }
        
        if (coverUrl) finalImages = await prepareImages(coverUrl);
    }

    if (finalImages && finalImages.bgImg) {
        ctx.drawImage(finalImages.bgImg, 0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#111111');
        grad.addColorStop(1, '#222222');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 64px ${mainFont}`;
    ctx.fillText(`ALEXIA ${type.toUpperCase()} RECAP`, width / 2, 160);
    
    ctx.fillStyle = accentColor;
    ctx.font = `bold 40px ${mainFont}`;
    ctx.fillText(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }), width / 2, 230);

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
            ctx.fillStyle = '#333333';
            ctx.fillRect(x, y, coverSize, coverSize);
            ctx.fillStyle = accentColor;
            ctx.font = `bold 120px ${mainFont}`;
            ctx.fillText('ᶻ 𝗓 Z .ᐟ', width / 2, y + 360);
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

    songs.slice(1).forEach((song, index) => {
        const rank = index + 2;
        const y = listStartTop + (index * itemSpacing);
        const cleanedList = cleanMetadata(song.title, song.artist);
        const listTitle = cleanedList.cleanTitle || song.title || 'Unknown';
        const listArtist = cleanedList.cleanArtist || song.artist || 'Unknown';

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        if (ctx.roundRect) { 
            ctx.beginPath();
            ctx.roundRect(160, y - 84, width - 320, 104, 20); 
            ctx.fill();
        } else { 
            ctx.fillRect(160, y - 84, width - 320, 104); 
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = rank === 2 ? accentColor : (rank === 3 ? '#C0C0C0' : '#ffffff');
        ctx.font = `bold 44px ${mainFont}`;
        ctx.fillText(`${rank}`, 220, y - 12);

        ctx.textAlign = 'right';
        ctx.fillStyle = accentColor;
        ctx.font = `bold 32px ${mainFont}`;
        const ptsText = `${song.play_count || 0} PTS`;
        ctx.fillText(ptsText, width - 220, y - 12);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 36px ${mainFont}`;
        
        let info = `${listTitle} - ${listArtist}`;
        const maxTextWidth = (width - 220) - 320 - 120; 

        if (ctx.measureText(info).width > maxTextWidth) {
            while (info.length > 0 && ctx.measureText(info + '...').width > maxTextWidth) {
                info = info.substring(0, info.length - 1);
            }
            info += '...';
        }
        ctx.fillText(info, 320, y - 12);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `italic 32px ${mainFont}`;
    ctx.fillText('powered by @alexiazaphyra', width / 2, height - 70);

    return canvas.toBuffer('image/png');
}