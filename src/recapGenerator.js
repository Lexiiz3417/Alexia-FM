// src/recapGenerator.js

import { createCanvas, loadImage } from 'canvas';
import { getOdesliData } from './songlink.js';
import { getPlaylistTracks } from './ytmusic.js';

/**
 * Fungsi pembantu buat nyari URL Cover Juara 1
 */
async function getCoverWinner(title, artist) {
    if (!title || !artist) return null; // Cegah error toLowerCase pada data kosong

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
    } catch (e) {
        console.error("[RECAP] Error fetching cover:", e.message);
        return null;
    }
}

/**
 * Fungsi Utama Generator Gambar Recap
 */
export async function generateRecapImage(type, songs) {
    const width = 800;
    const height = 1000;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // --- 💡 FIX FONT: Menggunakan font bawaan OS (Sama persis seperti di kartu musik) ---
    const mainFont = 'monospace';
    const accentColor = '#FFD700'; // Kuning Gold
    
    // Pastikan selalu ada data meskipun kosong/error
    const topSong = songs[0] || { title: "Unknown", artist: "Unknown", play_count: 0 };
    let winnerCoverImg = null;

    // 1. AMBIL COVER JUARA 1
    if (topSong.title !== "Unknown") {
        const coverUrl = await getCoverWinner(topSong.title, topSong.artist);
        if (coverUrl) {
            try {
                winnerCoverImg = await loadImage(coverUrl);
            } catch (e) {
                console.error("[RECAP] Gagal meload gambar juara 1");
            }
        }
    }

    // 2. DRAW BACKGROUND (COVER BLURRED / GRADIENT)
    if (winnerCoverImg) {
        ctx.drawImage(winnerCoverImg, 0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)'; // Overlay gelap estetik
        ctx.fillRect(0, 0, width, height);
    } else {
        // Fallback jika tidak ada data/cover gagal load
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#121212');
        grad.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    // 3. WATERMARK (@alexiazaphyra)
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
    ctx.font = `italic 16px ${mainFont}`;
    ctx.fillText('@alexiazaphyra', width - 40, 45);

    // 4. HEADER
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 32px ${mainFont}`;
    ctx.fillText(`ALEXIA ${type} RECAP`, width / 2, 90);
    
    ctx.fillStyle = accentColor;
    ctx.font = `20px ${mainFont}`;
    const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText(dateStr, width / 2, 125);

    // 5. RENDER TOP #1 (THE CHAMPION)
    if (topSong.title !== "Unknown") {
        const coverSize = 320;
        const x = (width - coverSize) / 2;
        const y = 190;

        if (winnerCoverImg) {
            // Glow Kuning lembut di belakang cover utama
            ctx.shadowBlur = 50;
            ctx.shadowColor = 'rgba(255, 215, 0, 0.2)';
            ctx.drawImage(winnerCoverImg, x, y, coverSize, coverSize);
            ctx.shadowBlur = 0; // Reset shadow
        } else {
            // Kotak abu jika cover bener-bener gak ada
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, coverSize, coverSize);
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

    // 6. RENDER LIST (#2 - #Limit)
    const listStartTop = 715;
    const spacing = 62;

    songs.slice(1).forEach((song, index) => {
        const rank = index + 2;
        const y = listStartTop + (index * spacing);

        // Baris latar belakang transparan (Glass Effect)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        // Fallback untuk sistem yang tidak support roundRect
        if (ctx.roundRect) {
            ctx.roundRect(80, y - 42, width - 160, 52, 10);
        } else {
            ctx.rect(80, y - 42, width - 160, 52); 
        }
        ctx.fill();

        // Peringkat
        ctx.textAlign = 'left';
        ctx.fillStyle = rank === 2 ? accentColor : (rank === 3 ? '#C0C0C0' : '#ffffff');
        ctx.font = `bold 22px ${mainFont}`;
        ctx.fillText(`${rank}`, 110, y - 6);

        // Judul & Artist
        ctx.fillStyle = '#ffffff';
        ctx.font = `18px ${mainFont}`;
        const info = `${song.title || 'Unknown'} - ${song.artist || 'Unknown'}`;
        // Truncate jika kepanjangan
        const maxLen = 40;
        const displayInfo = info.length > maxLen ? info.substring(0, maxLen - 3) + '...' : info;
        ctx.fillText(displayInfo, 160, y - 6);

        // Skor/Count
        ctx.textAlign = 'right';
        ctx.fillStyle = accentColor;
        ctx.font = `bold 16px ${mainFont}`;
        ctx.fillText(`${song.play_count || 0} PTS`, width - 110, y - 6);
    });

    // 7. FOOTER
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `12px ${mainFont}`;
    ctx.fillText('GENERATED BY ALEXIA', width / 2, height - 35);

    return canvas.toBuffer();
}