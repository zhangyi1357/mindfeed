import React from 'react';
import { EnrichedStory } from '../types';

interface NewsCardProps {
  story: EnrichedStory;
  onLike: (id: string | number) => void;
  onDislike: (id: string | number) => void;
  feedbackStatus: 'liked' | 'disliked' | null;
}

const NewsCard: React.FC<NewsCardProps> = ({ story, onLike, onDislike, feedbackStatus }) => {
  // Extract domain for display
  let domain = '';
  try {
    if (story.url) {
      domain = new URL(story.url).hostname.replace('www.', '');
    }
  } catch (e) {
    // ignore invalid URLs
  }

  const isHN = story.source === 'Hacker News';

  const scoreColor = story.relevanceScore > 80 ? 'bg-green-100 text-green-800 border-green-200' :
                     story.relevanceScore > 50 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                     'bg-gray-100 text-gray-600 border-gray-200';

  const sourceColor = isHN 
    ? 'bg-orange-50 text-orange-700 border-orange-100' // Hacker News Style
    : 'bg-purple-50 text-purple-700 border-purple-100'; // Blog Style

  return (
    <article className={`relative p-6 rounded-xl border transition-all duration-300 ${feedbackStatus ? 'opacity-50' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-wrap gap-2 items-center">
            {/* Relevance Score */}
            <div className={`px-2 py-0.5 rounded text-xs font-bold border ${scoreColor}`}>
              {story.relevanceScore}% 匹配度
            </div>
            
            {/* Source Badge - Always Visible */}
            <div className={`px-2 py-0.5 rounded text-xs font-bold border flex items-center gap-1 ${sourceColor}`}>
                {isHN && (
                   <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-0.5"></span>
                )}
                {!isHN && (
                   <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-0.5"></span>
                )}
                {story.source}
            </div>
        </div>
        
        {/* Domain Display */}
        {domain && (
            <span className="text-xs text-gray-400 font-medium hidden sm:inline-block truncate max-w-[120px]" title={domain}>
                {domain}
            </span>
        )}
      </div>

      <h3 className="text-xl font-serif font-bold text-gray-900 mb-3 leading-tight">
        <a href={story.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 hover:underline decoration-2 underline-offset-2">
          {story.title}
        </a>
      </h3>

      {/* Short Summary (TL;DR) */}
      <div className="mb-4 bg-gray-50 p-3 rounded-lg border-l-4 border-brand-500">
        <p className="text-gray-800 text-sm font-medium leading-relaxed">
          <span className="text-brand-600 font-bold uppercase text-xs mr-2 tracking-wide">TL;DR</span>
          {story.aiSummary}
        </p>
      </div>

      {/* Detailed Abstract */}
      <div className="text-gray-600 text-sm mb-5 leading-7 text-justify border-b border-gray-100 pb-5">
        <p>{story.aiAbstract}</p>
      </div>

      {/* Recommendation Reason */}
      <div className="flex items-start gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 mt-0.5 shrink-0"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 15.5v.01"></path><path d="M12 12v.01"></path></svg>
        <p className="text-xs text-slate-500 italic">
          推荐理由: {story.recommendationReason}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-wrap gap-2">
          {story.tags.map(tag => (
            <span key={tag} className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">#{tag}</span>
          ))}
        </div>
        
        <div className="flex gap-2">
           <button 
            onClick={() => onDislike(story.id)}
            disabled={!!feedbackStatus}
            className={`p-2 rounded-full transition-colors ${feedbackStatus === 'disliked' ? 'bg-red-100 text-red-600' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
            title="减少此类内容"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
          </button>
          <button 
            onClick={() => onLike(story.id)}
            disabled={!!feedbackStatus}
            className={`p-2 rounded-full transition-colors ${feedbackStatus === 'liked' ? 'bg-brand-100 text-brand-600' : 'hover:bg-brand-50 text-gray-400 hover:text-brand-600'}`}
            title="更多此类内容"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          </button>
        </div>
      </div>
    </article>
  );
};

export default NewsCard;