// src/autopost.js

import dotenv from "dotenv";
import Keyv from "keyv";
import { getPlaylistTracks } from "./ytmusic.js";
import { getOdesliData } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToFacebook, commentOnPost } from "./facebook.js";
import { sendAutoPostEmbed, updateBotPresence } from "./discord.js";
import { createMusicCard } from "./imageProcessor.js";
import { getRandomComment } from "./commentGenerator.js"; 
dotenv.config();

const db = new Keyv("sqlite://db.sqlite");
const START_DATE = new Date(process.env.START_DATE || "2025-07-19");

async function getNextTrack() {
  let shuffledPlaylist = await db.get("shuffled_playlist");
  let currentIndex = (await db.get("playlist_index")) || 0;

  if (!shuffledPlaylist || currentIndex >= shuffledPlaylist.length) {
    console.log("Playlist finished. Reshuffling...");
    shuffledPlaylist = await getPlaylistTracks();
    if (!shuffledPlaylist || shuffledPlaylist.length === 0) return null;
    await db.set("shuffled_playlist", shuffledPlaylist);
    currentIndex = 0;
  }

  const track = shuffledPlaylist[currentIndex];
  await db.set("playlist_index", currentIndex + 1);
  return track;
}

export async function performAutopost(client) {
  try {
    console.log("🚀 Starting daily autoposting task...");

    const today = new Date();
    const diffTime = Math.abs(today - START_DATE);
    const dayNumber =
      Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const initialTrack = await getNextTrack();
    if (!initialTrack) return false;

    const odesliData = await getOdesliData(initialTrack.url);
    if (!odesliData) return false;

    const finalTrack = {
      name: odesliData.title,
      artist: odesliData.artist,
    };

    updateBotPresence(client, finalTrack);

    const imageBuffer = await createMusicCard({
      imageUrl: odesliData.imageUrl,
      title: finalTrack.name,
      artist: finalTrack.artist,
      day: dayNumber,
    });

    if (!imageBuffer) return false;

    const caption = await generateCaption({
      day: dayNumber,
      title: finalTrack.name,
      artist: finalTrack.artist,
      link: odesliData.pageUrl,
    });

    // ✅ RANDOM ENGAGEMENT COMMENT (PAKAI AWAIT)
    const engagementComment = await getRandomComment(
      finalTrack.name,
      finalTrack.artist
    );

    // --- FACEBOOK POSTING ---
    if (process.env.FACEBOOK_PAGE_ID) {
      const postId = await postToFacebook(imageBuffer, caption);

      if (postId) {
        console.log(`✅ FB Post ID: ${postId}`);
        await commentOnPost(postId, engagementComment);
      }
    }

    // --- DISCORD POSTING ---
    console.log("📣 Sending to Discord...");
    const discordIdRegex = /^\d{17,19}$/;

    for await (const [serverId, channelId] of db.iterator()) {
      if (!discordIdRegex.test(serverId)) continue;

      try {
        await sendAutoPostEmbed({
          client,
          comment: engagementComment, // ✅ sama dengan FB
          caption,
          imageUrl: odesliData.imageUrl,
          imageBuffer,
          channelId,
        });
      } catch (error) {
        console.error(`Skipping server ${serverId}`, error);
      }
    }

    console.log(`✅ Autopost Day #${dayNumber} completed.`);
    return true;
  } catch (err) {
    console.error("❌ Autopost Error:", err);
    return false;
  }
}
