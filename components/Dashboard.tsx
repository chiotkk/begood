'use client';

import { HealthLog, FoodLog, PhysiologicalLog } from '@/types';
import { Activity, Flame, Utensils, Droplets, Salad } from 'lucide-react';
import { useMemo } from 'react';

function getTodayStats(logs: HealthLog[]) {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  
  const todayFoodLogs = logs.filter(
    (log): log is FoodLog => log.type === 'FOOD' && log.timestamp >= startOfToday
  );
  
  return todayFoodLogs.reduce(
    (acc, log) => {
      acc.calories += log.calories;
      acc.protein += log.protein;
      acc.carbs += log.carbs;
      acc.fat += log.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function Dashboard({ logs, onDelete }: { logs: HealthLog[], onDelete: (id: string) => void }) {
  const todayStats = useMemo(() => getTodayStats(logs), [logs]);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center text-orange-500 mb-2">
            <Flame className="w-5 h-5 mr-2" />
            <span className="font-semibold text-sm">Calories</span>
          </div>
          <span className="text-2xl font-bold text-gray-800">{Math.round(todayStats.calories)}</span>
          <span className="text-xs text-gray-500 mt-1">kcal today</span>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center text-red-500 mb-2">
            <Utensils className="w-5 h-5 mr-2" />
            <span className="font-semibold text-sm">Protein</span>
          </div>
          <span className="text-2xl font-bold text-gray-800">{Math.round(todayStats.protein)}g</span>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center text-green-500 mb-2">
            <Salad className="w-5 h-5 mr-2" />
            <span className="font-semibold text-sm">Carbs</span>
          </div>
          <span className="text-2xl font-bold text-gray-800">{Math.round(todayStats.carbs)}g</span>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center text-yellow-500 mb-2">
            <Droplets className="w-5 h-5 mr-2" />
            <span className="font-semibold text-sm">Fat</span>
          </div>
          <span className="text-2xl font-bold text-gray-800">{Math.round(todayStats.fat)}g</span>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg text-gray-800 mb-4">Recent Logs</h3>
        {logs.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-500">
            No logs yet. Add your first meal or physiological check-in.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${log.type === 'FOOD' ? 'bg-orange-100 text-orange-500' : 'bg-blue-100 text-blue-500'}`}>
                    {log.type === 'FOOD' ? <Utensils className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {log.type === 'FOOD' ? log.name : `${log.category} Check-in`}
                    </h4>
                    <p className="text-sm text-gray-500 text-left">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
                      {log.type === 'FOOD' ? 
                        ` ${Math.round(log.calories)} kcal` : 
                        ` Intensity: ${log.intensity}/10`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(log.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
