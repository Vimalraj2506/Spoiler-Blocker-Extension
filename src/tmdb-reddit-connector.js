// src/tmdb-reddit-connector.js
console.log("🚀 Starting TMDB-Reddit Connector...");
console.log("🔍 Checking environment variables...");

require('dotenv').config();
const axios = require('axios');
const firebase = require('firebase-admin');

// Validate environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID', 
  'FIREBASE_CLIENT_EMAIL', 
  'FIREBASE_PRIVATE_KEY',
  'TMDB_API_KEY',
  'REDDIT_CLIENT_ID',
  'REDDIT_CLIENT_SECRET',
  'REDDIT_USERNAME',
  'REDDIT_PASSWORD'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ ${envVar} is missing!`);
    process.exit(1);
  }
}

console.log("✅ All environment variables are loaded correctly.");

// Initialize Firebase Admin SDK if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp({
    credential: firebase.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const db = firebase.firestore();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REDDIT_USER_AGENT = 'SpoilerBlocker/1.0';
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USERNAME = process.env.REDDIT_USERNAME;
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD;

// Cache for Reddit access token
let redditAccessToken = null;
let tokenExpiry = 0;

/**
 * Get Reddit access token with better error handling and retry logic
 */
async function getRedditAccessToken() {
  // Check if token exists and is still valid (with 5-minute buffer)
  if (redditAccessToken && tokenExpiry > (Date.now() + 300000)) {
    return redditAccessToken;
  }
  
  try {
    console.log("🔑 Getting new Reddit access token...");
    
    // Encode username and password for URL
    const encodedUsername = encodeURIComponent(REDDIT_USERNAME);
    const encodedPassword = encodeURIComponent(REDDIT_PASSWORD);
    
    const response = await axios({
      method: 'post',
      url: 'https://www.reddit.com/api/v1/access_token',
      auth: {
        username: REDDIT_CLIENT_ID,
        password: REDDIT_CLIENT_SECRET
      },
      data: `grant_type=password&username=${encodedUsername}&password=${encodedPassword}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': REDDIT_USER_AGENT
      }
    });
    
    if (response.data && response.data.access_token) {
      redditAccessToken = response.data.access_token;
      tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      console.log("✅ Reddit access token obtained");
      return redditAccessToken;
    } else {
      throw new Error('Invalid response from Reddit API');
    }
  } catch (error) {
    console.error('❌ Failed to get Reddit access token:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    
    // Wait before retrying
    console.log('⏱️ Waiting 10 seconds before retrying...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Retry once more
    try {
      console.log("🔄 Retrying Reddit access token request...");
      const retryResponse = await axios({
        method: 'post',
        url: 'https://www.reddit.com/api/v1/access_token',
        auth: {
          username: REDDIT_CLIENT_ID,
          password: REDDIT_CLIENT_SECRET
        },
        data: `grant_type=password&username=${encodedUsername}&password=${encodedPassword}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': REDDIT_USER_AGENT
        }
      });
      
      redditAccessToken = retryResponse.data.access_token;
      tokenExpiry = Date.now() + (retryResponse.data.expires_in * 1000);
      console.log("✅ Reddit access token obtained on retry");
      return redditAccessToken;
    } catch (retryError) {
      console.error('❌ Failed to get Reddit access token on retry:', retryError.message);
      throw new Error('Could not authenticate with Reddit after retry');
    }
  }
}

/**
 * Search Reddit for media discussions with improved search terms
 */
async function searchRedditForMedia(mediaTitle, mediaType) {
  try {
    const token = await getRedditAccessToken();
    
    // Sanitize the title by removing special characters and extra spaces
    const sanitizedTitle = mediaTitle.replace(/[^\w\s]/gi, '').trim();
    
    // Create search query with quotes for exact match and media type
    const searchQuery = `"${sanitizedTitle}" ${mediaType === 'movie' ? 'movie' : 'tv show'}`;
    console.log(`🔍 Searching Reddit for: ${searchQuery}`);
    
    const subreddits = mediaType === 'movie' 
      ? 'movies+MovieDetails+MovieSuggestions'
      : 'television+TVDetails+TVSuggestions';
    
    const response = await axios.get('https://oauth.reddit.com/search', {
      params: {
        q: searchQuery,
        sort: 'relevance',
        limit: 15,
        t: 'year',
        restrict_sr: 'on',
        sr: subreddits
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': REDDIT_USER_AGENT
      }
    });
    
    if (response.data && response.data.data && response.data.data.children) {
      console.log(`Found ${response.data.data.children.length} Reddit posts for "${mediaTitle}"`);
      return response.data.data.children;
    } else {
      console.log(`No Reddit posts found for "${mediaTitle}"`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error searching Reddit for ${mediaTitle}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    return [];
  }
}

/**