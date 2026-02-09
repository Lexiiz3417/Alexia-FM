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

dotenv.config();

// Akses Database
const db = new Keyv('sqlite://data/db.sqlite');

// --- KONFIGURASI BARU ---
const START_DATE = new Date(process.env.START_DATE || "2026-01-23");
const HISTORY_LIMIT = 50; // Lagu tidak boleh muncul lagi dalam 50 putaran terakhir

/**
 * Fungsi Cerdas: Mengambil lagu berikutnya tapi ngecek History dulu
 */
async function getNextTrack() {
  let shuffledPlaylist = await db.get('shuffled_playlist');
  let currentIndex = await db.get('playlist_index') || 0;
  let history = await db.get('played_history') || []; // Ambil data history

  // 1. Cek apakah Playlist Kosong/Habis? Reshuffle kalau perlu.
  if (!shuffledPlaylist || currentIndex >= shuffledPlaylist.length) {
    console.log("🔄 Playlist finished or empty. Reshuffling...");
    shuffledPlaylist = await getPlaylistTracks();
    
    if (!shuffledPlaylist || shuffledPlaylist.length === 0) return null;
    
    // Kocok ulang (Shuffle Array)
    shuffledPlaylist = shuffledPlaylist.sort(() => Math.random() - 0.5);
    
    await db.set('shuffled_playlist', shuffledPlaylist);
    currentIndex = 0; // Reset index ke awal
  }
  
  // 2. LOOP PENCARIAN LAGU UNIK (Anti-Repeat Logic)
  let track = null;
  let attempts = 0;
  
  // Kita loop playlist mulai dari currentIndex
  while (currentIndex < shuffledPlaylist.length) {
      const candidate = shuffledPlaylist[currentIndex];
      
      // Cek apakah URL lagu ini ada di history 50 lagu terakhir?
      const isRecentlyPlayed = history.includes(candidate.url);

      if (!isRecentlyPlayed) {
          // YES! Lagu ini aman (belum pernah diputar baru-baru ini)
          track = candidate;
          
          // Geser index buat besok
          currentIndex++; 
          await db.set('playlist_index', currentIndex);
          
          // Update History: Masukkan lagu ini, buang yang paling lama
          history.push(candidate.url);
          if (history.length > HISTORY_LIMIT) {
              history.shift(); // Hapus yang paling tua (paling kiri)
          }
          await db.set('played_history', history);
          
          break; // Keluar dari loop karena sudah dapet lagu
      } else {
          // NO! Lagu ini baru aja diputar. SKIP!
          console.log(`⚠️ Skipping track: "${candidate.title}" (Recently played). Looking for next...`);
          currentIndex++; // Loncat ke lagu berikutnya di list
      }

      attempts++;
      // Safety break kalau playlist ternyata isinya lagu yang sama semua (mustahil sih, tapi jaga-jaga)
      if (attempts > 500) break; 
  }

  // Fallback: Kalau saking sialnya semua sisa playlist itu history semua (kasus langka banget)
  // Ambil aja lagu di index sekarang biarpun duplikat, daripada bot error/mogok.
  if (!track && shuffledPlaylist.length > 0) {
      console.log("⚠️ Warning: Could not find unique track. Picking fallback.");
      track = shuffledPlaylist[0]; 
      // Reset playlist sekalian biar besok seger
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
    
    // Panggil fungsi getNextTrack yang sudah "Pintar" tadi
    const initialTrack = await getNextTrack();
    
    if (!initialTrack) {
        console.error("❌ Failed to get next track. Playlist might be empty.");
        return false;
    }
    
    console.log(`🎵 Processing Track: ${initialTrack.title} - ${initialTrack.artist}`);

    const odesliData = await getOdesliData(initialTrack.url);
    if (!odesliData) {
        console.error("❌ Failed to fetch Odesli data. Skipping.");
        return false;
    }
    
    const finalTrack = { name: odesliData.title, artist: odesliData.artist };

    // Update Status Bot di Discord
    if (client) {
        await updateBotPresence(client, finalTrack);
    }

    // Generate Gambar
    const imageBuffer = await createMusicCard({
        imageUrl: odesliData.imageUrl,
        title: finalTrack.name,
        artist: finalTrack.artist,
        topText: `DAY #${dayNumber}`
    });

    if (!imageBuffer) return false;

    const caption = await generateCaption({ 
        day: dayNumber, 
        title: finalTrack.name, 
        artist: finalTrack.artist, 
        link: odesliData.pageUrl 
    });
    
    const engagementComment = await getRandomComment(finalTrack.name, finalTrack.artist);

    // --- 1. FACEBOOK POSTING ---
    if (process.env.FACEBOOK_PAGE_ID) {
        const postId = await postToFacebook(imageBuffer, caption);
        if (postId) {
            console.log(`✅ FB Post ID: ${postId}`);
            await commentOnPost(postId, engagementComment);
        }
    }

    // --- 2. TELEGRAM POSTING ---
    if (process.env.TELEGRAM_BOT_TOKEN) {
       await postToTelegram(imageBuffer, caption, engagementComment);
    }

    // --- 3. DISCORD POSTING ---
    console.log(`📣 Sending to Discord...`);
    let successCount = 0;

    for await (const [key, value] of db.iterator()) {
       if (key && key.startsWith('sub:')) {
           const channelId = value;
           try {
            await sendAutoPostEmbed({ 
                client, 
                comment: engagementComment, 
                caption, 
                imageUrl: odesliData.imageUrl, 
                imageBuffer, 
                channelId 
            });
            successCount++;
           } catch (error) { 
               console.error(`Skipping channel ${channelId}:`, error.message); 
           }
       }
    }
    
    console.log(`✅ Autopost Day #${dayNumber} completed.`);
    return true;
  } catch (err) {
    console.error("❌ Autopost Error:", err);
    return false;
  }
};