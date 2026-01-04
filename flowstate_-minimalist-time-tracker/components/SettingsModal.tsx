import React from 'react';
import { Settings } from '../types';

interface SettingsModalProps {
  settings: Settings;
  onUpdate: (settings: Settings) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transition-colors duration-300 border border-gray-100 dark:border-slate-800">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center transition-colors duration-300">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block">Appearance</label>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl transition-colors duration-300">
              <button 
                onClick={() => onUpdate({ ...settings, theme: 'light' })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${settings.theme === 'light' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-200 dark:text-blue-700' : 'text-slate-500'}`}
              >
                Light
              </button>
              <button 
                onClick={() => onUpdate({ ...settings, theme: 'dark' })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${settings.theme === 'dark' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block">Flowmodoro Break Divisor</label>
            <p className="text-xs text-gray-500">Break length = Work duration / Divisor (Default: 5)</p>
            <input 
              type="number"
              min="1"
              max="20"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all transition-colors duration-300"
              value={settings.flowDivisor}
              onChange={(e) => onUpdate({ ...settings, flowDivisor: parseInt(e.target.value) || 5 })}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block">Idle Detection Threshold (m)</label>
            <p className="text-xs text-gray-500">Flag sessions longer than this for review (Default: 180)</p>
            <input 
              type="number"
              min="10"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all transition-colors duration-300"
              value={settings.idleThresholdMinutes}
              onChange={(e) => onUpdate({ ...settings, idleThresholdMinutes: parseInt(e.target.value) || 180 })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block">Enable Streaks</label>
              <p className="text-xs text-gray-500">Track daily consecutive usage</p>
            </div>
            <button 
              onClick={() => onUpdate({ ...settings, showStreaks: !settings.showStreaks })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.showStreaks ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showStreaks ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-slate-800 transition-colors duration-300">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block">Overwork Guardrails (Daily Target)</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Min Focus (m)</span>
                <input 
                  type="number"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all transition-colors duration-300"
                  value={settings.dailyMinWorkMinutes}
                  onChange={(e) => onUpdate({ ...settings, dailyMinWorkMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Max Limit (m)</span>
                <input 
                  type="number"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all transition-colors duration-300"
                  value={settings.dailyMaxWorkMinutes}
                  onChange={(e) => onUpdate({ ...settings, dailyMaxWorkMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex justify-end transition-colors duration-300">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;