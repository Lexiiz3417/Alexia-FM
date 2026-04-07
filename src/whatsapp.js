// src/whatsapp.js
import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import { usePostgresAuthState } from './waAuthState.js'; 
import Keyv from 'keyv';
import { KeyvPostgres } from '@keyv/postgres';

export let waSocket = null;

// Initialize Database connection for WhatsApp settings
const db = new Keyv({
    store: new KeyvPostgres({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })
});

export async function startWhatsAppBot() {
    const { state, saveCreds } = await usePostgresAuthState();
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }), 
        browser: Browsers.ubuntu('Chrome'), 
        syncFullHistory: false,
        getMessage: async (key) => { return { conversation: '' } } 
    });

    waSocket = sock;

    // Pairing Code logic for the first-time setup
    if (!sock.authState.creds.registered) {
        const phoneNumber = "6285163133417"; 
        
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n🔑 [WHATSAPP PAIRING CODE]: ${code.match(/.{1,4}/g).join('-')}\n`);
                console.log(`👉 Open WA on Phone -> Linked Devices -> Link with phone number instead`);
                console.log(`👉 Enter the code above!\n`);
            } catch (err) {
                console.error("❌ Failed to generate pairing code:", err.message);
            }
        }, 5000);
    }

    // Connection update handler
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) setTimeout(() => startWhatsAppBot(), 5000);
        } else if (connection === 'open') {
            console.log('✅ BOOM! ALEXIA WA SUCCESSFULLY CONNECTED VIA CLOUD AUTH!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    /**
     * 🛡️ AUTOMATIC CHANNEL REGISTRATION (CEO ONLY)
     * Responds to !setchannel to save the Group ID into the database.
     */
    sock.ev.on('messages.upsert', async m => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        
        // 🌟 REVISI: Hapus filter fromMe agar bot bisa merespon pesan dari nomornya sendiri
        if (!msg.message) return;

        const remoteJid = msg.key.remoteJid; 
        const senderJid = msg.key.participant || msg.key.remoteJid; 
        const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase().trim();

        // Admin Security: Only authorized number can register
        const myNumber = "6285163133417"; 
        
        if (body === '!setchannel') {
            // Verify if the sender is the authorized CEO (including self-messages)
            if (!senderJid.includes(myNumber)) {
                console.warn(`🚫 [Security] Unauthorized !setchannel attempt from: ${senderJid}`);
                return;
            }

            if (remoteJid.endsWith('@g.us')) {
                // 💾 Save Group ID to Supabase via Keyv
                await db.set('wa_target_group', remoteJid);
                console.log(`💾 [Database] WhatsApp target group registered: ${remoteJid}`);
                
                await sock.sendMessage(remoteJid, { 
                    text: `✅ *Alexia Registration Successful*\n\nGroup ID: \`${remoteJid}\` has been registered as the primary channel for daily music updates.` 
                }, { quoted: msg });
            } else {
                await sock.sendMessage(remoteJid, { text: `❌ Boss, please use this command inside a Group!` });
            }
        }
    });
}

/**
 * 🟢 Send WhatsApp Message (Individual or Group)
 */
export async function sendWhatsAppPost(targetJid, text, imageBuffer) {
    if (!waSocket) return;
    try {
        if (imageBuffer) {
            await waSocket.sendMessage(targetJid, { image: imageBuffer, caption: text });
        } else {
            await waSocket.sendMessage(targetJid, { text: text });
        }
        console.log(`🟢 ✅ Successfully posted to WhatsApp: ${targetJid}`);
    } catch (error) {
        console.error(`❌ Failed to post to WhatsApp (${targetJid}):`, error);
    }
}