// src/discord.js
import { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } from "discord.js";
import dotenv from "dotenv";
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import Keyv from "keyv";

dotenv.config();

const db = new Keyv('sqlite://db.sqlite');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- BAGIAN COMMAND HANDLER ---
// Membuat 'lemari' untuk menyimpan semua command
client.commands = new Collection();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// 'Membaca' setiap file command dan menyimpannya ke lemari
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = await import(filePath);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] Command di ${filePath} tidak memiliki properti "data" atau "execute".`);
	}
}
// ------------------------------

/**
 * Fungsi untuk mengubah status bot menjadi multi-baris dinamis.
 */
export function updateBotPresence(track) {
  if (!client.user) return;
  client.user.setActivity(track.name, {
    type: ActivityType.Listening,
    state: `by ${track.artist}`,
  });
  console.log(`✅ Status bot di-update: Listening to ${track.name} by ${track.artist}`);
}

/**
 * Event yang berjalan sekali saat bot berhasil online.
 */
client.once("ready", () => {
  console.log(`🎧 DJ ${client.user.tag} siap melayani semua server!`);
  global.discordClient = client;
  client.user.setActivity('musik untuk dunia', { type: ActivityType.Listening });
});

/**
 * Event yang berjalan setiap kali ada interaksi (slash command).
 * Ini adalah 'resepsionis' yang menerima panggilan.
 */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`Command ${interaction.commandName} tidak ditemukan.`);
    return;
  }

  try {
    // Menyerahkan tugas ke file command yang sesuai
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Terjadi error saat menjalankan command ini!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Terjadi error saat menjalankan command ini!', ephemeral: true });
    }
  }
});

/**
 * Fungsi untuk menginisialisasi dan login bot Discord.
 */
export function startDiscordBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.warn("❗ DISCORD_TOKEN tidak ditemukan, bot tidak dijalankan.");
    return;
  }
  client.login(process.env.DISCORD_TOKEN);
}

/**
 * Fungsi untuk mengirim embed postingan otomatis harian ke channel tertentu.
 */
export async function sendAutoPostEmbed({ caption, imageUrl, channelId }) {
  if (!global.discordClient) return;
  const channel = global.discordClient.channels.cache.get(channelId);
  
  if (!channel) {
      console.warn(`❗ Channel dengan ID ${channelId} tidak ditemukan.`);
      // Hapus data yang salah dari database
      let serverId;
      for await(const [key, value] of db.iterator()) {
          if (value === channelId) {
              serverId = key;
              break;
          }
      }
      if (serverId) await db.delete(serverId);
      return;
  }

  const embed = new EmbedBuilder()
    .setColor('Random')
    .setDescription(caption)
    .setImage(imageUrl)
    .setTimestamp();
  
  await channel.send({ embeds: [embed] });
}