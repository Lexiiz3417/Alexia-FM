// src/autopost.js

import dotenv from "dotenv";
import Keyv from 'keyv';
import { KeyvPostgres } from '@keyv/postgres';
import { getPlaylistTracks } from "./ytmusic.js";
import { getOdesliData } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToFacebook, commentOnPost } from "./facebook.js";
import { sendAutoPostEmbed, updateBotPresence } from "./discord.js";
import { generateNowPlayingImage } from './imageProcessor.js'; 
import { getRandomComment } from './commentGenerator.js'; 
import { postToTelegram } from "./telegram.js"; 
import { logPlayHistory } from './history.js'; 
import { getTrackInfo, cleanMetadata } from './coverFinder.js'; // 🌟 Import cleanMetadata
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

        let trackTitle = odesliData.title;
        let trackArtist = odesliData.artist;
        let trackCover = odesliData.imageUrl;

        console.log(`🔍 Refining metadata for: ${trackTitle} - ${trackArtist}...`);
        
        // 1. LAYER 1: API REFINEMENT (Deezer/iTunes)
        const hdInfo = await getTrackInfo(trackTitle, trackArtist);

        if (hdInfo) {
            trackTitle = hdInfo.title || trackTitle;        
            trackArtist = hdInfo.artist || trackArtist;      
            if (hdInfo.coverUrl) {
                trackCover = hdInfo.coverUrl;                
            }
            console.log(`✅ Refined via API: ${trackTitle} - ${trackArtist}`);
        } else {
            // 🌟 LAYER 2: MANUAL CLEANING (Bilingual/Kanji Cleaner)
            // If API fails, we still clean the text manually
            const cleaned = cleanMetadata(trackTitle, trackArtist);
            trackTitle = cleaned.cleanTitle || trackTitle;
            trackArtist = cleaned.cleanArtist || trackArtist;
            console.log(`⚠️ API Match failed. Manually cleaned: ${trackTitle} - ${trackArtist}`);
        }

        const finalTrack = { name: trackTitle, artist: trackArtist };

        if (client) {
            await updateBotPresence(client, finalTrack);
        }

        const songObj = {
            title: trackTitle,
            artist: trackArtist,
            coverUrl: trackCover
        };
        
        // 2. IMAGE GENERATION (Bea Cukai internal imageProcessor handles YouTube HD logic)
        const imageBuffer = await generateNowPlayingImage(songObj, dayNumber);

        if (!imageBuffer) return false;

        logPlayHistory(trackTitle, trackArtist, 'AUTOPOST', 'autopost', trackCover);

        // 3. CAPTION GENERATION (Uses the clean Title & Artist)
        const caption = await generateCaption({ 
            day: dayNumber, 
            title: trackTitle, 
            artist: trackArtist, 
            link: odesliData.pageUrl 
        });
        
        const engagementComment = await getRandomComment(trackTitle, trackArtist);

        // --- 🔵 FACEBOOK ---
        if (process.env.FACEBOOK_PAGE_ID) {
            try {
                const postId = await postToFacebook(imageBuffer, caption);
                if (postId) {
                    console.log(`✅ FB Post ID: ${postId}`);
                    await commentOnPost(postId, engagementComment);
                }
            } catch (e) { console.error("FB Post Error:", e.message); }
        }

        // --- 🔵 TELEGRAM ---
        if (process.env.TELEGRAM_BOT_TOKEN) {
            try {
                await postToTelegram(imageBuffer, caption, engagementComment);
            } catch (e) { console.error("Tele Post Error:", e.message); }
        }

        // --- 🟢 WHATSAPP CEO ---
        try {
            console.log("🟢 Sending draft to WhatsApp CEO...");
            const myWaNumber = "6285163133417@s.whatsapp.net"; 
            const waCaption = `${caption}\n\n💬 ${engagementComment}`;
            await sendWhatsAppPost(myWaNumber, waCaption, imageBuffer);
        } catch (waError) { 
            console.error("❌ WA Post Error:", waError.message); 
        }

        // --- 🟣 DISCORD ---
        console.log(`📣 Sending to Discord...`);
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