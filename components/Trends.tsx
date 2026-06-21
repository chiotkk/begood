'use client';

import { HealthLog, FoodLog, PhysiologicalLog } from '@/types';
import { useMemo, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart
} from 'recharts';

export function Trends({ logs }: { logs: HealthLog[] }) {
  const [days, setDays] = useState(7);

  const chartData = useMemo(() => {
    // Generate an array of dates up to N days ago
    const dataMap: Record<string, any> = {};
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      dataMap[dateStr] = {
        date: dateStr,
        calories: 0,
        mood: null,
        moodCount: 0,
        pain: null,
        painCount: 0
      };
    }

    logs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const dayData = dataMap[dateStr];
      if (!dayData) return;

      if (log.type === 'FOOD') {
        dayData.calories += log.calories;
      } else if (log.type === 'PHYSIOLOGICAL') {
        if (log.category === 'MOOD') {
          dayData.mood = (dayData.mood || 0) + log.intensity;
          dayData.moodCount += 1;
        } else if (log.category === 'PAIN') {
          dayData.pain = (dayData.pain || 0) + log.intensity;
          dayData.painCount += 1;
        }
      }
    });

    return Object.values(dataMap).map(d => ({
      ...d,
      calories: Math.round(d.calories),
      moodAvg: d.moodCount > 0 ? Number((d.mood / d.moodCount).toFixed(1)) : null,
      painAvg: d.painCount > 0 ? Number((d.pain / d.painCount).toFixed(1)) : null,
    }));
  }, [logs, days]);

  if (logs.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
        Not enough log data to show trends. Log a few meals and symptoms!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800">Health Correlations</h3>
        <select 
          value={days} 
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-sm border-gray-200 rounded-lg p-2 focus:ring-blue-500 outline-none cursor-pointer"
        >
          <option value={7}>Last 7 Days</option>
          <option value={14}>Last 14 Days</option>
          <option value={30}>Last 30 Days</option>
        </select>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[400px]">
        <h4 className="text-sm font-medium text-gray-500 mb-4 text-center">Calories vs Mood/Pain Intensity</h4>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
            <RechartsTooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              cursor={{ fill: '#f9fafb' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
            
            <Bar yAxisId="left" dataKey="calories" name="Calories" fill="#fde047" radius={[4, 4, 0, 0]} barSize={24} />
            <Line yAxisId="right" type="monotone" dataKey="moodAvg" name="Avg Mood (1-10)" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="painAvg" name="Avg Pain (1-10)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
