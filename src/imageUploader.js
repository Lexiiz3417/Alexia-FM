// src/imageUploader.js
import fetch from 'node-fetch';
import FormData from 'form-data';

// Ganti nama fungsinya jadi uploadToImgbb
export async function uploadToImgbb(imageBuffer) {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    console.warn("❗ IMGBB_API_KEY not found. Cannot upload image. Skipping.");
    return null;
  }
  
  if (!imageBuffer) {
      console.warn("🟡 Image buffer is empty. Skipping upload.");
      return null;
  }

  try {
    console.log("🚀 Uploading processed image to imgbb...");
    const form = new FormData();
    form.append('image', imageBuffer.toString('base64'));

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: form,
    });

    const data = await response.json();
    if (data.success) {
      console.log(`✅ Image successfully uploaded to imgbb: ${data.data.url}`);
      return data.data.url;
    } else {
      console.error('❌ Failed to upload to imgbb:', data.error.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Major error during imgbb upload:', error);
    return null;
  }
}