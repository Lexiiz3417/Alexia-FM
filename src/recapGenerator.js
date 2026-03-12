// src/recapGenerator.js

import { createCanvas, loadImage } from 'canvas';
import { getOdesliData } from './songlink.js';
import { getPlaylistTracks } from './ytmusic.js';

/**
 * Fungsi pembantu buat nyari URL Cover Juara 1
 */
async function getCoverWinner(title, artist) {
    try {
        // Cari di playlist internal dulu (gratis & cepat)
        const playlist = await getPlaylistTracks();
        const found = playlist.find(t => 
            t.title.toLowerCase().includes(title.toLowerCase()) || 
            title.toLowerCase().includes(t.title.toLowerCase())
        );
        if (found) return found.thumbnails[found.thumbnails.length - 1].url;

        // Kalau gak ada, tanya Odesli
        const searchData = await getOdesliData(`https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`);
        return searchData?.imageUrl || null;
    } catch (e) {
        return null;
    }
}

export async function generateRecapImage(type, songs) {
    const width = 800;
    const height = 1000;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const topSong = songs[0];
    let winnerCoverImg = null;

    // 1. AMBIL COVER JUARA 1
    if (topSong) {
        const coverUrl = await getCoverWinner(topSong.title, topSong.artist);
        if (coverUrl) {
            winnerCoverImg = await loadImage(coverUrl);
        }
    }

    // 2. DRAW BACKGROUND (COVER BLURRED)
    if (winnerCoverImg) {
        // Gambar cover memenuhi seluruh canvas
        ctx.drawImage(winnerCoverImg, 0, 0, width, height);
        
        // Kasih efek blur & gelapkan (Overlay)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semakin besar 0.7, semakin gelap
        ctx.fillRect(0, 0, width, height);
        
        // Tambahkan efek Glassmorphism dikit (Optional)
        ctx.backdropFilter = 'blur(15px)'; // Sayangnya node-canvas gak support filter native, kita akali dengan overlay
    } else {
        // Fallback kalau cover gak ketemu
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1a1a1a');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    // --- HEADER ---
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Sans';
    ctx.fillText(`ALEXIA ${type} RECAP`, width / 2, 80);
    
    ctx.fillStyle = '#b8256f';
    ctx.font = '20px Sans';
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText(dateStr, width / 2, 110);

    // --- RENDER TOP #1 CENTER ---
    if (topSong && winnerCoverImg) {
        const coverSize = 300;
        const x = (width - coverSize) / 2;
        const y = 160;

        // Bayangan Putih/Glow di belakang cover
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#b8256f';
        
        // Gambar Cover Utama
        ctx.drawImage(winnerCoverImg, x, y, coverSize, coverSize);
        
        // Reset Shadow biar gak ngefek ke teks
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 35px Sans';
        ctx.fillText(topSong.title, width / 2, 510);
        
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '25px Sans';
        ctx.fillText(topSong.artist, width / 2, 545);
        
        ctx.fillStyle = '#b8256f';
        ctx.font = 'bold 22px Sans';
        ctx.fillText(`🔥 ${topSong.play_count} PLAYS THIS ${type}`, width / 2, 580);
    }

    // --- RENDER LIST (#2 - #Limit) ---
    const listStartTop = 650;
    const spacing = 55;

    songs.slice(1).forEach((song, index) => {
        const rank = index + 2;
        const y = listStartTop + (index * spacing);

        // Baris latar belakang transparan (Glass effect)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.roundRect(80, y - 35, width - 160, 45, 10);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = rank === 2 ? '#FFD700' : (rank === 3 ? '#C0C0C0' : '#ffffff');
        ctx.font = 'bold 20px Sans';
        ctx.fillText(`${rank}`, 100, y);

        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Sans';
        const info = `${song.title} - ${song.artist}`;
        ctx.fillText(info.length > 50 ? info.substring(0, 47) + '...' : info, 140, y);

        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(`${song.play_count} pts`, width - 110, y);
    });

    return canvas.toBuffer();
}