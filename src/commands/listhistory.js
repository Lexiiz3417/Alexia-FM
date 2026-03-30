// src/commands/listhistory.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Establish connection to Supabase cloud database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export default {
    data: new SlashCommandBuilder()
        .setName('listhistory')
        .setDescription('OWNER ONLY: Intip 15 data terakhir di database history'),
    
    async execute(interaction) {
        // Owner authorization check
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '⛔ Akses Ditolak!', flags: ['Ephemeral'] });
        }
        await interaction.deferReply({ flags: ['Ephemeral'] });

        try {
            // Fetch the last 15 rows from the cloud database
            const query = `SELECT id, title, artist FROM play_history ORDER BY id DESC LIMIT 15`;
            const result = await pool.query(query);
            const rows = result.rows;

            if (!rows || rows.length === 0) {
                return interaction.editReply('📭 Database history kosong.');
            }

            // Format the list for easy copying
            const textList = rows.map(r => `🔹 \`${r.title}\`\n👤 \`${r.artist}\`\n`).join('\n');
            
            const embed = new EmbedBuilder()
                .setTitle('📜 15 Riwayat Terakhir di Database (Cloud)')
                .setDescription(textList)
                .setColor('#3498db')
                .setFooter({ text: 'Tinggal copy text merah (Highlight) biar gak typo pas cleanhistory' });

            await interaction.editReply({ embeds: [embed] });
            
        } catch (err) {
            console.error("❌ [Supabase] Failed to fetch history list:", err);
            await interaction.editReply(`❌ Error: ${err.message}`);
        }
    }
};