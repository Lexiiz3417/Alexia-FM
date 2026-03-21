// src/autopost.js

import dotenv from "dotenv";
import Keyv from "keyv";
import { getPlaylistTracks } from "./ytmusic.js";
import { getOdesliData } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToFacebook, commentOnPost } from "./facebook.js";
import { sendAutoPostEmbed, updateBotPresence } from "./discord.js";
import { createMusicCard } from './imageProcessor.js'; 
import { getRandomComment } from './commentGenerator.js'; 
import { postToTelegram } from "./telegram.js"; 
import { logPlayHistory } from './history.js'; 

// 🌟 IMPORT OTAK PENCARI GAMBAR KITA (PHASE 1)
import { getTrackInfo } from './coverFinder.js'; 

dotenv.config();

// Akses Database (Keyv untuk state playlist)
const db = new Keyv('sqlite://data/db.sqlite');

// --- KONFIGURASI ---
const START_DATE = new Date(process.env.START_DATE || "2026-01-23");
const HISTORY_LIMIT = 50; 

/**
 * Fungsi Cerdas: Mengambil lagu berikutnya tapi ngecek History dulu
 */
async function getNextTrack() {
    let shuffledPlaylist = await db.get('shuffled_playlist');
    let currentIndex = await db.get('playlist_index') || 0;
    let history = await db.get('played_history') || [];

    if (!shuffledPlaylist || currentIndex >= shuffledPlaylist.length) {
        console.log("🔄 Playlist finished or empty. Reshuffling...");
        shuffledPlaylist = await getPlaylistTracks();
        
        if (!shuffledPlaylist || shuffledPlaylist.length === 0) return null;
        
        shuffledPlaylist = shuffledPlaylist.sort(() => Math.random() - 0.5);
        await db.set('shuffled_playlist', shuffledPlaylist);
        currentIndex = 0; 
    }
    
    let track = null;
    let attempts = 0;
    
    while (currentIndex < shuffledPlaylist.length) {
        const candidate = shuffledPlaylist[currentIndex];
        const isRecentlyPlayed = history.includes(candidate.url);

        if (!isRecentlyPlayed) {
            track = candidate;
            currentIndex++; 
            await db.set('playlist_index', currentIndex);
            
            history.push(candidate.url);
            if (history.length > HISTORY_LIMIT) {
                history.shift(); 
            }
            await db.set('played_history', history);
            
            break; 
        } else {
            console.log(`⚠️ Skipping track: "${candidate.title}" (Recently played).`);
            currentIndex++; 
        }
        attempts++;
        if (attempts > 500) break; 
    }

    if (!track && shuffledPlaylist.length > 0) {
        console.log("⚠️ Warning: Picking fallback track.");
        track = shuffledPlaylist[0]; 
        await db.set('playlist_index', shuffledPlaylist.length); 
    }

    return track;
}

export async function performAutopost(client) {
    try {
        console.log("🚀 Starting daily autoposting task...");
        
        const today = new Date();
        const diffTime = Math.abs(today - START_DATE);
        const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        const initialTrack = await getNextTrack();
        
        if (!initialTrack) {
            console.error("❌ Failed to get next track.");
            return false;
        }
        
        const odesliData = await getOdesliData(initialTrack.url);
        if (!odesliData) {
            console.error("❌ Failed to fetch Odesli data. Skipping.");
            return false;
        }

        // --- Variabel Default dari Odesli ---
        let trackTitle = odesliData.title;
        let trackArtist = odesliData.artist;
        let trackCover = odesliData.imageUrl;

        // 🌟 THE MAGIC: Panggil Cover Engine (Deezer) buat nyuci data!
        console.log(`🔍 Memurnikan metadata lagu: ${trackTitle} - ${trackArtist}...`);
        const hdInfo = await getTrackInfo(trackTitle, trackArtist);

        if (hdInfo) {
            trackTitle = hdInfo.title || trackTitle;        // Judul bersih
            trackArtist = hdInfo.artist || trackArtist;      // Artis bersih (Gak ada "Release")
            if (hdInfo.coverUrl) {
                trackCover = hdInfo.coverUrl;                // Cover HD 1000x1000 Square!
            }
            console.log(`✅ Dimurnikan via API: ${trackTitle} - ${trackArtist}`);
        } else {
            console.log(`⚠️ Gagal memurnikan, tetap pakai data Odesli.`);
        }

        const finalTrack = { name: trackTitle, artist: trackArtist };

        // Update Status Bot di Discord
        if (client) {
            await updateBotPresence(client, finalTrack);
        }

        // Generate Gambar (High Quality) pake data yg udah bersih
        const imageBuffer = await createMusicCard({
            imageUrl: trackCover, // <-- PAKE COVER HD DEEZER
            title: trackTitle,    // <-- PAKE JUDUL BERSIH
            artist: trackArtist,  // <-- PAKE ARTIS BERSIH
            topText: `DAY #${dayNumber}`
        });

        if (!imageBuffer) return false;

        // --- 📝 PASANG CCTV (HISTORY LOG) ---
        // Catat ke DB. Parameter ke-5 adalah trackCover (link gambar HD)
        logPlayHistory(trackTitle, trackArtist, 'AUTOPOST', 'autopost', trackCover);

        const caption = await generateCaption({ 
            day: dayNumber, 
            title: trackTitle, 
            artist: trackArtist, 
            link: odesliData.pageUrl // Link streaming tetep aman dari Odesli
        });
        
        const engagementComment = await getRandomComment(trackTitle, trackArtist);

        // --- 1. FACEBOOK POSTING ---
        if (process.env.FACEBOOK_PAGE_ID) {
            try {
                const postId = await postToFacebook(imageBuffer, caption);
                if (postId) {
                    console.log(`✅ FB Post ID: ${postId}`);
                    await commentOnPost(postId, engagementComment);
                }
            } catch (e) { console.error("FB Post Error:", e.message); }
        }

        // --- 2. TELEGRAM POSTING ---
        if (process.env.TELEGRAM_BOT_TOKEN) {
            try {
                await postToTelegram(imageBuffer, caption, engagementComment);
            } catch (e) { console.error("Tele Post Error:", e.message); }
        }

        // --- 3. DISCORD POSTING ---
        console.log(`📣 Sending to Discord...`);
        for await (const [key, value] of db.iterator()) {
            if (key && key.startsWith('sub:')) {
                const channelId = value;
                try {
                    await sendAutoPostEmbed({ 
                        client, 
                        comment: engagementComment, 
                        caption, 
                        imageUrl: trackCover, // <-- Pake Cover HD di embed URL Discord
                        imageBuffer, 
                        channelId 
                    });
                } catch (error) { 
                    console.error(`Skipping channel ${channelId}:`, error.message); 
                }
            }
        }
        
        console.log(`✅ Autopost Day #${dayNumber} completed and logged to history.`);
        return true;
    } catch (err) {
        console.error("❌ Autopost Error:", err);
        return false;
    }
}