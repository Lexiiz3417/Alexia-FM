// src/commands/patAuthor.js

import { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { getActionGif } from '../imageAPI.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Pat This Author')
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const authorOfCommand = interaction.user;
    const targetMessage = interaction.targetMessage;
    const targetAuthor = targetMessage.author;
    
    const gifUrl = await getActionGif('pat'); 

    if (!gifUrl) {
      return interaction.editReply({ content: "Oops! Couldn't find a pat GIF." });
    }

    let description = '';
    if (targetAuthor.id === authorOfCommand.id) {
      description = `${authorOfCommand} pats their own head. Good job!`;
    } else {
      description = `**${authorOfCommand} gives ${targetAuthor} a comforting pat.** How sweet!`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#3498DB') // Warna biru menenangkan
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

    await interaction.editReply({ content: 'Pat has been delivered!' });
  },
};