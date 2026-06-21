'use client';

import { useState } from 'react';
import { useHealthData } from '@/hooks/use-health-data';
import { Dashboard } from '@/components/Dashboard';
import { LogFoodModal } from '@/components/LogFoodModal';
import { LogSymptomModal } from '@/components/LogSymptomModal';
import { Trends } from '@/components/Trends';
import { Toaster } from 'sonner';
import { Plus, Heart, Target, TrendingUp, Camera } from 'lucide-react';

export default function Home() {
  const { logs, isLoaded, addFoodLog, addPhysiologicalLog, deleteLog } = useHealthData();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TRENDS'>('DASHBOARD');
  
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showSymptomModal, setShowSymptomModal] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Heart className="w-10 h-10 text-rose-300 animate-bounce mb-4" />
          <p className="text-gray-500 font-medium">Loading Health Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 text-rose-500">
            <Heart className="w-6 h-6 fill-current" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900">NourishTrack</h1>
          </div>
          
          <nav className="flex space-x-1 border border-gray-200 rounded-xl p-1 bg-gray-50">
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'DASHBOARD' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('TRENDS')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'TRENDS' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Trends
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'DASHBOARD' ? (
          <Dashboard logs={logs} onDelete={deleteLog} />
        ) : (
          <Trends logs={logs} />
        )}
      </main>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-6 left-0 right-0 px-4 z-40 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto shadow-xl rounded-full bg-white border border-gray-200 flex items-center justify-between p-2">
          <button 
            onClick={() => setShowFoodModal(true)}
            className="flex-1 flex items-center justify-center py-3 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
          >
            <Camera className="w-5 h-5 mr-2" />
            Log Meal
          </button>
          <div className="w-px h-8 bg-gray-200"></div>
          <button 
            onClick={() => setShowSymptomModal(true)}
            className="flex-1 flex items-center justify-center py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Symptom Check-in
          </button>
        </div>
      </div>

      {/* Modals */}
      {showFoodModal && (
        <LogFoodModal 
          onClose={() => setShowFoodModal(false)}
          onSave={addFoodLog}
        />
      )}
      
      {showSymptomModal && (
        <LogSymptomModal
          onClose={() => setShowSymptomModal(false)}
          onSave={addPhysiologicalLog}
        />
      )}
    </div>
  );
}
