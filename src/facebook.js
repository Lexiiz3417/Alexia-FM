// src/facebook.js 

import fetch from "node-fetch";

const API_VERSION = process.env.FACEBOOK_API_VERSION || 'v23.0';

export const postToFacebook = async (imageUrl, message) => {
  const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!PAGE_ID) {
    console.warn("❗ FACEBOOK_PAGE_ID not found. Facebook post skipped.");
    return null; 
  }

  try {
    const body = new URLSearchParams({
      url: imageUrl,
      caption: message,
      access_token: ACCESS_TOKEN,
    });

    const postRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/photos`,
      {
        method: "POST",
        body: body,
      }
    );

    const postData = await postRes.json();
    if (!postRes.ok || !postData.post_id) {
      console.error("❌ Failed to post to Facebook feed:", postData);
      return null;
    }

    console.log("✅ Successfully posted to Facebook feed! post_id:", postData.post_id);
    return postData.post_id;

  } catch (err) {
    console.error("❌ Major error during Facebook post:", err);
    return null;
  }
};

export const commentOnPost = async (postId, message) => {
  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

  try {
    const body = new URLSearchParams({
        message,
        access_token: ACCESS_TOKEN,
    });
      
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${postId}/comments`, {
      method: "POST",
      body: body,
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Failed to add comment:", data);
      return;
    }

    console.log("💬 Successfully added engagement comment to Facebook post!");
  } catch (err) {
    console.error("❌ Error while trying to comment on Facebook:", err);
  }
};