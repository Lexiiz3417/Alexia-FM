// src/index.js (VERSI FINAL UNTUK WINDOWS)

import dotenv from "dotenv";
import cron from "node-cron";
import Keyv from "keyv";
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
// Pastikan pathToFileURL di-import dari 'node:url'
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getRandomTrack } from "./spotify.js";
import { getUniversalLink } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToFacebook } from "./facebook.js";
import { startDiscordBot, sendAutoPostEmbed, updateBotPresence } from "./discord.js";
import { keepAlive } from './keep_alive.js';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);

  // =============================================================
  // BAGIAN PENTING YANG SAMA SEPERTI DI DEPLOY-COMMANDS
  // =============================================================
  const { default: command } = await import(pathToFileURL(filePath));
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: /${command.data.name}`);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

const db = new Keyv('sqlite://db.sqlite');
const START_DATE = new Date(process.env.START_DATE || "2025-07-08");

const performAutopost = async () => {
  try {
    console.log("🚀 Starting daily autoposting task...");
    
    const today = new Date();
    const diffTime = today - START_DATE;
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const track = await getRandomTrack();
    
    updateBotPresence(client, track);
    const universalLink = await getUniversalLink(track.url);
    const caption = await generateCaption({ day: dayNumber, title: track.name, artist: track.artist, genre: track.genre, link: universalLink });
    
    if (process.env.FACEBOOK_PAGE_ID) {
        const postId = await postToFacebook(track.image, caption);
        console.log(`✅ Song & caption ready. FB Post ID: ${postId}`);
    } else {
        console.log("✅ Song & caption ready. Facebook post skipped.");
    }

    console.log(`📣 Sending to all subscribers...`);
    let count = 0;
    for await (const [serverId, channelId] of db.iterator()) {
      try {
        await sendAutoPostEmbed({ client, caption, imageUrl: track.image, channelId });
        console.log(`👍 Successfully sent to server ${serverId}`);
        count++;
      } catch (error) {
        console.error(`👎 Failed to send to server ${serverId}:`, error.message);
      }
    }
    console.log(`Broadcast finished, sent to ${count} servers.`);
    
    console.log(`✅ Autopost task for day #${dayNumber} completed.`);
  } catch (err) {
    console.error("❌ A major error occurred during autopost:", err);
  }
};

console.log("🔥 Alexia FM Bot Service Started (Refactored Edition)...");
keepAlive();
startDiscordBot(client); 

console.log("⏰ Autopost scheduled for 9:00 AM WIB daily.");
cron.schedule('0 9 * * *', performAutopost, { scheduled: true, timezone: "Asia/Jakarta" });