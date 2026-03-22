// src/facebook.js

import fetch from 'node-fetch';

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const API_VERSION = process.env.FACEBOOK_API_VERSION || 'v25.0';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function postToFacebook(imageSource, caption) {
    if (!PAGE_ID || !ACCESS_TOKEN) return null;

    const url = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/photos`;
    let retries = 3;
    let backoff = 2000;

    for (let i = 0; i < retries; i++) {
        try {
            // 🌟 JURUS BYPASS: Pake Blob bukan Buffer!
            const formData = new FormData();
            formData.append('access_token', ACCESS_TOKEN);
            formData.append('message', caption);
            formData.append('published', 'true');

            // Ubah Buffer jadi Blob biar Facebook gak nolak
            if (Buffer.isBuffer(imageSource)) {
                const blob = new Blob([imageSource], { type: 'image/png' });
                formData.append('source', blob, 'alexia-card.png');
            } else {
                formData.append('url', imageSource);
            }

            const response = await fetch(url, { 
                method: 'POST', 
                body: formData
                // getHeaders() dihapus karena node-fetch bawaan Node v22 udah support native Blob/FormData
            });
            
            if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);

            const data = await response.json();

            if (data.error) {
                console.error("❌ FB API Rejected:", data.error);
                return null;
            }

            if (data.id) {
                console.log(`✅ Successfully posted to FB! ID: ${data.id}`);
                return data.id; 
            }
            return null;

        } catch (error) {
            console.warn(`⚠️ [FB Retry] Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) return null;
            await sleep(backoff);
            backoff *= 2; 
        }
    }
}

export async function commentOnPost(postId, message) {
    if (!ACCESS_TOKEN || !postId) return;

    const url = `https://graph.facebook.com/${API_VERSION}/${postId}/comments`;
    let retries = 3;
    let backoff = 2000;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, access_token: ACCESS_TOKEN })
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            console.log("💬 Successfully commented on FB post!");
            return;

        } catch (error) {
            console.warn(`⚠️ [FB Comment Retry] Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) return;
            await sleep(backoff);
            backoff *= 2;
        }
    }
}