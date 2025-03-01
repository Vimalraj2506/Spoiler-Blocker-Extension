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
  console.log(`🔍 Collecting spoilers for mediaId: ${mediaId}`);
  // Placeholder function - Add logic to fetch spoilers from Reddit
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
