console.log("🚀 Starting TMDB-Reddit Connector...");
console.log("🔍 Checking environment variables...");

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

// TMDB and Reddit connector for Spoiler Database
const axios = require('axios');
const firebase = require('firebase-admin');
require('dotenv').config();

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
  // Step 1: Fetch latest movies and TV shows
  const mediaItems = await fetchLatestMedia();
  console.log(`✅ Fetched ${mediaItems.length} media items from TMDB`);
  
  // Step 2: Store media in Firestore
  const mediaIds = await storeMediaInFirestore(mediaItems);
  console.log(`✅ Stored ${mediaIds.length} media items in Firestore`);
  
  // Step 3: Collect spoilers for each media item
  for (const mediaId of mediaIds) {
    await collectSpoilers(mediaId);
  }
  
  console.log('✅ Database update completed');
}

/**
 * Fetch latest movies and TV shows from TMDB
 */
async function fetchLatestMedia() {
  const allMedia = [];
  const currentYear = new Date().getFullYear();
  
  // Fetch both movies and TV shows for current and previous year
  for (const year of [currentYear, currentYear - 1]) {
    for (const mediaType of ['movie', 'tv']) {
      try {
        // Different params for movies vs TV shows
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
          // Add media type to each item
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
    const mediaType = item.media_type;
    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;
    
    // Create document reference
    const mediaRef = db.collection('media').doc();
    addedIds.push(mediaRef.id);
    
    // Extract keywords from title and overview
    const keywords = extractKeywords(title, item.overview || '');
    
    // Store media data
    batch.set(mediaRef, {
      tmdbId: item.id,
      title: title,
      mediaType: mediaType,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      overview: item.overview || '',
      popularity: item.popularity || 0,
      posterPath: item.poster_path || null,
      keywords: keywords.map(k => ({ 
        text: k, 
        isCharacter: false, 
        isPlotElement: false 
      })),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Create search index
    const searchableTitle = title.toLowerCase().replace(/[^\w\s]/g, '');
    if (searchableTitle) {
      const searchRef = db.collection('searchIndex').doc('titles').collection(searchableTitle).doc(mediaRef.id);
      batch.set(searchRef, { mediaId: mediaRef.id, tmdbId: item.id });
    }
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
 * Extract keywords from title and overview
 */
function extractKeywords(title, overview) {
  const keywords = [title];
  
  // Extract character names (simplified approach)
  const possibleCharacters = overview.match(/\b[A-Z][a-z]+\b/g) || [];
  for (const character of possibleCharacters) {
    if (character.length > 3 && !keywords.includes(character)) {
      keywords.push(character);
    }
  }
  
  return keywords;
}

/**
 * Authenticate with Reddit API
 */
async function authenticateReddit() {
  // Check if we already have a valid token
  if (redditAccessToken && Date.now() < tokenExpiry) {
    return redditAccessToken;
  }

  try {
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
    // Set expiry to slightly before actual expiry time
    tokenExpiry = Date.now() + (response.data.expires_in * 900); 
    return redditAccessToken;
  } catch (error) {
    console.error('❌ Error authenticating with Reddit:', error.message);
    throw error;
  }
}

/**
 * Search Reddit for posts about a specific media
 */
async function searchReddit(searchTerm, subreddit = 'all', limit = 10) {
  try {
    const token = await authenticateReddit();
    
    // URL encode the search term and add spoiler filter
    const encodedSearch = encodeURIComponent(`${searchTerm} (spoiler OR spoilers OR ending)`);
    const subredditUrl = subreddit === 'all' ? '/r/all' : `/r/${subreddit}`;
    
    const response = await axios({
      method: 'get',
      url: `https://oauth.reddit.com${subredditUrl}/search?q=${encodedSearch}&restrict_sr=on&limit=${limit}&sort=relevance`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': REDDIT_USER_AGENT
      }
    });

    return response.data.data.children.map(child => child.data);
  } catch (error) {
    console.error(`❌ Error searching Reddit for "${searchTerm}":`, error.message);
    return [];
  }
}

/**
 * Extract potential spoilers from Reddit posts
 */
function extractSpoilers(posts) {
  const spoilers = [];

  for (const post of posts) {
    // Skip posts without relevant content
    if (!post.selftext && !post.title.toLowerCase().includes('spoiler')) {
      continue;
    }

    // Check if post contains spoiler markers
    const isSpoilerPost = post.spoiler || 
                          post.title.toLowerCase().includes('spoiler') ||
                          post.link_flair_text?.toLowerCase().includes('spoiler');
    
    if (isSpoilerPost) {
      spoilers.push({
        type: 'post',
        title: post.title,
        content: post.selftext || post.title,
        url: `https://www.reddit.com${post.permalink}`,
        author: post.author,
        score: post.score,
        created: new Date(post.created_utc * 1000),
        subreddit: post.subreddit
      });
    }
  }

  return spoilers;
}

/**
 * Collect spoilers for a specific media item
 */
async function collectSpoilers(mediaId) {
  try {
    // Get media data
    const mediaDoc = await db.collection('media').doc(mediaId).get();
    if (!mediaDoc.exists) {
      console.warn(`Media document ${mediaId} not found`);
      return;
    }
    
    const media = mediaDoc.data();
    console.log(`Collecting spoilers for ${media.title} (${media.mediaType})`);
    
    // Search terms (title and first 3 keywords)
    const searchTerms = [
      media.title,
      ...(media.keywords.slice(0, 3).map(k => k.text))
    ];
    
    const allSpoilers = [];
    
    // Search in relevant subreddits
    const relevantSubreddits = media.mediaType === 'movie' 
      ? ['movies', 'MovieDetails', 'MovieSpoilers'] 
      : ['television', 'TVDetails', 'TVSpoilers'];
      
    // Search for each term in each subreddit
    for (const searchTerm of searchTerms) {
      for (const subreddit of relevantSubreddits) {
        const posts = await searchReddit(searchTerm, subreddit, 5);
        const spoilers = extractSpoilers(posts);
        allSpoilers.push(...spoilers);
        
        // Avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Filter out duplicates
    const uniqueSpoilers = allSpoilers.filter((spoiler, index, self) =>
      index === self.findIndex(s => s.url === spoiler.url)
    );
    
    console.log(`Found ${uniqueSpoilers.length} unique spoilers for ${media.title}`);
    
    // Store spoilers in Firestore
    const batch = db.batch();
    
    for (const spoiler of uniqueSpoilers) {
      const spoilerRef = db.collection('spoilers').doc();
      batch.set(spoilerRef, {
        mediaId: mediaId,
        tmdbId: media.tmdbId,
        source: 'reddit',
        content: spoiler.content,
        title: spoiler.title,
        sourceUrl: spoiler.url,
        author: spoiler.author,
        score: spoiler.score,
        subreddit: spoiler.subreddit,
        collectedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    console.log(`✅ Stored ${uniqueSpoilers.length} spoilers for ${media.title}`);
    
    // Extract additional keywords from spoilers
    if (uniqueSpoilers.length > 0) {
      await extractKeywordsFromSpoilers(mediaId, uniqueSpoilers);
    }
    
  } catch (error) {
    console.error(`❌ Error collecting spoilers for media ${mediaId}:`, error);
  }
}

/**
 * Extract additional keywords from spoilers
 */
async function extractKeywordsFromSpoilers(mediaId, spoilers) {
  try {
    // Get current media data
    const mediaDoc = await db.collection('media').doc(mediaId).get();
    if (!mediaDoc.exists) return;
    
    const media = mediaDoc.data();
    const existingKeywords = media.keywords.map(k => k.text.toLowerCase());
    
    // Combine all spoiler content
    let allContent = spoilers.map(s => s.content).join(' ');
    
    // Very basic keyword extraction - could be improved with NLP
    const words = allContent.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Count word frequency
    const wordCounts = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Filter out common words and get top keywords
    const commonWords = ['this', 'that', 'there', 'they', 'their', 'would', 'could', 'about'];
    const potentialKeywords = Object.entries(wordCounts)
      .filter(([word, count]) => 
        !commonWords.includes(word) && 
        count > 3 && 
        !existingKeywords.includes(word.toLowerCase())
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
    
    // Add new keywords to the media document
    if (potentialKeywords.length > 0) {
      const newKeywords = potentialKeywords.map(text => ({
        text,
        isCharacter: false,
        isPlotElement: true
      }));
      
      await db.collection('media').doc(mediaId).update({
        keywords: firebase.firestore.FieldValue.arrayUnion(...newKeywords)
      });
      
      console.log(`✅ Added ${newKeywords.length} new keywords to ${media.title}`);
    }
    
  } catch (error) {
    console.error(`❌ Error extracting keywords from spoilers for media ${mediaId}:`, error);
  }
}

// Export main function
module.exports = {
  updateDatabase,
  fetchLatestMedia,
  storeMediaInFirestore,
  collectSpoilers
};

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