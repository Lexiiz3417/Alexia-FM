// src/autopost.js

import dotenv from "dotenv";
import Keyv from "keyv";
import { getPlaylistTracks } from "./ytmusic.js";
import { getOdesliData } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToFacebook, commentOnPost } from "./facebook.js";
import { sendAutoPostEmbed, updateBotPresence } from "./discord.js";
import { generateNowPlayingImage } from './imageProcessor.js'; 
import { getRandomComment } from './commentGenerator.js'; 
import { postToTelegram } from "./telegram.js"; 
import { logPlayHistory } from './history.js'; 
import { getTrackInfo } from './coverFinder.js'; 
import { sendWhatsAppPost } from './whatsapp.js'; // 🟢 IMPORT MESIN WA KITA!

dotenv.config();

const db = new Keyv();
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

        console.log(`🔍 Memurnikan metadata lagu: ${trackTitle} - ${trackArtist}...`);
        const hdInfo = await getTrackInfo(trackTitle, trackArtist);

        if (hdInfo) {
            trackTitle = hdInfo.title || trackTitle;        
            trackArtist = hdInfo.artist || trackArtist;      
            if (hdInfo.coverUrl) {
                trackCover = hdInfo.coverUrl;                
            }
            console.log(`✅ Dimurnikan via API: ${trackTitle} - ${trackArtist}`);
        } else {
            console.log(`⚠️ Gagal memurnikan, tetap pakai data Odesli.`);
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
        const imageBuffer = await generateNowPlayingImage(songObj, dayNumber);

        if (!imageBuffer) return false;

        logPlayHistory(trackTitle, trackArtist, 'AUTOPOST', 'autopost', trackCover);

        const caption = await generateCaption({ 
            day: dayNumber, 
            title: trackTitle, 
            artist: trackArtist, 
            link: odesliData.pageUrl 
        });
        
        const engagementComment = await getRandomComment(trackTitle, trackArtist);

        // --- 🔵 POSTING KE FACEBOOK ---
        if (process.env.FACEBOOK_PAGE_ID) {
            try {
                const postId = await postToFacebook(imageBuffer, caption);
                if (postId) {
                    console.log(`✅ FB Post ID: ${postId}`);
                    await commentOnPost(postId, engagementComment);
                }
            } catch (e) { console.error("FB Post Error:", e.message); }
        }

        // --- 🔵 POSTING KE TELEGRAM ---
        if (process.env.TELEGRAM_BOT_TOKEN) {
            try {
                await postToTelegram(imageBuffer, caption, engagementComment);
            } catch (e) { console.error("Tele Post Error:", e.message); }
        }

        // --- 🟢 POSTING KE WHATSAPP PRIBADI ---
        try {
            console.log("🟢 Mengirim draft ke WhatsApp CEO...");
            const myWaNumber = "6285163133417@s.whatsapp.net"; 
            
            // Gabungin caption sama comment biar gampang di-forward
            const waCaption = `${caption}\n\n💬 ${engagementComment}`;
            
            await sendWhatsAppPost(myWaNumber, waCaption, imageBuffer);
        } catch (waError) { 
            console.error("❌ Gagal kirim ke WA:", waError.message); 
        }

        // --- 🟣 POSTING KE DISCORD ---
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