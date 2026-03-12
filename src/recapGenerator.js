// src/recapGenerator.js

import { createCanvas, loadImage, registerFont } from 'canvas';
import { getOdesliData } from './songlink.js';
import { getPlaylistTracks } from './ytmusic.js';
import path from 'path';
import { fileURLToPath } from 'url';

// --- MANTRA JALAN NINJA (LOAD FONT LOKAL) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
try {
    const fontPath = path.join(__dirname, '../fonts/JetBrainsMono-Bold.ttf');
    registerFont(fontPath, { family: 'JetBrains Mono' });
    console.log("✅ Font Lokal Berhasil Di-load!");
} catch (e) {
    console.error("❌ Gagal load font lokal:", e.message);
}

// Helper: Ambil Cover Juara 1
async function getCoverWinner(title, artist) {
    if (!title || !artist) return null;
    try {
        const playlist = await getPlaylistTracks();
        const found = playlist.find(t => {
            const tTitle = (t.title || "").toLowerCase();
            const sTitle = title.toLowerCase();
            return tTitle.includes(sTitle) || sTitle.includes(tTitle);
        });
        if (found) return found.thumbnails[found.thumbnails.length - 1].url;

        const searchData = await getOdesliData(`https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`);
        return searchData?.imageUrl || null;
    } catch (e) { return null; }
}

// MESIN UTAMA: CANVAS
export async function generateRecapImage(type, songs) {
    const width = 800;
    const height = 1000;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Panggil nama font yang udah di-register tadi
    const mainFont = '"JetBrains Mono"'; 
    const accentColor = '#FFD700';
    
    const topSong = songs[0] || { title: "Unknown", artist: "Unknown", play_count: 0 };
    let winnerCoverImg = null;

    if (topSong.title !== "Unknown") {
        const coverUrl = await getCoverWinner(topSong.title, topSong.artist);
        if (coverUrl) {
            try { winnerCoverImg = await loadImage(coverUrl); } catch (e) {}
        }
    }

    // Background
    if (winnerCoverImg) {
        ctx.drawImage(winnerCoverImg, 0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        ctx.fillRect(0, 0, width, height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#121212');
        grad.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    // Watermark
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
    ctx.font = `italic 16px ${mainFont}`;
    ctx.fillText('@alexiazaphyra', width - 40, 45);

    // Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 32px ${mainFont}`;
    ctx.fillText(`ALEXIA ${type} RECAP`, width / 2, 90);
    
    ctx.fillStyle = accentColor;
    ctx.font = `20px ${mainFont}`;
    ctx.fillText(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }), width / 2, 125);

    // Top 1
    if (topSong.title !== "Unknown") {
        const coverSize = 320;
        const x = (width - coverSize) / 2;
        const y = 190;

        if (winnerCoverImg) {
            ctx.shadowBlur = 50; ctx.shadowColor = 'rgba(255, 215, 0, 0.2)';
            ctx.drawImage(winnerCoverImg, x, y, coverSize, coverSize);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#333'; ctx.fillRect(x, y, coverSize, coverSize);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 38px ${mainFont}`;
        ctx.fillText(topSong.title, width / 2, 565);
        
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `24px ${mainFont}`;
        ctx.fillText(topSong.artist, width / 2, 605);
        
        ctx.fillStyle = accentColor;
        ctx.font = `bold 22px ${mainFont}`;
        ctx.fillText(`🔥 ${topSong.play_count} PLAYS THIS ${type}`, width / 2, 645);
    }

    // List Sisanya
    const listStartTop = 715;
    songs.slice(1).forEach((song, index) => {
        const rank = index + 2;
        const y = listStartTop + (index * 62);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        if (ctx.roundRect) { ctx.roundRect(80, y - 42, width - 160, 52, 10); } 
        else { ctx.rect(80, y - 42, width - 160, 52); }
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = rank === 2 ? accentColor : (rank === 3 ? '#C0C0C0' : '#ffffff');
        ctx.font = `bold 22px ${mainFont}`;
        ctx.fillText(`${rank}`, 110, y - 6);

        ctx.fillStyle = '#ffffff';
        ctx.font = `18px ${mainFont}`;
        const info = `${song.title || 'Unknown'} - ${song.artist || 'Unknown'}`;
        ctx.fillText(info.length > 40 ? info.substring(0, 37) + '...' : info, 160, y - 6);

        ctx.textAlign = 'right';
        ctx.fillStyle = accentColor;
        ctx.font = `bold 16px ${mainFont}`;
        ctx.fillText(`${song.play_count || 0} PTS`, width - 110, y - 6);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `12px ${mainFont}`;
    ctx.fillText('GENERATED BY ALEXIA', width / 2, height - 35);

    return canvas.toBuffer();
}