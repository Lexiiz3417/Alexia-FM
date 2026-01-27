import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Keyv from 'keyv';

const db = new Keyv('sqlite://data/db.sqlite');

// Membungkus semuanya dalam satu 'export default'
export default {
  data: new SlashCommandBuilder()
    .setName('subscribers')
    .setDescription('Check how many servers have subscribed to Alexia FM!'),

  async execute(interaction) {
    try {
      await interaction.deferReply(); 

      let totalSubscribers = 0;
      for await(const [key, value] of db.iterator()) {
        totalSubscribers++;
      }

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📻 Alexia FM Stats')
        .setDescription(`Currently, Alexia FM is live on **${totalSubscribers}** servers! 🚀`)
        .setFooter({ text: 'Thanks for being part of the community!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Error executing /subscribers command:", error);
      await interaction.editReply({ content: 'Oops! Failed to fetch stats.' });
    }
  }
};