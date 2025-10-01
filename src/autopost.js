// src/autopost.js (VERSI UPGRADE)

import dotenv from "dotenv";
import Keyv from "keyv";
import { getPlaylistTracks } from "./ytmusic.js"; // <-- Ganti dari spotify.js ke ytmusic.js
import { getUniversalLink } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToFacebook, commentOnPost } from "./facebook.js";
import { sendAutoPostEmbed, updateBotPresence } from "./discord.js";

dotenv.config();

const db = new Keyv('sqlite://db.sqlite');
const START_DATE = new Date(process.env.START_DATE || "2025-07-19");

// Fungsi baru untuk memilih lagu berikutnya secara berurutan
async function getNextTrack() {
  let shuffledPlaylist = await db.get('shuffled_playlist');
  let currentIndex = await db.get('playlist_index') || 0;

  // Jika playlist belum ada di DB atau sudah habis, kita ambil dan acak ulang
  if (!shuffledPlaylist || currentIndex >= shuffledPlaylist.length) {
    console.log("Playlist is empty or finished. Fetching and reshuffling...");
    shuffledPlaylist = await getPlaylistTracks();
    await db.set('shuffled_playlist', shuffledPlaylist);
    currentIndex = 0;
  }
  
  const track = shuffledPlaylist[currentIndex];
  // Simpan index berikutnya untuk pemanggilan selanjutnya
  await db.set('playlist_index', currentIndex + 1);

  console.log(`Picking track #${currentIndex + 1} from shuffled list: ${track.name}`);
  return track;
}


export async function performAutopost(client) {
  try {
    console.log("🚀 Starting daily autoposting task...");
    
    const today = new Date();
    const diffTime = Math.abs(today - START_DATE);
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Ganti pemanggilan getRandomTrack() dengan getNextTrack()
    const track = await getNextTrack();
    if (!track) {
      console.error("❌ Could not get a track to post. Aborting.");
      return false;
    }
    
    updateBotPresence(client, track);
    const universalLink = await getUniversalLink(track.url);
    const caption = await generateCaption({ day: dayNumber, title: track.name, artist: track.artist, genre: track.genre, link: universalLink });
    
    if (process.env.FACEBOOK_PAGE_ID) {
        const postId = await postToFacebook(track.image, caption);
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
    for await (const [serverId, channelId] of db.iterator()) {
       // Kita filter key yang bukan serverId
      if (!serverId.startsWith('keyv:')) {
          try {
            await sendAutoPostEmbed({ client, comment: discordComment, caption, imageUrl: track.image, channelId });
            console.log(`👍 Successfully sent to server ${serverId}`);
            count++;
          } catch (error) {
            console.error(`👎 Failed to send to server ${serverId}:`, error.message);
          }
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