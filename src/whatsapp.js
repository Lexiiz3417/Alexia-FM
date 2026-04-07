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
     * 🛡️ ADMIN COMMAND HANDLER (CEO ONLY)
     * !setchannel    -> Save Group ID to DB
     * !removechannel -> Delete Group ID from DB
     */
    sock.ev.on('messages.upsert', async m => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        
        if (!msg.message) return;

        const remoteJid = msg.key.remoteJid; 
        const senderJid = msg.key.participant || msg.key.remoteJid; 
        const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase().trim();

        // 🔐 ADMIN CREDENTIALS
        const myNumber = "6285163133417"; 
        const myLID = "123325724512316"; 
        const isCEO = senderJid.includes(myNumber) || senderJid.includes(myLID);

        // 1. SET CHANNEL
        if (body === '!setchannel') {
            if (!isCEO) return console.warn(`🚫 Unauthorized !setchannel from: ${senderJid}`);

            if (remoteJid.endsWith('@g.us')) {
                await db.set('wa_target_group', remoteJid);
                console.log(`💾 [Database] WhatsApp target group registered: ${remoteJid}`);
                await sock.sendMessage(remoteJid, { 
                    text: `✅ *Alexia Registration Successful*\n\nIdentity Verified: *CEO Mode*\nGroup ID: \`${remoteJid}\` is now the official home for updates.` 
                }, { quoted: msg });
            } else {
                await sock.sendMessage(remoteJid, { text: `❌ Boss, use this command inside a Group!` });
            }
        }

        // 2. REMOVE CHANNEL
        if (body === '!removechannel') {
            if (!isCEO) return console.warn(`🚫 Unauthorized !removechannel from: ${senderJid}`);

            const currentChannel = await db.get('wa_target_group');
            if (currentChannel) {
                await db.delete('wa_target_group');
                console.log(`🗑️ [Database] WhatsApp target group removed.`);
                await sock.sendMessage(remoteJid, { 
                    text: `🗑️ *Alexia Clean Up*\n\nRegistration removed! Alexia will no longer post daily updates here.` 
                }, { quoted: msg });
            } else {
                await sock.sendMessage(remoteJid, { text: `⚠️ No group was registered in my database, Boss.` });
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