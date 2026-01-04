import React, { useState } from 'react';
import { Category } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { generateId } from '../utils';

interface SidebarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  onAddCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onRenameCategory: (id: string, name: string, color?: string) => void;
  onOpenSettings: () => void;
  onOpenCalendar: () => void;
  streak: number;
  longestStreak: number;
  showStreaks: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory,
  onRenameCategory,
  onOpenSettings,
  onOpenCalendar,
  streak,
  longestStreak,
  showStreaks
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = () => {
    if (!newCatName.trim()) return;
    const color = CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
    onAddCategory({ id: generateId(), name: newCatName.trim(), color });
    setNewCatName('');
    setIsAdding(false);
  };

  const getFlameColor = () => {
    if (streak >= 30) return 'text-red-600 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    if (streak >= 7) return 'text-orange-500 drop-shadow-[0_0_4px_rgba(249,115,22,0.3)]';
    return 'text-orange-400';
  };

  return (
    <div className="w-full md:w-72 bg-white dark:bg-slate-900 h-full border-r border-gray-100 dark:border-slate-800 flex flex-col p-6 overflow-y-auto transition-colors duration-300">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">FlowState</h1>
      </div>

      {showStreaks && (
        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className={`text-2xl transition-all duration-500 ${getFlameColor()}`}>🔥</span>
              <div>
                <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">Current Streak</p>
                <p className="text-xl font-black text-orange-900 dark:text-orange-100 leading-none">{streak} Days</p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-orange-200/50 dark:border-orange-800/50 flex justify-between items-center">
             <span className="text-[10px] text-orange-700 dark:text-orange-300 font-bold uppercase">Best: {longestStreak}d</span>
          </div>
        </div>
      )}

      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Categories</h2>
          <button 
            onClick={() => setIsAdding(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </button>
        </div>

        <div className="space-y-1">
          {categories.map((cat) => (
            <div key={cat.id} className="group relative">
              {editingId === cat.id ? (
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl space-y-3 border border-gray-200 dark:border-slate-700">
                  <input
                    autoFocus
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg outline-none"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_COLORS.map(c => (
                      <button 
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full border-2 ${editColor === c ? 'border-gray-800 dark:border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        onRenameCategory(cat.id, editName, editColor);
                        setEditingId(null);
                      }}
                      className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-1.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onSelectCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    selectedCategoryId === cat.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm' 
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium text-sm truncate">{cat.name}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(cat.id);
                        setEditName(cat.name);
                        setEditColor(cat.color);
                      }}
                      className="p-1 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    {categories.length > 1 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCategory(cat.id);
                        }}
                        className="p-1 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </button>
              )}
            </div>
          ))}

          {isAdding && (
            <div className="p-1">
              <input
                autoFocus
                className="w-full px-4 py-2 text-sm border-2 border-blue-200 dark:border-blue-900/30 rounded-xl outline-none bg-white dark:bg-slate-800 dark:text-white"
                placeholder="Category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onBlur={handleAdd}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 space-y-2">
        <button 
          onClick={onOpenCalendar}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
          <span className="font-medium text-sm">History View</span>
        </button>
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="font-medium text-sm">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;