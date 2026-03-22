// src/commands/cleanhistory.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import sqlite3 from 'sqlite3';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('cleanhistory')
        .setDescription('OWNER ONLY: Hapus lagu spesifik dari database Recap (Aman & Presisi)')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Judul lagu PERSIS yang mau dihapus (Contoh: The Call)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('artist')
                .setDescription('Nama artis PERSIS (Opsional. Contoh: Release)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // --- 1. SECURITY CHECK ---
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '⛔ Akses Ditolak! Command ini eksklusif untuk CEO.', flags: ['Ephemeral'] });
        }

        const exactTitle = interaction.options.getString('title');
        const exactArtist = interaction.options.getString('artist');
        
        await interaction.deferReply({ flags: ['Ephemeral'] });

        // --- 2. KONEKSI DATABASE ---
        const dbPath = path.resolve(process.cwd(), 'data', 'db.sqlite');
        const db = new sqlite3.Database(dbPath);

        // Helper biar sqlite3 yang jadul bisa pake async/await
        const getQuery = (query, params) => new Promise((resolve, reject) => {
            db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
        });

        const runQuery = (query, params) => new Promise((resolve, reject) => {
            db.run(query, params, function(err) { err ? reject(err) : resolve(this.changes) });
        });

        try {
            let countQuery, deleteQuery, params;

            // --- 3. LOGIKA SNIPER (EXACT MATCH) ---
            if (exactArtist) {
                // Hapus berdasarkan Judul + Artis
                countQuery = `SELECT COUNT(*) as total FROM play_history WHERE title = ? AND artist = ?`;
                deleteQuery = `DELETE FROM play_history WHERE title = ? AND artist = ?`;
                params = [exactTitle, exactArtist];
            } else {
                // Hapus berdasarkan Judul doang
                countQuery = `SELECT COUNT(*) as total FROM play_history WHERE title = ?`;
                deleteQuery = `DELETE FROM play_history WHERE title = ?`;
                params = [exactTitle];
            }

            // Cek jumlah datanya dulu
            const resultCount = await getQuery(countQuery, params);

            if (!resultCount || resultCount.total === 0) {
                db.close();
                return interaction.editReply({ 
                    content: `🔎 **Data tidak ditemukan!**\nTidak ada lagu dengan judul **"${exactTitle}"**${exactArtist ? ` oleh **"${exactArtist}"**` : ''} di database.` 
                });
            }

            // Tarik pelatuk (Hapus Data)
            const deletedRows = await runQuery(deleteQuery, params);
            db.close();

            // --- 4. RENDER HASIL ---
            const embed = new EmbedBuilder()
                .setColor('#2ecc71') // Hijau Success
                .setTitle('🎯 Target Eliminated!')
                .setDescription(`Berhasil menghapus **${deletedRows}** riwayat putaran untuk lagu:\n\n🎵 **${exactTitle}**\n🎤 ${exactArtist ? exactArtist : '(Semua artis dengan judul ini)'}`)
                .setFooter({ text: 'Database Optimized • Clean History' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("❌ Clean History Error:", error);
            db.close();
            await interaction.editReply({ content: `❌ Gagal membersihkan DB: ${error.message}` });
        }
    }
};