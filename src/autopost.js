// src/autopost.js

import dotenv from "dotenv";
import Keyv from "keyv";
import { getRandomTrack } from "./spotify.js";
import { getUniversalLink } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToFacebook, commentOnPost } from "./facebook.js";
import { sendAutoPostEmbed, updateBotPresence } from "./discord.js";

dotenv.config();

const db = new Keyv('sqlite://db.sqlite');
const START_DATE = new Date(process.env.START_DATE || "2025-07-19");

// Kita tambahkan 'export' dan terima 'client' sebagai parameter
export async function performAutopost(client) {
  try {
    console.log("🚀 Starting manual autoposting task...");
    
    const today = new Date();
    const diffTime = Math.abs(today - START_DATE);
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const track = await getRandomTrack();
    
    updateBotPresence(client, track);
    const universalLink = await getUniversalLink(track.url);
    const caption = await generateCaption({ day: dayNumber, title: track.name, artist: track.artist, genre: track.genre, link: universalLink });
    
    if (process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_ALBUM_ID) {
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
      try {
        await sendAutoPostEmbed({ client, comment: discordComment, caption, imageUrl: track.image, channelId });
        console.log(`👍 Successfully sent to server ${serverId}`);
        count++;
      } catch (error) {
        console.error(`👎 Failed to send to server ${serverId}:`, error.message);
      }
    }
    console.log(`Broadcast finished, sent to ${count} Discord servers.`);
    
    console.log(`✅ Autopost task for day #${dayNumber} completed.`);
    return true; // Kembalikan 'true' jika berhasil
  } catch (err) {
    console.error("❌ A major error occurred during autopost:", err);
    return false; // Kembalikan 'false' jika gagal
  }
};