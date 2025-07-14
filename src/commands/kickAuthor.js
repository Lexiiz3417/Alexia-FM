// src/commands/kickAuthor.js

import { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { getActionGif } from '../imageAPI.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Kick This Author') // <-- Ganti nama
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const authorOfCommand = interaction.user;
    const targetMessage = interaction.targetMessage;
    const targetAuthor = targetMessage.author;
    
    // Ganti aksi di sini
    const gifUrl = await getActionGif('kick'); 

    if (!gifUrl) {
      return interaction.editReply({ content: "Oops! Couldn't get a kick GIF right now." });
    }

    let description = '';
    if (targetAuthor.id === authorOfCommand.id) {
      description = `${authorOfCommand} somehow kicked themselves. That's talent!`;
    } else {
      // Ganti teks aksi
      description = `**${authorOfCommand} sends ${targetAuthor} flying with a kick!** 👟`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#E74C3C') // Ganti warna
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

    await interaction.editReply({ content: 'Kick has been delivered!' });
  },
};