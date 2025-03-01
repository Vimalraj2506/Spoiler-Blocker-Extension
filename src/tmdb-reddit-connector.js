// src/tmdb-reddit-connector.js
console.log("🚀 Starting TMDB-Reddit Connector...");
console.log("🔍 Checking environment variables...");

require('dotenv').config();
const axios = require('axios');
const firebase = require('firebase-admin');

if (!process.env.FIREBASE_PROJECT_ID) {
  console.error("❌ FIREBASE_PROJECT_ID is missing!");
  process.exit(1);
}
if (!process.env.FIREBASE_CLIENT_EMAIL) {
  console.error("❌ FIREBASE_CLIENT_EMAIL is missing!");
  process.exit(1);
}
if (!process.env.FIREBASE_PRIVATE_KEY) {
  console.error("❌ FIREBASE_PRIVATE_KEY is missing!");
  process.exit(1);
}
if (!process.env.TMDB_API_KEY) {
  console.error("❌ TMDB_API_KEY is missing!");
  process.exit(1);
}
if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
  console.error("❌ Reddit API credentials are missing!");
  process.exit(1);
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
 * Get Reddit access token
 */
async function getRedditAccessToken() {
  // Check if token exists and is still valid
  if (redditAccessToken && tokenExpiry > Date.now()) {
    return redditAccessToken;
  }
  
  try {
    console.log("🔑 Getting new Reddit access token...");
    const response = await axios({
      method: 'post',
      url: 'https://www.reddit.com/api/v1/access_token',
      auth: {
        username: REDDIT_CLIENT_ID,
        password: REDDIT_CLIENT_SECRET
      },
      data: `grant_type=password&username=${REDDIT_USERNAME}&password=${REDDIT_PASSWORD}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': REDDIT_USER_AGENT
      }
    });
    
    redditAccessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    console.log("✅ Reddit access token obtained");
    return redditAccessToken;
  } catch (error) {
    console.error('❌ Failed to get Reddit access token:', error.message);
    throw error;
  }
}

/**
 * Search Reddit for media discussions
 */
async function searchRedditForMedia(mediaTitle) {
  const token = await getRedditAccessToken();
  
  try {
    console.log(`🔍 Searching Reddit for: ${mediaTitle}`);
    const response = await axios.get('https://oauth.reddit.com/search', {
      params: {
        q: mediaTitle,
        sort: 'relevance',
        limit: 10,
        t: 'month'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': REDDIT_USER_AGENT
      }
    });
    
    return response.data.data.children;
  } catch (error) {
    console.error(`❌ Error searching Reddit for ${mediaTitle}:`, error.message);
    return [];
  }
}

/**
 * Fetch comments for a Reddit post
 */
async function fetchRedditComments(postId) {
  const token = await getRedditAccessToken();
  
  try {
    const response = await axios.get(`https://oauth.reddit.com/comments/${postId}`, {
      params: {
        limit: 100
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': REDDIT_USER_AGENT
      }
    });
    
    // Reddit returns an array with post data and comments
    if (response.data && response.data.length > 1) {
      return response.data[1].data.children.map(child => child.data);
    }
    
    return [];
  } catch (error) {
    console.error(`❌ Error fetching comments for post ${postId}:`, error.message);
    return [];
  }
}

/**
 * Check if text likely contains spoilers
 */
