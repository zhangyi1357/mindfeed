import { RawStory } from '../types';

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';
// Using rss2json which is more reliable for CORS and parsing than raw proxies
const RSS2JSON_BASE = 'https://api.rss2json.com/v1/api.json?rss_url=';

interface FeedConfig {
  name: string;
  url: string;
  webUrl: string;
}

const BLOG_FEEDS: FeedConfig[] = [
  // Existing High Quality Feeds
  { name: 'Andrej Karpathy', url: 'https://karpathy.github.io/feed.xml', webUrl: 'https://karpathy.github.io/' },
  { name: '科学空间 (Su Jianlin)', url: 'https://kexue.fm/feed', webUrl: 'https://kexue.fm/' },
  { name: 'OpenAI Blog', url: 'https://openai.com/index/rss.xml', webUrl: 'https://openai.com/news/' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', webUrl: 'https://huggingface.co/blog' },

  // New AI Model Sources (Gemini, Qwen, etc.)
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', webUrl: 'https://deepmind.google/blog/' }, // Covers Gemini
  { name: 'Qwen Blog', url: 'https://qwenlm.github.io/feed.xml', webUrl: 'https://qwenlm.github.io/' }, // Qwen Team
  { name: 'Synced Review', url: 'https://syncedreview.com/feed/', webUrl: 'https://syncedreview.com/' }, // Covers DeepSeek, Kimi, GLM, etc.
  
  // Robotics & Embodied AI
  { name: 'IEEE Robotics', url: 'https://spectrum.ieee.org/feeds/topic/robotics.rss', webUrl: 'https://spectrum.ieee.org/robotics' },
  { name: 'BAIR (Berkeley)', url: 'https://bair.berkeley.edu/blog/feed.xml', webUrl: 'https://bair.berkeley.edu/blog/' },
  { name: 'MIT Robotics', url: 'https://news.mit.edu/rss/topic/robotics', webUrl: 'https://news.mit.edu/topic/robotics' },
  { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/', webUrl: 'https://blogs.nvidia.com/' },
];

export const ALL_SOURCES_CONFIG = [
  { name: 'Hacker News', webUrl: 'https://news.ycombinator.com/' },
  ...BLOG_FEEDS.map(f => ({ name: f.name, webUrl: f.webUrl }))
];

export const getAllSources = () => ALL_SOURCES_CONFIG;

// Safe hash for ID generation to avoid btoa unicode issues
const generateId = (prefix: string, str: string) => {
  let hash = 0;
  if (str.length === 0) return prefix + '0';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${prefix}-${Math.abs(hash).toString(16)}`;
};

// --- Hacker News Fetcher ---
const fetchHNStories = async (limit: number = 10): Promise<RawStory[]> => {
  try {
    const idsResponse = await fetch(`${HN_BASE_URL}/topstories.json`);
    const ids = await idsResponse.json();
    const topIds = ids.slice(0, limit);

    const storyPromises = topIds.map(async (id: number) => {
      const storyRes = await fetch(`${HN_BASE_URL}/item/${id}.json`);
      return storyRes.json();
    });

    const stories = await Promise.all(storyPromises);
    
    return stories
      .filter((s: any) => s && s.type === 'story' && s.url)
      .map((s: any) => ({
        // Prefix ID to avoid collisions
        id: `hn-${s.id}`,
        title: s.title,
        url: s.url,
        source: 'Hacker News',
        author: s.by,
        score: s.score,
        publishDate: new Date(s.time * 1000).toISOString()
      }));

  } catch (error) {
    console.error('Error fetching HN:', error);
    return [];
  }
};

// --- RSS Fetcher (via rss2json) ---
const fetchRSSFeed = async (config: FeedConfig): Promise<RawStory[]> => {
  try {
    // The rss2json API handles fetching and parsing on their server, avoiding browser CORS issues
    const response = await fetch(`${RSS2JSON_BASE}${encodeURIComponent(config.url)}`);
    const data = await response.json();
    
    if (data.status === 'ok' && Array.isArray(data.items)) {
      return data.items.map((item: any) => ({
        // Use safe hash for ID to prevent crashes on Chinese characters
        id: generateId('rss', item.link || item.title),
        title: item.title,
        url: item.link,
        source: config.name,
        publishDate: item.pubDate,
        author: item.author
      })).slice(0, 2); // Limit to top 2 items per feed to avoid overwhelming the digest with too many sources
    }
    
    return [];
  } catch (error) {
    console.warn(`Failed to fetch RSS for ${config.name}:`, error);
    return [];
  }
};

// --- Main Aggregator ---
export const fetchAllContent = async (): Promise<RawStory[]> => {
  // 1. Fetch HN
  const hnPromise = fetchHNStories(12);

  // 2. Fetch Blogs
  const blogPromises = BLOG_FEEDS.map(config => fetchRSSFeed(config));

  // 3. Wait for all
  const [hnStories, ...blogStories] = await Promise.all([hnPromise, ...blogPromises]);

  // Flatten blog stories
  const allBlogStories = blogStories.flat();

  // Combine
  let combined = [...allBlogStories, ...hnStories];

  // Shuffle slightly so blogs aren't always at the top or bottom
  combined = combined.sort(() => Math.random() - 0.5);

  return combined;
};