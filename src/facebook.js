// src/facebook.js

import fetch from 'node-fetch';
import FormData from 'form-data';

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const API_VERSION = process.env.FACEBOOK_API_VERSION || 'v18.0';
// 👇 Tambahin variable buat nangkep API Key ImgBB
const IMGBB_API_KEY = process.env.IMGBB_API_KEY; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🌟 FUNGSI RAHASIA: Maling Hosting ImgBB
async function uploadToImgBB(imageBuffer) {
    if (!IMGBB_API_KEY) {
        console.warn("⚠️ IMGBB_API_KEY kosong. Fallback ImgBB dibatalkan.");
        return null;
    }
    try {
        console.log("⏳ Uploading to ImgBB as fallback...");
        // ImgBB minta format Base64
        const base64Image = imageBuffer.toString('base64');
        const body = new URLSearchParams();
        body.append('image', base64Image);

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: body
        });
        
        const data = await res.json();
        if (data.success) {
            console.log("✅ ImgBB Upload Success:", data.data.url);
            return data.data.url;
        }
        return null;
    } catch (e) {
        console.error("❌ ImgBB Upload Error:", e.message);
        return null;
    }
}

export async function postToFacebook(imageSource, caption) {
    if (!PAGE_ID || !ACCESS_TOKEN) return null;

    const url = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/photos`;
    let retries = 3;
    let backoff = 2000;
    
    // Status penanda fallback
    let isFallbackMode = false;
    let fallbackImageUrl = null;

    for (let i = 0; i < retries; i++) {
        try {
            const form = new FormData();
            form.append('access_token', ACCESS_TOKEN);
            form.append('message', caption);
            form.append('published', 'true');

            if (Buffer.isBuffer(imageSource)) {
                // Kalo udah masuk mode fallback, kirim URL ImgBB-nya ke Facebook
                if (isFallbackMode && fallbackImageUrl) {
                    form.append('url', fallbackImageUrl);
                } else {
                    // Percobaan pertama: Direct Upload
                    form.append('source', imageSource, { 
                        filename: 'alexiacard.png', 
                        contentType: 'image/png',
                        knownLength: imageSource.length 
                    });
                }
            } else {
                form.append('url', imageSource);
            }

            const response = await fetch(url, { 
                method: 'POST', 
                body: form,
                headers: form.getHeaders() 
            });
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(`FB API Rejected: ${data.error?.message || response.statusText}`);
            }

            if (data.id) {
                console.log(`✅ Successfully posted to FB! ID: ${data.id} ${isFallbackMode ? '(via ImgBB)' : '(Direct)'}`);
                return data.id; 
            }
            return null;

        } catch (error) {
            console.warn(`⚠️ [FB Retry] Attempt ${i + 1} failed: ${error.message}`);
            
            // 🔥 OTOMATIS NYALA KALO FB NGASIH ERROR 400
            if (!isFallbackMode && Buffer.isBuffer(imageSource)) {
                console.log("🔄 Mengaktifkan Mode Fallback ImgBB...");
                fallbackImageUrl = await uploadToImgBB(imageSource);
                if (fallbackImageUrl) {
                    isFallbackMode = true; // Ubah status biar percobaan berikutnya pake link
                }
            }

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