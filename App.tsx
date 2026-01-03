import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllContent, getAllSources } from './services/contentService'; 
import { analyzeStories, refinePreferences } from './services/geminiService';
import { RawStory, EnrichedStory, UserPreferences, DEFAULT_PREFERENCES } from './types';
import NewsCard from './components/NewsCard';
import PreferencePanel from './components/PreferencePanel';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [enrichedStories, setEnrichedStories] = useState<EnrichedStory[]>([]);
  
  // Get static sources definition
  const allSources = getAllSources();
  
  // Source Filtering State - initialize with all source names
  const [selectedSources, setSelectedSources] = useState<string[]>(allSources.map(s => s.name));
  
  // Tag Filtering State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Initialize preferences from localStorage if available
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('mindfeed_preferences');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse saved preferences:", e);
    }
    return DEFAULT_PREFERENCES;
  });

  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string | number, 'liked' | 'disliked'>>({});
  const [isLearning, setIsLearning] = useState(false);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('mindfeed_preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Load initial data
  const loadDigest = useCallback(async () => {
    setLoading(true);
    setEnrichedStories([]);
    // Reset filters on reload usually makes sense, or keep them. Let's keep them but clear tags if empty result.
    try {
      // 1. Fetch from Multiple Sources (HN + Blogs)
      const rawStories: RawStory[] = await fetchAllContent();
      
      // 2. Process with Gemini
      const analyzed = await analyzeStories(rawStories, preferences);
      
      setEnrichedStories(analyzed);
    } catch (error) {
      console.error("Failed to load digest", error);
    } finally {
      setLoading(false);
    }
  }, [preferences]); 

  // Initial load
  useEffect(() => {
    loadDigest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleFeedback = async (id: string | number, type: 'liked' | 'disliked') => {
    // Optimistic UI update
    setFeedbackMap(prev => ({ ...prev, [id]: type }));

    // Trigger AI Learning
    setIsLearning(true);
    
    // Find the story details
    const story = enrichedStories.find(s => s.id === id);
    if (!story) return;

    const liked = type === 'liked' ? [story] : [];
    const disliked = type === 'disliked' ? [story] : [];

    // Call service to rewrite profile
    const newContext = await refinePreferences(preferences, liked, disliked);
    
    setPreferences(prev => ({
      ...prev,
      additionalContext: newContext
    }));
    
    setIsLearning(false);
  };

  // --- Filtering Logic ---
  const toggleSource = (sourceName: string) => {
    setSelectedSources(prev => {
      if (prev.includes(sourceName)) {
        return prev.filter(s => s !== sourceName);
      } else {
        return [...prev, sourceName];
      }
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  // Logic for double-click: Select ONLY this tag
  const handleSoloTag = (tag: string) => {
    setSelectedTags([tag]);
  };

  // Logic for double-click: Select ONLY this source
  const handleSoloSource = (sourceName: string) => {
    setSelectedSources([sourceName]);
  };

  const handleSelectAllSources = () => {
    setSelectedSources(allSources.map(s => s.name));
  };

  const handleInvertSourceSelection = () => {
    const allNames = allSources.map(s => s.name);
    setSelectedSources(prev => allNames.filter(n => !prev.includes(n)));
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  // 1. Calculate counts for Sources based on ALL enriched stories
  const sourceCounts: Record<string, number> = {};
  allSources.forEach(s => sourceCounts[s.name] = 0);
  enrichedStories.forEach(s => {
     if (sourceCounts[s.source] !== undefined) {
       sourceCounts[s.source]++;
     }
  });

  // 2. Intermediate Filter: Stories filtered by Source
  const storiesFilteredBySource = enrichedStories.filter(story => 
    selectedSources.includes(story.source)
  );

  // 3. Extract Tags from the Source-Filtered stories to show relevant tags
  const tagCounts: Record<string, number> = {};
  storiesFilteredBySource.forEach(story => {
    story.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  // Sort tags by frequency
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  // 4. Final Filter: Stories filtered by Source AND Tags
  const finalFilteredStories = storiesFilteredBySource.filter(story => {
    if (selectedTags.length === 0) return true;
    // OR logic for tags (show story if it has ANY of the selected tags)
    return story.tags.some(tag => selectedTags.includes(tag));
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl shadow-lg shadow-brand-200">
              M
            </div>
            <h1 className="text-xl font-serif font-bold text-gray-900">MindFeed <span className="text-brand-600">AI</span></h1>
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={() => loadDigest()} 
              disabled={loading}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
              {loading ? "正在搜集..." : "刷新日报"}
            </button>
            
            <button 
              onClick={() => setIsPrefsOpen(true)}
              className="relative p-2 text-gray-500 hover:text-brand-600 transition-colors rounded-full hover:bg-brand-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              {isLearning && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white"></span>}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 flex-grow">
        
        <div className="mb-6 text-center sm:text-left">
          <p className="text-sm font-medium text-brand-600 uppercase tracking-wide mb-1">
            {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">您的每日精选</h2>
        </div>

        {/* Filter Container */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6 shadow-sm space-y-5">
          
          {/* 1. Source Filter */}
          <div>
            <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
              <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                数据源筛选
              </h3>
              <div className="flex gap-3 text-xs font-medium">
                <button onClick={handleSelectAllSources} className="text-brand-600 hover:text-brand-800 hover:underline">全选</button>
                <span className="text-gray-200">|</span>
                <button onClick={handleInvertSourceSelection} className="text-brand-600 hover:text-brand-800 hover:underline">反选</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allSources.map((source) => {
                const isSelected = selectedSources.includes(source.name);
                const count = sourceCounts[source.name] || 0;
                
                return (
                  <div 
                    key={source.name}
                    onClick={() => toggleSource(source.name)}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      handleSoloSource(source.name);
                    }}
                    title="单击切换，双击只看此源"
                    className={`
                      group flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg border text-xs transition-all cursor-pointer select-none
                      ${isSelected 
                        ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm ring-1 ring-brand-100' 
                        : 'bg-slate-50 border-slate-100 text-slate-400 grayscale hover:grayscale-0 hover:bg-white hover:border-slate-300'}
                    `}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors border ${isSelected ? 'bg-brand-500 border-brand-500' : 'bg-white border-slate-300'}`}>
                      {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    <span className="font-semibold">{source.name}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-brand-500/80' : 'text-slate-400'}`}>({count})</span>
                    <span className={`h-3 w-px mx-0.5 ${isSelected ? 'bg-brand-200' : 'bg-slate-200'}`}></span>
                    <a 
                      href={source.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`p-0.5 rounded-md transition-colors ${isSelected ? 'hover:bg-brand-200 text-brand-400 hover:text-brand-700' : 'hover:bg-slate-200 text-slate-300 hover:text-slate-500'}`}
                      title={`访问 ${source.name}`}
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Tag Filter */}
          {sortedTags.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
               <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  话题标签
                </h3>
                {selectedTags.length > 0 && (
                  <button onClick={handleClearTags} className="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline">
                    清除已选 ({selectedTags.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {sortedTags.map(([tag, count]) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        handleSoloTag(tag);
                      }}
                      title="单击切换，双击只看此标签"
                      className={`
                        px-2.5 py-1 rounded-full text-xs font-medium border transition-all select-none
                        ${isSelected 
                          ? 'bg-amber-100 border-amber-200 text-amber-800 shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-amber-200 hover:bg-amber-50'}
                      `}
                    >
                      #{tag}
                      <span className={`ml-1.5 opacity-60 ${isSelected ? 'text-amber-800' : 'text-gray-400'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Result Status */}
        {!loading && enrichedStories.length > 0 && (
           <div className="mb-6 flex items-center justify-between px-2">
             <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
               显示 {finalFilteredStories.length} 条内容 (共 {enrichedStories.length} 条)
             </span>
           </div>
        )}

        {loading && enrichedStories.length === 0 ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-6"></div>
                <div className="h-20 bg-gray-50 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
             {/* Empty State */}
            {!loading && enrichedStories.length > 0 && finalFilteredStories.length === 0 && (
               <div className="text-center py-16 bg-white rounded-xl border border-gray-100 border-dashed">
                 <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                 </div>
                 <p className="text-gray-500 font-medium">当前筛选条件下没有内容</p>
                 <div className="flex gap-4 justify-center mt-3">
                   {selectedTags.length > 0 && (
                      <button onClick={handleClearTags} className="text-brand-600 text-sm hover:underline">清除标签筛选</button>
                   )}
                   <button onClick={handleSelectAllSources} className="text-brand-600 text-sm hover:underline">重置数据源</button>
                 </div>
               </div>
            )}

            {finalFilteredStories.map((story) => (
              <NewsCard 
                key={story.id} 
                story={story} 
                onLike={(id) => handleFeedback(id, 'liked')}
                onDislike={(id) => handleFeedback(id, 'disliked')}
                feedbackStatus={feedbackMap[story.id] || null}
              />
            ))}
            
            {finalFilteredStories.length > 0 && (
               <div className="text-center py-12">
                 <p className="text-gray-400 mb-4">今天的日报就到这里了。</p>
                 <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-brand-600 font-medium hover:underline">回到顶部</button>
               </div>
            )}
          </div>
        )}

        {/* Floating Refresh for Mobile */}
        <button 
           onClick={() => loadDigest()}
           className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center z-10 active:scale-95 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
        </button>

      </main>

      {/* Simplified Footer */}
      <footer className="mt-auto py-8 border-t border-gray-200 bg-white">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="text-xs text-gray-300">
               Powered by Gemini 2.5 & React
            </div>
          </div>
      </footer>

      <PreferencePanel 
        isOpen={isPrefsOpen} 
        setIsOpen={setIsPrefsOpen} 
        preferences={preferences} 
        onUpdate={setPreferences}
        isLearning={isLearning}
      />
    </div>
  );
};

export default App;