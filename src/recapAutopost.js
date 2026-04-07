// src/recapAutopost.js

import dotenv from "dotenv";
import Keyv from "keyv";
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';
import { getTopSongs } from "./history.js";
import { generateRecapImage } from "./recapGenerator.js";
import { postToMeta } from "./meta.js"; 
import { postToTelegram } from "./telegram.js";
import { sendWhatsAppPost } from "./whatsapp.js"; // 🌟 IMPORT WA MASUK!

dotenv.config();
const db = new Keyv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getDynamicRecapText(label, topSong) {
    const title = topSong.title || "Unknown Track";
    const artist = topSong.artist || "Unknown Artist";
    const plays = topSong.play_count || 0;
    const period = label.toLowerCase(); 

    const tags = "#MusicRecap #TopTracks #AlexiaFM #NowPlaying #ChartTopper #MusicDiscovery";

    let finalCaption = `📊 ALEXIA ${label} WRAPPED\nTop track: ${title} by ${artist} (${plays} plays)!\n\n${tags}`;
    let finalComment = `What's your favorite track this ${period}? 👇`;

    try {
        const capPath = path.join(__dirname, '..', 'captions', 'recap.txt');
        const capRaw = await readFile(capPath, "utf-8");
        const capTemplates = capRaw.split(/---+/).map((t) => t.trim()).filter(Boolean);
        const chosenCap = capTemplates[Math.floor(Math.random() * capTemplates.length)];

        finalCaption = chosenCap
            .replace(/{label}/g, label)
            .replace(/{period}/g, period)
            .replace(/{title}/g, title)
            .replace(/{artist}/g, artist)
            .replace(/{plays}/g, plays)
            .replace(/{tags}/g, tags);

        const comPath = path.join(__dirname, '..', 'comments', 'recap.txt');
        const comRaw = await readFile(comPath, "utf-8");
        const comTemplates = comRaw.split(/---+/).map((t) => t.trim()).filter(Boolean);
        const chosenCom = comTemplates[Math.floor(Math.random() * comTemplates.length)];

        finalComment = chosenCom
            .replace(/{label}/g, label)
            .replace(/{period}/g, period)
            .replace(/{title}/g, title)
            .replace(/{artist}/g, artist)
            .replace(/{plays}/g, plays)
            .replace(/{tags}/g, tags);

    } catch (e) {
        console.error("⚠️ Gagal baca file template recap, pakai teks darurat:", e.message);
    }

    return { caption: finalCaption, comment: finalComment };
}

export async function performRecapAutopost(client, period) {
    const cfg = { weekly: [7, 5, 'WEEKLY'], monthly: [30, 7, 'MONTHLY'], yearly: [365, 10, 'YEARLY'] }[period];
    if (!cfg) return false;
    const [days, limit, label] = cfg;

    try {
        console.log(`🚀 Starting ${label} Recap Autopost Task...`);
        
        const songs = await getTopSongs(days, limit);
        if (!songs || songs.length === 0) {
            console.log(`⚠️ No history found for ${label}. Skipping.`);
            return false;
        }

        const imgBuffer = await generateRecapImage(label, songs);
        if (!imgBuffer) return false;

        const { caption, comment } = await getDynamicRecapText(label, songs[0]);

        // --- 📘 📸 🧵 META GROUP (FB, IG, THREADS) ---
        if (process.env.META_ACCESS_TOKEN) {
            try {
                console.log(`📡 Sending ${label} Recap to Meta...`);
                const metaReport = await postToMeta(imgBuffer, caption, comment);
                console.log(`✅ Meta Recap Results -> FB: ${metaReport.facebook} | IG: ${metaReport.instagram} | Threads: ${metaReport.threads}`);
            } catch (e) { console.error("❌ Meta Recap Error:", e.message); }
        }

        // --- ✈️ TELEGRAM POSTING ---
        if (process.env.TELEGRAM_BOT_TOKEN) {
            postToTelegram(imgBuffer, caption, comment).catch(console.error);
        }

        // --- 🟢 WHATSAPP STATUS POSTING ---
        try {
            console.log("🟢 Sending Recap to WhatsApp Status...");
            const myWaNumber = "6285163133417@s.whatsapp.net"; 
            const waCaption = `${caption}\n\n💬 ${comment}`;
            await sendWhatsAppPost(myWaNumber, waCaption, imgBuffer);
        } catch (waError) { 
            console.error("❌ WA Recap Error:", waError.message); 
        }

        // --- 🟣 DISCORD POSTING ---
        const attachment = new AttachmentBuilder(imgBuffer, { name: 'recap.png' });
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`📊 Alexia ${label} Wrapped`)
            .setDescription(caption) 
            .setImage('attachment://recap.png')
            .setFooter({ text: 'Automated Recap System' })
            .setTimestamp();

        let count = 0;
        for await (const [k, v] of db.iterator()) {
            if (k?.startsWith('sub:')) {
                try {
                    const channel = await client.channels.fetch(v);
                    if (channel) {
                        await channel.send({ embeds: [embed], files: [attachment] });
                        count++;
                    }
                } catch (e) { console.error(`Skip Discord ${v}:`, e.message); }
            }
        }
        
        console.log(`✅ ${label} Recap successfully sent to ${count} Discord channels & Social Media!`);
        return true;
    } catch (error) {
        console.error(`❌ Recap Autopost Error:`, error);
        return false;
    }
}