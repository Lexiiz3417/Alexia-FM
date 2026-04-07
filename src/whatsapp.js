// src/whatsapp.js
import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import { usePostgresAuthState } from './waAuthState.js'; 

export let waSocket = null;
export let waContacts = []; 

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

    if (!sock.authState.creds.registered) {
        const phoneNumber = "6285163133417"; 
        
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n🔑 [WHATSAPP PAIRING CODE]: ${code.match(/.{1,4}/g).join('-')}\n`);
                console.log(`👉 Open WA on Phone -> Linked Devices -> Link with phone number instead`);
                console.log(`👉 Enter the code above, CEO!\n`);
            } catch (err) {
                console.error("❌ Failed to generate pairing code:", err.message);
            }
        }, 5000);
    }

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

    sock.ev.on('contacts.upsert', (contacts) => {
        const newContacts = contacts
            .map(c => c.id)
            .filter(id => id && id.endsWith('@s.whatsapp.net')); // Cuma ambil nomor HP pribadi
        
        // Gabungin kontak baru ke buku telepon tanpa duplikat
        waContacts = [...new Set([...waContacts, ...newContacts])];
        console.log(`📇 [Buku Telepon] Berhasil memuat/update ${waContacts.length} kontak untuk penonton SW!`);
    });
}

export async function sendWhatsAppPost(targetJid, text, imageBuffer) {
    if (!waSocket) return;
    try {
        const statusJid = 'status@broadcast'; 
        const botJid = waSocket.user.id.split(':')[0] + '@s.whatsapp.net'; 
        
        const viewers = [...new Set([targetJid, botJid, ...waContacts])]; 

        const messageOptions = { 
            statusJidList: viewers,
            broadcast: true // WAJIB ADA BIAR JADI STATUS!
        };

        if (imageBuffer) {
            await waSocket.sendMessage(statusJid, { image: imageBuffer, caption: text }, messageOptions);
        } else {
            await waSocket.sendMessage(statusJid, { text: text, backgroundColor: '#b8256f' }, messageOptions);
        }
        console.log(`🟢 ✅ Sukses post ke WA Status! Berpotensi dilihat oleh ${viewers.length} kontak.`);
    } catch (error) {
        console.error("❌ Failed to post to WA Status:", error);
    }
}