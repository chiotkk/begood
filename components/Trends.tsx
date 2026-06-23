'use client';

import { HealthLog } from '@/types';
import { apiPath } from '@/lib/client-api';
import { useMemo, useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Bar, Legend, ComposedChart, Line
} from 'recharts';

interface InsightResponse {
  cached?: boolean;
  generatedAt?: string;
  lowData?: boolean;
  summary?: string;
  candidates?: Array<{ label?: string; explanation?: string; confidence?: string; detail?: string }>;
  nextSteps?: string[];
  disclaimer?: string;
}

export function Trends({ logs }: { logs: HealthLog[] }) {
  const [days, setDays] = useState(7);
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

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

  async function requestInsights(force = false) {
    setIsLoadingInsights(true);
    setInsightError(null);

    try {
      const response = await fetch(apiPath('/api/insights'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, force }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'AI insights are unavailable.');
      setInsights(data);
      toast.success(data.cached ? 'Loaded cached AI insights.' : 'AI insights updated.');
    } catch (error: any) {
      setInsightError(error?.message || 'AI insights are unavailable.');
      toast.error(error?.message || 'AI insights are unavailable.');
    } finally {
      setIsLoadingInsights(false);
    }
  }

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
          onChange={(e) => {
            setDays(Number(e.target.value));
            setInsights(null);
            setInsightError(null);
          }}
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

      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center text-blue-700 font-semibold">
              <Sparkles className="w-5 h-5 mr-2" />
              AI Insights
            </div>
            <p className="text-sm text-gray-500 mt-1">Explicit, cached trend analysis over compact log summaries only.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => requestInsights(false)}
              disabled={isLoadingInsights}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium flex items-center justify-center"
            >
              {isLoadingInsights ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Get AI Insights
            </button>
            <button
              onClick={() => requestInsights(true)}
              disabled={isLoadingInsights}
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium flex items-center justify-center"
              title="Bypass the cache and request a fresh analysis"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {insightError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {insightError}
          </div>
        )}

        {insights && (
          <div className="space-y-3 text-sm text-gray-700">
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <p className="font-medium text-blue-900">{insights.summary}</p>
              <p className="text-xs text-blue-700 mt-1">
                {insights.cached ? 'Served from cache' : 'Fresh analysis'}{insights.generatedAt ? ` • ${new Date(insights.generatedAt).toLocaleString()}` : ''}
              </p>
            </div>

            {Array.isArray(insights.candidates) && insights.candidates.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">Candidate patterns</h4>
                {insights.candidates.slice(0, 5).map((candidate, index) => (
                  <div key={`${candidate.label}-${index}`} className="rounded-lg border border-gray-100 p-3">
                    <div className="font-medium text-gray-800">{candidate.label || `Pattern ${index + 1}`}</div>
                    <p className="text-gray-600 mt-1">{candidate.explanation || candidate.detail}</p>
                    {candidate.confidence && <p className="text-xs text-gray-400 mt-1">Confidence: {candidate.confidence}</p>}
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(insights.nextSteps) && insights.nextSteps.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Next steps</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  {insights.nextSteps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}
                </ul>
              </div>
            )}

            <p className="text-xs text-gray-400">{insights.disclaimer || 'Exploratory wellness insight only; not medical advice.'}</p>
          </div>
        )}
      </section>
    </div>
  );
}
