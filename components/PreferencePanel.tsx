import React, { useState } from 'react';
import { UserPreferences } from '../types';

interface PreferencePanelProps {
  preferences: UserPreferences;
  onUpdate: (newPrefs: UserPreferences) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isLearning: boolean;
}

const PreferencePanel: React.FC<PreferencePanelProps> = ({ preferences, onUpdate, isOpen, setIsOpen, isLearning }) => {
  const [localContext, setLocalContext] = useState(preferences.additionalContext);
  const [newTopic, setNewTopic] = useState('');

  const handleSave = () => {
    onUpdate({
      ...preferences,
      additionalContext: localContext
    });
  };

  const addTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopic && !preferences.topics.includes(newTopic)) {
      onUpdate({
        ...preferences,
        topics: [...preferences.topics, newTopic]
      });
      setNewTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    onUpdate({
      ...preferences,
      topics: preferences.topics.filter(t => t !== topic)
    });
  };

  return (
    <>
      {/* Mobile Toggle */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto border-l border-gray-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif font-bold text-gray-900">个人偏好设置</h2>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="space-y-6">
            
            {/* AI Learning Indicator */}
            <div className={`p-4 rounded-lg border ${isLearning ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${isLearning ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`}></div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">AI 学习状态</span>
              </div>
              <p className="text-sm text-slate-600">
                {isLearning ? "正在根据您的反馈优化画像..." : "画像已激活。多与内容互动以提高推荐精准度。"}
              </p>
            </div>

            {/* Topics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">感兴趣的话题</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {preferences.topics.map(topic => (
                  <span key={topic} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 group">
                    {topic}
                    <button onClick={() => removeTopic(topic)} className="ml-1.5 text-brand-400 hover:text-brand-900 focus:outline-none">×</button>
                  </span>
                ))}
              </div>
              <form onSubmit={addTopic} className="flex gap-2">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="添加话题 (如: Rust)"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
                <button type="submit" className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 transition-colors">+</button>
              </form>
            </div>

            {/* Persona Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">详细画像 (AI 上下文)</label>
              <textarea
                value={localContext}
                onChange={(e) => setLocalContext(e.target.value)}
                onBlur={handleSave}
                rows={6}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none leading-relaxed"
                placeholder="描述您想看到的内容..."
              />
              <p className="mt-1 text-xs text-gray-500">您可以直接编辑，或让 AI 在您浏览时自动更新。</p>
            </div>

            {/* Complexity & Tone Controls (Visual only for this demo mostly, but passed to AI) */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">内容深度</label>
               <select 
                value={preferences.complexityLevel}
                onChange={(e) => onUpdate({...preferences, complexityLevel: e.target.value as any})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none bg-white"
               >
                 <option value="beginner">入门友好</option>
                 <option value="intermediate">中级</option>
                 <option value="expert">专家 / 深度</option>
               </select>
            </div>

          </div>
        </div>
      </div>
      
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
};

export default PreferencePanel;