// src/autopost.js

import dotenv from "dotenv";
import Keyv from "keyv";
import { getPlaylistTracks } from "./ytmusic.js";
import { getOdesliData } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToFacebook, commentOnPost } from "./facebook.js";
import { sendAutoPostEmbed, updateBotPresence } from "./discord.js";
import { cropToSquare } from './imageProcessor.js';
import { uploadToImgbb } from './imageUploader.js'; 

dotenv.config();

const db = new Keyv('sqlite://db.sqlite');
const START_DATE = new Date(process.env.START_DATE || "2025-07-19");

/**
 * Mengambil track mentah berikutnya dari playlist YouTube di database.
 * @returns {Promise<object|null>} Objek track mentah dari ytmusic.js atau null.
 */
async function getNextTrack() {
  let shuffledPlaylist = await db.get('shuffled_playlist');
  let currentIndex = await db.get('playlist_index') || 0;

  if (!shuffledPlaylist || currentIndex >= shuffledPlaylist.length) {
    console.log("Playlist is empty or finished. Fetching and reshuffling...");
    shuffledPlaylist = await getPlaylistTracks();
    if (!shuffledPlaylist || shuffledPlaylist.length === 0) {
      console.error("❌ Failed to fetch a new playlist. Cannot select a track.");
      return null;
    }
    await db.set('shuffled_playlist', shuffledPlaylist);
    currentIndex = 0;
  }
  
  const track = shuffledPlaylist[currentIndex];
  await db.set('playlist_index', currentIndex + 1);

  console.log(`Picking track #${currentIndex + 1} from shuffled list: ${track.name}`);
  return track;
}

/**
 * Menjalankan seluruh proses autopost harian.
 * @param {import('discord.js').Client} client - Instance client Discord.
 * @returns {Promise<boolean>} True jika berhasil, false jika gagal.
 */
// --- TYPO DIPERBAIKI DI SINI ---
export async function performAutopost(client) {
  try {
    console.log("🚀 Starting daily autoposting task...");
    
    const today = new Date();
    const diffTime = Math.abs(today - START_DATE);
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const initialTrack = await getNextTrack();
    if (!initialTrack) {
      console.error("❌ Could not get a track from playlist. Aborting autopost.");
      return false;
    }
    
    const odesliData = await getOdesliData(initialTrack.url);
    if (!odesliData) {
      console.error(`❌ Odesli lookup failed for ${initialTrack.url}. Aborting autopost.`);
      return false;
    }
    
    const finalTrack = {
        name: odesliData.title,
        artist: odesliData.artist,
    };

    updateBotPresence(client, finalTrack);
    const imageBuffer = await cropToSquare(odesliData.imageUrl);
    const caption = await generateCaption({ day: dayNumber, title: finalTrack.name, artist: finalTrack.artist, link: odesliData.pageUrl });
    
    if (process.env.FACEBOOK_PAGE_ID) {
        const imgbbUrl = await uploadToImgbb(imageBuffer);
        const finalImageUrlForFacebook = imgbbUrl || odesliData.imageUrl;
        const postId = await postToFacebook(finalImageUrlForFacebook, caption);

        if (postId) {
            console.log(`✅ Song & caption ready. FB Post ID: ${postId}`);
            const commentMessage = "What do you guys think of this track? Let me know below! 👇";
            await commentOnPost(postId, commentMessage);
        }
    } else {
        console.log("✅ Song & caption ready. Facebook post skipped.");
    }

    console.log(`📣 Sending to all Discord subscribers...`);
    let count = 0;
    const discordComment = "A new track for today! What do you think? 🤔";
    const discordIdRegex = /^\d{17,19}$/;

    for await (const [serverId, channelId] of db.iterator()) {
       if (!discordIdRegex.test(serverId)) {
         console.log(`🟡 Skipping non-server key from DB: "${serverId}"`);
         continue;
       }
       
      try {
        await sendAutoPostEmbed({ 
            client, 
            comment: discordComment, 
            caption, 
            imageUrl: odesliData.imageUrl,
            imageBuffer,
            channelId 
        });
        console.log(`👍 Successfully sent to server ${serverId}`);
        count++;
      } catch (error) {
        console.error(`👎 Failed to send to server ${serverId}:`, error.message);
      }
    }
    console.log(`Broadcast finished, sent to ${count} Discord servers.`);
    
    console.log(`✅ Autopost task for day #${dayNumber} completed.`);
    return true;
  } catch (err) {
    console.error("❌ A major error occurred during autopost:", err);
    return false;
  }
};