import React, { useState } from 'react';
import { formatDurationFull } from '../utils';

interface SessionCompleteModalProps {
  allTags: string[];
  distractionPresets: string[];
  onSave: (data: { rating: number; tags: string[]; distractions: string[]; distractionNote: string }) => void;
  onUpdateAllTags: (tags: string[]) => void;
  onUpdateDistractionPresets: (presets: string[]) => void;
  onCancel: () => void;
  totalDuration: number;
  segmentCount: number;
}

const SessionCompleteModal: React.FC<SessionCompleteModalProps> = ({ 
  allTags, 
  distractionPresets,
  onSave, 
  onUpdateAllTags,
  onUpdateDistractionPresets,
  onCancel, 
  totalDuration, 
  segmentCount 
}) => {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDistractions, setSelectedDistractions] = useState<string[]>([]);
  const [distractionNote, setDistractionNote] = useState('');
  
  const [newTagInput, setNewTagInput] = useState('');
  const [newDistInput, setNewDistInput] = useState('');

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleDistraction = (d: string) => {
    setSelectedDistractions(prev => prev.includes(d) ? prev.filter(item => item !== d) : [...prev, d]);
  };

  const addTagOption = () => {
    const val = newTagInput.trim();
    if (val && !allTags.includes(val)) {
      onUpdateAllTags([...allTags, val]);
      setNewTagInput('');
    }
  };

  const removeTagOption = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    onUpdateAllTags(allTags.filter(t => t !== tag));
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const addDistOption = () => {
    const val = newDistInput.trim();
    if (val && !distractionPresets.includes(val)) {
      onUpdateDistractionPresets([...distractionPresets, val]);
      setNewDistInput('');
    }
  };

  const removeDistOption = (e: React.MouseEvent, dist: string) => {
    e.stopPropagation();
    onUpdateDistractionPresets(distractionPresets.filter(d => d !== dist));
    setSelectedDistractions(prev => prev.filter(d => d !== dist));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col">
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Session Complete!</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">How was your focus during this block?</p>
          </div>

          {/* Session Stats Summary */}
          <div className="flex gap-4 justify-center">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex-1 text-center border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Focused</p>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400">{formatDurationFull(totalDuration)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex-1 text-center border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Work Blocks</p>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400">{segmentCount}</p>
            </div>
          </div>

          <div className="flex justify-center space-x-3">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => setRating(num)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${
                  rating >= num ? 'bg-amber-400 text-white shadow-lg shadow-amber-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {num <= rating ? '⭐' : '☆'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Tags</label>
              <div className="flex items-center space-x-1">
                <input 
                  type="text" 
                  placeholder="New tag..." 
                  className="px-2 py-1 text-[10px] bg-slate-50 dark:bg-slate-800 border-none outline-none rounded-lg dark:text-white"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTagOption()}
                />
                <button onClick={addTagOption} className="text-blue-600 font-bold text-[10px] px-2">Add</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`group relative px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all flex items-center space-x-2 ${
                    selectedTags.includes(tag) 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-slate-100 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <span>{tag}</span>
                  <span 
                    onClick={(e) => removeTagOption(e, tag)}
                    className="opacity-0 group-hover:opacity-100 ml-1 text-[10px] hover:text-red-300"
                  >
                    ✕
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Any Distractions?</label>
              <div className="flex items-center space-x-1">
                <input 
                  type="text" 
                  placeholder="New option..." 
                  className="px-2 py-1 text-[10px] bg-slate-50 dark:bg-slate-800 border-none outline-none rounded-lg dark:text-white"
                  value={newDistInput}
                  onChange={(e) => setNewDistInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDistOption()}
                />
                <button onClick={addDistOption} className="text-red-600 font-bold text-[10px] px-2">Add</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {distractionPresets.map(d => (
                <button
                  key={d}
                  onClick={() => toggleDistraction(d)}
                  className={`group relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                    selectedDistractions.includes(d) 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <span>{d}</span>
                  <span 
                    onClick={(e) => removeDistOption(e, d)}
                    className="opacity-0 group-hover:opacity-100 ml-1 text-[10px] hover:text-red-800"
                  >
                    ✕
                  </span>
                </button>
              ))}
            </div>
            <textarea
              placeholder="Optional distraction note..."
              className="w-full mt-2 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              value={distractionNote}
              onChange={(e) => setDistractionNote(e.target.value)}
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Skip
            </button>
            <button
              onClick={() => onSave({ rating, tags: selectedTags, distractions: selectedDistractions, distractionNote })}
              className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all"
            >
              Save Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionCompleteModal;