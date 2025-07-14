// src/commands/hugAuthor.js

import { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { getActionGif } from '../imageAPI.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Hug This Author') // <-- Ganti nama
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const authorOfCommand = interaction.user;
    const targetMessage = interaction.targetMessage;
    const targetAuthor = targetMessage.author;
    
    // Ganti aksi di sini
    const gifUrl = await getActionGif('hug'); 

    if (!gifUrl) {
      return interaction.editReply({ content: "Oops! Couldn't get a hug GIF right now." });
    }

    let description = '';
    if (targetAuthor.id === authorOfCommand.id) {
      description = `${authorOfCommand} is hugging themselves. Self-love is important! 🤗`;
    } else {
      // Ganti teks aksi
      description = `**${authorOfCommand} gives ${targetAuthor} a big, warm hug!** ❤️`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#FFB6C1') // Ganti warna
      .setDescription(description)
      .setImage(gifUrl)
      .setFooter({ text: 'Powered by waifu.pics' });

    await interaction.channel.send({
        content: `In response to "${targetMessage.content.substring(0, 50)}..."`,
        embeds: [embed],
        reply: {
            messageReference: targetMessage.id,
            failIfNotExists: false
        }
    });

    await interaction.editReply({ content: 'Hug has been delivered!' });
  },
};
