// src/commands/cleanhistory.js
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
        .setName('cleanhistory')
        .setDescription('OWNER ONLY: Delete a specific song from the Recap database (Safe & Precise)')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('EXACT song title to delete (Example: The Call)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('artist')
                .setDescription('EXACT artist name (Optional. Example: Release)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // --- 1. SECURITY CHECK ---
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '⛔ Access Denied! This command is exclusive to the CEO.', flags: ['Ephemeral'] });
        }

        const exactTitle = interaction.options.getString('title');
        const exactArtist = interaction.options.getString('artist');
        
        await interaction.deferReply({ flags: ['Ephemeral'] });

        try {
            let countQuery, deleteQuery, params;

            // --- 2. CLOUD SNIPER LOGIC (EXACT MATCH) ---
            if (exactArtist) {
                // Delete based on Title + Artist
                countQuery = `SELECT COUNT(*) as total FROM play_history WHERE title = $1 AND artist = $2`;
                deleteQuery = `DELETE FROM play_history WHERE title = $1 AND artist = $2`;
                params = [exactTitle, exactArtist];
            } else {
                // Delete based on Title only
                countQuery = `SELECT COUNT(*) as total FROM play_history WHERE title = $1`;
                deleteQuery = `DELETE FROM play_history WHERE title = $1`;
                params = [exactTitle];
            }

            // Check if data exists first
            const resultCount = await pool.query(countQuery, params);
            const total = parseInt(resultCount.rows[0].total, 10);

            if (total === 0) {
                return interaction.editReply({ 
                    content: `🔎 **Data not found!**\nNo play history found for **"${exactTitle}"**${exactArtist ? ` by **"${exactArtist}"**` : ''} in the cloud database.` 
                });
            }

            // Pull the trigger (Delete Data)
            const resultDelete = await pool.query(deleteQuery, params);
            const deletedRows = resultDelete.rowCount;

            // --- 3. RENDER RESULT ---
            const embed = new EmbedBuilder()
                .setColor('#2ecc71') // Green Success
                .setTitle('🎯 Target Eliminated!')
                .setDescription(`Successfully deleted **${deletedRows}** play records for:\n\n🎵 **${exactTitle}**\n🎤 ${exactArtist ? exactArtist : '(All artists with this title)'}`)
                .setFooter({ text: 'Cloud Database Optimized • Clean History' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            console.log(`🧹 [Supabase] Cleaned ${deletedRows} records for: ${exactTitle} ${exactArtist ? `- ${exactArtist}` : ''}`);

        } catch (error) {
            console.error("❌ [Supabase] Clean History Error:", error);
            await interaction.editReply({ content: `❌ Failed to clean cloud database: ${error.message}` });
        }
    }
};