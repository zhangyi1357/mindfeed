import { GoogleGenAI, Type, Schema } from "@google/genai";
import { RawStory, EnrichedStory, UserPreferences } from '../types';

const apiKey = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey });

export const analyzeStories = async (
  stories: RawStory[], 
  preferences: UserPreferences
): Promise<EnrichedStory[]> => {
  
  if (!stories.length) return [];

  const modelName = 'gemini-3-flash-preview'; 

  // Clean input for Token efficiency
  const storiesInput = stories.map(s => ({
    id: s.id,
    title: s.title,
    source: s.source,
    url: s.url
  }));

  const systemInstruction = `
    You are an intelligent news editor and personal curator. 
    Your goal is to analyze a list of technical articles from various sources (Blogs, Hacker News, etc.) and curate them for a user.
    
    User Profile:
    - Interested Topics: ${preferences.topics.join(', ')}
    - Blocked Keywords: ${preferences.blockedKeywords.join(', ')}
    - Preferred Complexity: ${preferences.complexityLevel}
    - User Context: ${preferences.additionalContext}

    IMPORTANT INSTRUCTION: 
    You MUST output a valid JSON object for EVERY story in the input list. 
    Do NOT skip any stories. 
    
    For "Relevance Score":
    - If the source is a specialized technical blog (e.g., Karpathy, Scientific Spaces), boost the score by default as these are high quality.
    - If the content matches the user's specific tech stack (Robot, Embodied AI), score it 90+.

    For each story, output in Simplified Chinese (简体中文):
    1. **Short Summary**: A concise, 1-sentence hook (TL;DR).
    2. **Abstract**: A detailed abstract-style summary (approx. 80-120 words).
    3. **Relevance Score**: 0-100.
    4. **Reason**: Why this is included (mention the Source quality if applicable).
    5. **Tags**: 2-3 short tags.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING }, // Changed to STRING to support RSS IDs
        aiSummary: { type: Type.STRING },
        aiAbstract: { type: Type.STRING },
        relevanceScore: { type: Type.INTEGER },
        recommendationReason: { type: Type.STRING },
        tags: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING } 
        }
      },
      required: ['id', 'aiSummary', 'aiAbstract', 'relevanceScore', 'recommendationReason', 'tags']
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: JSON.stringify(storiesInput),
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const analysisResults = JSON.parse(text);

    // Merge AI results back
    const enrichedStories: EnrichedStory[] = stories.map(story => {
      // Loose comparison for ID in case type mismatch (string vs number)
      const analysis = analysisResults.find((a: any) => String(a.id) === String(story.id));
      return {
        ...story,
        aiSummary: analysis?.aiSummary || "暂无简述",
        aiAbstract: analysis?.aiAbstract || "暂无详细摘要",
        relevanceScore: analysis?.relevanceScore || 10,
        recommendationReason: analysis?.recommendationReason || "热门科技内容",
        tags: analysis?.tags || []
      };
    });

    // Sort by relevance score descending
    return enrichedStories.sort((a, b) => b.relevanceScore - a.relevanceScore);

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Fallback
    return stories.map(s => ({
      ...s,
      aiSummary: "AI 分析暂不可用",
      aiAbstract: "无法获取详细摘要。",
      relevanceScore: 0,
      recommendationReason: "系统繁忙",
      tags: []
    }));
  }
};

export const refinePreferences = async (
  currentPrefs: UserPreferences,
  likedStories: EnrichedStory[],
  dislikedStories: EnrichedStory[]
): Promise<string> => {
  const prompt = `
    Current User Context: "${currentPrefs.additionalContext}"
    
    Interaction Data:
    LIKED: ${likedStories.map(s => `[${s.source}] ${s.title}`).join('; ')}
    DISLIKED: ${dislikedStories.map(s => `[${s.source}] ${s.title}`).join('; ')}
    
    Rewrite the 'User Context' to be more accurate. If they like technical blogs (Karpathy, etc.), emphasize deep learning theory.
    Output in Simplified Chinese.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || currentPrefs.additionalContext;
  } catch (e) {
    console.error("Failed to refine preferences", e);
    return currentPrefs.additionalContext;
  }
};