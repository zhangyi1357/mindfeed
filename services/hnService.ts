import { HNStory } from '../types';

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

export const fetchTopStories = async (limit: number = 20): Promise<HNStory[]> => {
  try {
    // 1. Get IDs
    const idsResponse = await fetch(`${HN_BASE_URL}/topstories.json`);
    const ids = await idsResponse.json();
    
    // 2. Slice to limit
    const topIds = ids.slice(0, limit);

    // 3. Fetch details in parallel
    const storyPromises = topIds.map(async (id: number) => {
      const storyRes = await fetch(`${HN_BASE_URL}/item/${id}.json`);
      return storyRes.json();
    });

    const stories = await Promise.all(storyPromises);
    
    // Filter out items that aren't stories or don't have URLs (optional, but good for a news reader)
    return stories.filter((s: any) => s && s.type === 'story' && s.url) as HNStory[];

  } catch (error) {
    console.error('Error fetching Hacker News stories:', error);
    return [];
  }
};