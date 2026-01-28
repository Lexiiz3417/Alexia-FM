// src/commands/createcard.js

import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { getOdesliData } from '../songlink.js';
import { createMusicCard } from '../imageProcessor.js';
import Keyv from 'keyv';

// Koneksi Database User Usage
const db = new Keyv('sqlite://data/db.sqlite');

// --- KONFIGURASI LIMIT ---
const DAILY_LIMIT = 3; // User biasa cuma boleh bikin 3 kartu sehari

export default {
  data: new SlashCommandBuilder()
    .setName('createcard')
    .setDescription('Create a aesthetic music card from a link or custom image.')
    .addStringOption(option => 
        option.setName('song_url')
            .setDescription('Link to the song (Spotify, SoundCloud, etc)')
            .setRequired(false))
    .addAttachmentOption(option => 
        option.setName('image')
            .setDescription('Upload your own cover image (Optional)')
            .setRequired(false))
    .addStringOption(option => 
        option.setName('title')
            .setDescription('Override/Set Song Title manually')
            .setRequired(false))
    .addStringOption(option => 
        option.setName('artist')
            .setDescription('Override/Set Artist Name manually')
            .setRequired(false))
    .addStringOption(option => 
        option.setName('tag')
            .setDescription('Top text (Default: SHARED)', )
            .setRequired(false)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const ownerId = process.env.OWNER_ID;
    
    // 1. CEK LIMIT & COOLDOWN (Kecuali Owner)
    // Format Key Database: "limit:userID" -> { date: "2025-01-29", count: 1 }
    if (userId !== ownerId) {
        const todayStr = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
        const userUsage = await db.get(`limit:${userId}`) || { date: todayStr, count: 0 };

        // Reset jika ganti hari
        if (userUsage.date !== todayStr) {
            userUsage.date = todayStr;
            userUsage.count = 0;
        }

        // Cek kuota
        if (userUsage.count >= DAILY_LIMIT) {
            return interaction.reply({ 
                content: `⛔ **Quota Exceeded!**\nYou have used your **${DAILY_LIMIT} daily generations**.\nPlease wait until tomorrow or ask the Owner.`,
                ephemeral: true // Cuma dia yang bisa liat pesan ini
            });
        }

        // Simpan sementara (belum di-save ke DB, nanti pas sukses aja)
        userUsage.count += 1;
        // Kita simpan obj ini buat dipakai di akhir
        interaction.client.tempUsage = userUsage; 
    }

    await interaction.deferReply();

    try {
        // 2. Ambil Input User
        const songUrl = interaction.options.getString('song_url');
        const customImage = interaction.options.getAttachment('image');
        const customTitle = interaction.options.getString('title');
        const customArtist = interaction.options.getString('artist');
        const customTag = interaction.options.getString('tag') || "SHARED MUSIC";

        let finalTitle = "Unknown Title";
        let finalArtist = "Unknown Artist";
        let finalImageUrl = null;

        // Validasi Input
        if (!songUrl && (!customImage || !customTitle)) {
            return interaction.editReply({ content: '❌ **Error:** Please provide either a **Song Link** OR upload an **Image + Title**.' });
        }

        // 3. Fetch Data Link
        if (songUrl) {
            const odesliData = await getOdesliData(songUrl);
            if (odesliData) {
                finalTitle = odesliData.title;
                finalArtist = odesliData.artist;
                finalImageUrl = odesliData.imageUrl;
            } else if (!customTitle) {
                return interaction.editReply({ content: "❌ Couldn't fetch data from that link. Try entering Title manually." });
            }
        }

        // 4. Override Manual
        if (customTitle) finalTitle = customTitle;
        if (customArtist) finalArtist = customArtist;
        if (customImage) finalImageUrl = customImage.url; 

        if (!finalImageUrl) {
            return interaction.editReply({ content: "❌ No image source found. Please provide a link or upload an image." });
        }

        // 5. Generate Kartu
        const imageBuffer = await createMusicCard({
            imageUrl: finalImageUrl,
            title: finalTitle,
            artist: finalArtist,
            topText: customTag 
        });

        if (!imageBuffer) {
            return interaction.editReply({ content: '❌ Failed to generate image canvas.' });
        }

        // 6. UPDATE DATABASE LIMIT (Hanya jika sukses & bukan Owner)
        if (userId !== ownerId && interaction.client.tempUsage) {
            await db.set(`limit:${userId}`, interaction.client.tempUsage);
        }

        // 7. Kirim Hasil
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'music-card.png' });
        
        // Info sisa kuota (opsional, biar user tau)
        let footerText = `Generated by ${interaction.user.username}`;
        if (userId !== ownerId && interaction.client.tempUsage) {
            const sisa = DAILY_LIMIT - interaction.client.tempUsage.count;
            footerText += ` • Daily Quota: ${sisa}/${DAILY_LIMIT} left`;
        } else if (userId === ownerId) {
            footerText += ` • 👑 Owner Access`;
        }

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setImage('attachment://music-card.png')
            .setFooter({ text: footerText });

        await interaction.editReply({ 
            // content: `🎨 Here is your card!`, // Bisa dihapus biar bersih
            embeds: [embed],
            files: [attachment] 
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ Something went wrong while creating the card.' });
    }
  }
};