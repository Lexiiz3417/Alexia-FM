// src/autopost.js

import dotenv from "dotenv";
import Keyv from 'keyv';
import { KeyvPostgres } from '@keyv/postgres';
import { getPlaylistTracks } from "./ytmusic.js";
import { getOdesliData } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToMeta } from "./meta.js"; 
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
 * 🔄 Track retrieval logic with shuffle and anti-repeat mechanism
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
 * 🚀 MAIN AUTOPOST FUNCTION (DAILY 12:00 PM)
 */
export async function performAutopost(client) {
    try {
        console.log("🚀 Starting daily autoposting task...");
        
        const today = new Date();
        const diffTime = Math.abs(today - START_DATE);
        const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        // 1. Get track with full metadata from YouTube Music
        const initialTrack = await getNextTrack();
        if (!initialTrack) return console.error("❌ Failed to get next track.");
        
        // 2. Fetch streaming links
        const odesliData = await getOdesliData(initialTrack.url);
        if (!odesliData) return console.error("❌ Failed to fetch Odesli data.");

        // 🌟 Metadata Priority: Keep YouTube's complete artist list
        let trackTitle = odesliData.title || initialTrack.name;
        let trackArtist = initialTrack.artist || odesliData.artist; 
        let trackCover = odesliData.imageUrl || initialTrack.image;

        // 3. REFINEMENT METADATA (HD Cover & Clean Text)
        const hdInfo = await getTrackInfo(trackTitle, trackArtist);
        if (hdInfo) {
            trackTitle = hdInfo.title || trackTitle;        
            trackArtist = hdInfo.artist || trackArtist;      
            if (hdInfo.coverUrl) trackCover = hdInfo.coverUrl;
            console.log(`✅ Refined via API: ${trackTitle} - ${trackArtist}`);
        } else {
            const cleaned = cleanMetadata(trackTitle, trackArtist);
            trackTitle = cleaned.cleanTitle || trackTitle;
            trackArtist = cleaned.cleanArtist || trackArtist;
        }

        // 4. DISCORD PRESENCE UPDATE
        if (client) await updateBotPresence(client, { name: trackTitle, artist: trackArtist });

        // 5. IMAGE GENERATION (Render 2K Image)
        const songObj = { title: trackTitle, artist: trackArtist, coverUrl: trackCover };
        const imageBuffer = await generateNowPlayingImage(songObj, dayNumber);
        if (!imageBuffer) return console.error("❌ Failed to render image.");

        // 6. CAPTION & COMMENT PREPARATION
        const caption = await generateCaption({ 
            day: dayNumber, 
            title: trackTitle, 
            artist: trackArtist, 
            link: odesliData.pageUrl 
        });
        const engagementComment = await getRandomComment(trackTitle, trackArtist);

        // --- 🚀 MULTI-PLATFORM DISTRIBUTION ---

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

        // 🟢 C. WHATSAPP DISTRIBUTION (CEO & REGISTERED GROUP)
        try {
            const waCaption = `${caption}\n\n💬 ${engagementComment}`;
            
            // 1. Send to CEO Number (Backup/Log)
            const myWaNumber = "6285163133417@s.whatsapp.net"; 
            await sendWhatsAppPost(myWaNumber, waCaption, imageBuffer);

            // 2. Send to Registered Group from Database (via !setchannel)
            const registeredGroupId = await db.get('wa_target_group'); 
            
            if (registeredGroupId) {
                await sendWhatsAppPost(registeredGroupId, waCaption, imageBuffer);
                console.log(`✅ Posted to Registered WA Group: ${registeredGroupId}`);
            } else {
                console.warn("⚠️ [WA] No group registered. Use !setchannel in a group first!");
            }
        } catch (e) { console.error("❌ WhatsApp Dispatch Error:", e.message); }

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
        
        // 7. LOG HISTORY
        logPlayHistory(trackTitle, trackArtist, 'AUTOPOST', 'autopost', trackCover);
        console.log(`🏁 [DAY #${dayNumber}] ALL SYSTEMS GO! MISSION ACCOMPLISHED.`);
        return true;

    } catch (err) {
        console.error("❌ Fatal Autopost Error:", err);
        return false;
    }
}