// src/discord.js

import { EmbedBuilder, AttachmentBuilder, ActivityType } from 'discord.js';

/**
 * Mengirim embed autopost ke channel Discord.
 * - comment: Kalimat pancingan dari comments/default.txt
 * - caption: Info lagu dari captions/default.txt
 * - imageBuffer: Gambar mentah (kartu musik) dari RAM
 * - imageUrl: Link gambar asli (fallback jika buffer gagal)
 */
export async function sendAutoPostEmbed({ client, comment, caption, imageUrl, imageBuffer, channelId }) {
  try {
    // 1. Cari Channel
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
        console.warn(`⚠️ Channel ${channelId} not found or bot has no access.`);
        return;
    }

    // 2. Buat Embed (Isinya Caption & Timestamp)
    const embed = new EmbedBuilder()
      .setColor('Random')
      .setDescription(caption) 
      .setTimestamp();

    // 3. Siapkan Payload (Paket Pesan)
    const payload = { embeds: [embed] };

    // 4. Tampilkan Komentar Interaktif (load dari comments/default.txt)
    // Kita taruh di 'content' (di luar kotak embed) supaya member langsung baca & reply
    if (comment) {
        payload.content = comment;
    }

    // 5. Logika Gambar (Buffer vs URL)
    if (imageBuffer) {
      // OPSI UTAMA: Pakai gambar HD hasil generate (Buffer)
      // Kita "lampirkan" file buffer sebagai 'card.png'
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'card.png' });
      
      // Pasang gambar tersebut ke dalam embed
      embed.setImage('attachment://card.png');
      
      // Masukkan ke array files
      payload.files = [attachment];
    } else {
      // OPSI CADANGAN: Pakai URL cover asli dari Odesli kalau generate gambar gagal
      embed.setImage(imageUrl);
    }

    // 6. Kirim ke Channel
    await channel.send(payload);

  } catch (error) {
    console.error(`❌ Failed to send to Discord channel ${channelId}:`, error.message);
  }
}

/**
 * Update status bot (Presence).
 * Contoh: "Listening to Judul Lagu by Artis"
 */
export async function updateBotPresence(client, track) {
  if (client.user) {
    client.user.setActivity(`${track.name} by ${track.artist}`, { type: ActivityType.Listening });
  }
}