'use client';

import { useState } from 'react';
import { X, Frown, Activity, Battery, BatteryWarning, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';
import { PhysiologicalType } from '@/types';

export function LogSymptomModal({ 
  onClose, 
  onSave 
}: { 
  onClose: () => void; 
  onSave: (data: any) => void;
}) {
  const [category, setCategory] = useState<PhysiologicalType>('MOOD');
  const [intensity, setIntensity] = useState<number>(5);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    onSave({
      category,
      intensity,
      notes
    });
    toast.success('Check-in saved!');
    onClose();
  };

  const categories: { type: PhysiologicalType, label: string, icon: any, color: string }[] = [
    { type: 'MOOD', label: 'Mood', icon: Frown, color: 'text-purple-500' },
    { type: 'PAIN', label: 'Pain', icon: Activity, color: 'text-red-500' },
    { type: 'DISCOMFORT', label: 'Discomfort', icon: HeartPulse, color: 'text-orange-500' },
    { type: 'ENERGY', label: 'Energy', icon: Battery, color: 'text-yellow-500' },
    { type: 'DIGESTION', label: 'Digestion', icon: BatteryWarning, color: 'text-emerald-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">Physiological Check-in</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What are you tracking?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((c) => (
                <button
                  key={c.type}
                  onClick={() => setCategory(c.type)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                    category === c.type 
                      ? 'border-blue-500 bg-blue-50/50' 
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <c.icon className={`w-6 h-6 mb-1 ${c.color}`} />
                  <span className="text-[11px] font-medium text-gray-600">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
              <span>Intensity</span>
              <span className="font-bold text-blue-600">{intensity} / 10</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
              <span>Mild / Low</span>
              <span>Severe / High</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none h-24"
              placeholder="How are you feeling right now?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Save Check-in
          </button>
        </div>
      </div>
    </div>
  );
}
