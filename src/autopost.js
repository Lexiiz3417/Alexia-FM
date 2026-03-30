// src/autopost.js

import dotenv from "dotenv";
import Keyv from 'keyv';
import { KeyvPostgres } from '@keyv/postgres';
import { getPlaylistTracks } from "./ytmusic.js";
import { getOdesliData } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToMeta } from "./meta.js"; // 🌟 Versi Terpadu (FB, IG, Threads)
import { sendAutoPostEmbed, updateBotPresence } from "./discord.js";
import { generateNowPlayingImage } from './imageProcessor.js'; 
import { getRandomComment } from './commentGenerator.js'; 
import { postToTelegram } from "./telegram.js"; 
import { logPlayHistory } from './history.js'; 
import { getTrackInfo, cleanMetadata } from './coverFinder.js'; 
import { sendWhatsAppPost } from './whatsapp.js'; 

dotenv.config();

const db = new Keyv({
    store: new KeyvPostgres({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })
});

const START_DATE = new Date(process.env.START_DATE || "2026-01-23");
const HISTORY_LIMIT = 50; 

/**
 * 🔄 Logika Pengambilan Lagu (Shuffle & Anti-Repeat)
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
            if (history.length > HISTORY_LIMIT) history.shift(); 
            await db.set('played_history', history);
            break; 
        }
        currentIndex++; 
        attempts++;
        if (attempts > 500) break; 
    }

    return track || shuffledPlaylist[0];
}

/**
 * 🚀 FUNGSI UTAMA AUTOPOST (DAILY 12:00 PM)
 */
export async function performAutopost(client) {
    try {
        console.log("🚀 Starting daily autoposting task...");
        
        const today = new Date();
        const diffTime = Math.abs(today - START_DATE);
        const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        const initialTrack = await getNextTrack();
        if (!initialTrack) return console.error("❌ Failed to get next track.");
        
        const odesliData = await getOdesliData(initialTrack.url);
        if (!odesliData) return console.error("❌ Failed to fetch Odesli data.");

        let trackTitle = odesliData.title;
        let trackArtist = odesliData.artist;
        let trackCover = odesliData.imageUrl;

        // 1. REFINEMENT METADATA (HD Cover & Clean Text)
        const hdInfo = await getTrackInfo(trackTitle, trackArtist);
        if (hdInfo) {
            trackTitle = hdInfo.title || trackTitle;        
            trackArtist = hdInfo.artist || trackArtist;      
            if (hdInfo.coverUrl) trackCover = hdInfo.coverUrl;
            console.log(`✅ Refined via API: ${trackTitle}`);
        } else {
            const cleaned = cleanMetadata(trackTitle, trackArtist);
            trackTitle = cleaned.cleanTitle || trackTitle;
            trackArtist = cleaned.cleanArtist || trackArtist;
        }

        // 2. DISCORD PRESENCE UPDATE
        if (client) await updateBotPresence(client, { name: trackTitle, artist: trackArtist });

        // 3. IMAGE GENERATION (Render 2K Image)
        const songObj = { title: trackTitle, artist: trackArtist, coverUrl: trackCover };
        const imageBuffer = await generateNowPlayingImage(songObj, dayNumber);
        if (!imageBuffer) return console.error("❌ Failed to render image.");

        // 4. CAPTION & COMMENT PREPARATION
        const caption = await generateCaption({ 
            day: dayNumber, 
            title: trackTitle, 
            artist: trackArtist, 
            link: odesliData.pageUrl 
        });
        const engagementComment = await getRandomComment(trackTitle, trackArtist);

        // --- 🚀 DISTRIBUSI MULTI-PLATFORM ---

        // 📘 📸 🧵 A. META ECOSYSTEM (FB, IG, THREADS)
        if (process.env.META_ACCESS_TOKEN) {
            try {
                console.log("📡 Sending to Meta (FB, IG, Threads)...");
                const metaReport = await postToMeta(imageBuffer, caption, engagementComment);
                console.log(`✅ Meta Results -> FB: ${metaReport.facebook} | IG: ${metaReport.instagram} | Threads: ${metaReport.threads}`);
            } catch (e) { console.error("❌ Meta Error:", e.message); }
        }

        // ✈️ B. TELEGRAM
        if (process.env.TELEGRAM_BOT_TOKEN) {
            try {
                await postToTelegram(imageBuffer, caption, engagementComment);
                console.log("✅ Posted to Telegram.");
            } catch (e) { console.error("❌ Telegram Error:", e.message); }
        }

        // 🟢 C. WHATSAPP CEO (6285163133417)
        try {
            const myWaNumber = "6285163133417@s.whatsapp.net"; 
            const waCaption = `${caption}\n\n💬 ${engagementComment}`;
            await sendWhatsAppPost(myWaNumber, waCaption, imageBuffer);
            console.log("✅ Sent to WhatsApp CEO.");
        } catch (e) { console.error("❌ WA Error:", e.message); }

        // 🟣 D. DISCORD CHANNELS (Subscribers)
        console.log(`📣 Broadcasting to Discord Subscribers...`);
        for await (const [key, value] of db.iterator()) {
            if (key && key.startsWith('sub:')) {
                const channelId = value;
                try {
                    await sendAutoPostEmbed({ 
                        client, 
                        comment: engagementComment, 
                        caption, 
                        imageUrl: trackCover, 
                        imageBuffer, 
                        channelId 
                    });
                } catch (error) { console.error(`Skipping channel ${channelId}:`, error.message); }
            }
        }
        
        // 5. LOG HISTORY
        logPlayHistory(trackTitle, trackArtist, 'AUTOPOST', 'autopost', trackCover);
        console.log(`🏁 [DAY #${dayNumber}] ALL SYSTEMS GO! MISSION ACCOMPLISHED.`);
        return true;

    } catch (err) {
        console.error("❌ Fatal Autopost Error:", err);
        return false;
    }
}