function hasSpoilerContent(text) {
  if (!text) return false;
  
  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Keywords that suggest spoiler content
  const spoilerKeywords = [
    'spoiler', 'reveal', 'twist', 'ending', 'dies', 'death', 'killed',
    'happens at the end', 'plot twist', 'surprised when', 'didn\'t expect',
    'reveals that', 'turned out to be', 'shocked when'
  ];
  
  return spoilerKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Main function to update the database with recent media and scrape spoilers
 */
async function updateDatabase() {
  try {
    const mediaItems = await fetchLatestMedia();
    console.log(`✅ Fetched ${mediaItems.length} media items from TMDB`);
    
    const mediaIds = await storeMediaInFirestore(mediaItems);
    console.log(`✅ Stored ${mediaIds.length} media items in Firestore`);
    
    for (const mediaId of mediaIds) {
      await collectSpoilers(mediaId);
    }
    
    console.log('✅ Database update completed');
  } catch (error) {
    console.error('❌ Error updating database:', error);
  }
}

/**
 * Fetch latest movies and TV shows from TMDB
 */
async function fetchLatestMedia() {
  const allMedia = [];
  const currentYear = new Date().getFullYear();
  
  for (const year of [currentYear, currentYear - 1]) {
    for (const mediaType of ['movie', 'tv']) {
      try {
        const dateParam = mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year';
        
        const url = `https://api.themoviedb.org/3/discover/${mediaType}`;
        const response = await axios.get(url, {
          params: {
            api_key: TMDB_API_KEY,
            [dateParam]: year,
            sort_by: 'popularity.desc',
            page: 1,
            include_adult: false
          }
        });
        
        if (response.data && response.data.results) {
          const mediaItems = response.data.results.map(item => ({
            ...item,
            media_type: mediaType
          }));
          
          allMedia.push(...mediaItems);
        }
      } catch (error) {
        console.error(`❌ Error fetching ${mediaType} from TMDB:`, error.message);
      }
    }
  }
  return allMedia;
}

/**
 * Store media items in Firestore
 */
async function storeMediaInFirestore(mediaItems) {
  const batch = db.batch();
  const addedIds = [];
  
  for (const item of mediaItems) {
    const mediaRef = db.collection('media').doc();
    addedIds.push(mediaRef.id);
    
    batch.set(mediaRef, {
      tmdbId: item.id,
      title: item.title || item.name,
      mediaType: item.media_type,
      releaseDate: item.release_date ? new Date(item.release_date) : null,
      popularity: item.popularity || 0,
      posterPath: item.poster_path || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  
  try {
    await batch.commit();
    return addedIds;
  } catch (error) {
    console.error('❌ Error storing media in Firestore:', error);
    return [];
  }
}

/**
 * Collect spoilers for a specific media item
 */
async function collectSpoilers(mediaId) {
  try {
    // Get media details from Firestore
    const mediaDoc = await db.collection('media').doc(mediaId).get();
    if (!mediaDoc.exists) {
      console.error(`Media with ID ${mediaId} not found`);
      return;
    }
    
    const mediaData = mediaDoc.data();
    console.log(`🔍 Collecting spoilers for: ${mediaData.title}`);
    
    // Search Reddit for posts about this media
    const redditPosts = await searchRedditForMedia(mediaData.title);
    console.log(`Found ${redditPosts.length} Reddit posts for ${mediaData.title}`);
    
    let spoilerCount = 0;
    
    // Process each post for potential spoilers
    for (const post of redditPosts) {
      const postData = post.data;
      
      // Check if post title or content contains spoilers
      const isSpoiler = postData.spoiler || // Reddit's spoiler tag
                        hasSpoilerContent(postData.title) || 
                        hasSpoilerContent(postData.selftext);
      
      if (isSpoiler) {
        // Store spoiler in Firestore
        await db.collection('spoilers').add({
          mediaId: mediaId,
          mediaTitle: mediaData.title,
          source: 'reddit',
          type: 'post',
          postId: postData.id,
          title: postData.title,
          text: postData.selftext || '',
          url: `https://reddit.com${postData.permalink}`,
          confidence: 0.8, // Arbitrary confidence score
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        spoilerCount++;
      }
      
      // Fetch and process comments for this post
      const comments = await fetchRedditComments(postData.id);
      console.log(`Analyzing ${comments.length} comments for post: ${postData.title}`);
      
      for (const comment of comments) {
        if (hasSpoilerContent(comment.body)) {
          // Store comment as spoiler
          await db.collection('spoilers').add({
            mediaId: mediaId,
            mediaTitle: mediaData.title,
            source: 'reddit',
            type: 'comment',
            postId: postData.id,
            commentId: comment.id,
            postTitle: postData.title,
            text: comment.body,
            url: `https://reddit.com${postData.permalink}${comment.id}`,
            confidence: 0.7, // Arbitrary confidence score
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          spoilerCount++;
        }
      }
    }
    
    console.log(`✅ Added ${spoilerCount} spoilers for ${mediaData.title}`);
  } catch (error) {
    console.error(`❌ Error collecting spoilers for media ${mediaId}:`, error.message);
  }
}

// Run directly if called as script
if (require.main === module) {
  updateDatabase()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  updateDatabase
};