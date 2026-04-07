// src/discord.js

import { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  Events, 
  REST, 
  Routes, 
  EmbedBuilder, 
  AttachmentBuilder, 
  ActivityType 
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startDiscordBot() {
  const client = new Client({ 
      intents: [GatewayIntentBits.Guilds] 
  });

  client.commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  const commands = [];

  // Initialize and load commands from the /commands directory
  for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const fileUrl = pathToFileURL(filePath).href; 
      const commandModule = await import(fileUrl);
      const command = commandModule.default;
      
      if (command && 'data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          commands.push(command.data.toJSON());
      }
  }

  // Register Global Slash Commands
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
      console.log(`Started refreshing ${commands.length} application (/) commands.`);
      await rest.put(
          Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
          { body: commands },
      );
      console.log(`✅ Successfully reloaded application (/) commands.`);
  } catch (error) {
      console.error(error);
  }

  // Event: Client Online with Initial Presence
  client.once(Events.ClientReady, c => {
      console.log(`🎧 DJ ${c.user.tag} is ready to serve!`);
      c.user.setPresence({
        activities: [{ 
            name: 'Alexia FM Radio 📻', 
            type: ActivityType.Listening 
        }],
        status: 'online',
      });
  });

  /**
   * 🛡️ FAST DEFER STRATEGY
   * We trigger deferReply() immediately to prevent the 3-second timeout (Error 10062).
   */
  client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isChatInputCommand()) return;

      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
          // Acknowledge the interaction instantly
          await interaction.deferReply();

          // Execute command logic
          await command.execute(interaction);
      } catch (error) {
          console.error("❌ Interaction Error:", error);
          
          const errorMsg = { content: 'There was an error executing this command!', flags: ['Ephemeral'] };
          
          if (interaction.deferred || interaction.replied) {
              await interaction.followUp(errorMsg).catch(() => {});
          } else {
              await interaction.reply(errorMsg).catch(() => {});
          }
      }
  });

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

/**
 * Sends a stylized music embed to a specific Discord channel
 */
export async function sendAutoPostEmbed({ client, comment, caption, imageUrl, imageBuffer, channelId }) {
  try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return console.warn(`⚠️ Channel ${channelId} not found.`);

      const embed = new EmbedBuilder()
        .setColor('Random')
        .setDescription(caption) 
        .setTimestamp();

      const payload = { embeds: [embed] };
      if (comment) payload.content = comment;

      if (imageBuffer) {
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'card.png' });
        embed.setImage('attachment://card.png');
        payload.files = [attachment];
      } else {
        embed.setImage(imageUrl);
      }

      await channel.send(payload);
  } catch (error) {
      console.error(`❌ Discord Post Error:`, error.message);
  }
}

/**
 * Updates bot presence to show current playing track
 */
export async function updateBotPresence(client, track) {
  if (!client.user || !track) return;
  try {
    const statusText = `${track.name} by ${track.artist}`;
    client.user.setPresence({
      activities: [{ 
        name: statusText, 
        type: ActivityType.Listening 
      }],
      status: 'online',
    });
    console.log(`🎧 Presence Updated: Listening to ${statusText}`);
  } catch (error) {
    console.error("❌ Failed to update presence:", error.message);
  }
}