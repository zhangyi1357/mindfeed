// Unified Raw Story Interface
export interface RawStory {
  id: string | number; // String for RSS guids, number for HN
  title: string;
  url: string;
  source: string; // e.g., "Hacker News", "Karpathy Blog"
  author?: string;
  publishDate?: string;
  score?: number; // Optional, specific to HN
}

// Hacker News Story Interface
export interface HNStory {
  id: number;
  title: string;
  url: string;
  by: string;
  time: number;
  score: number;
  type: string;
  descendants?: number;
  kids?: number[];
}

// Processed Story with AI enrichment
export interface EnrichedStory extends RawStory {
  aiSummary: string; 
  aiAbstract: string; 
  relevanceScore: number; 
  recommendationReason: string;
  tags: string[];
}

export interface UserPreferences {
  topics: string[];
  blockedKeywords: string[];
  complexityLevel: 'beginner' | 'intermediate' | 'expert';
  tone: 'neutral' | 'enthusiastic' | 'critical';
  additionalContext: string; 
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  topics: ['机器人', '具身智能', '大模型', 'AI Agents', 'AI Coding', '系统架构', 'C++', '重大新闻'],
  blockedKeywords: ['政治', '娱乐八卦', '低俗内容'],
  complexityLevel: 'expert', 
  tone: 'neutral',
  additionalContext: '我是一名软件工程师，专注于机器人、具身智能、大模型、AI Agents、AI Coding、系统架构设计和 C/C++。我也关注全球重大新闻事件。请优先推荐高质量、有深度、具有技术洞察力的内容。',
};