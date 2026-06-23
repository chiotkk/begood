import crypto from 'node:crypto';
import { FoodLog, HealthLog, PhysiologicalLog } from '@/types';
import { getLlmConfigFingerprint } from '@/lib/llm';

export interface InsightRange {
  days: number;
  start: number;
  end: number;
}

export interface DailyInsightSummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: string[];
  symptoms: { category: string; avgIntensity: number; count: number; notes: string[] }[];
}

export interface InsightCandidate {
  label: string;
  metric: string;
  symptomCategory: string;
  direction: 'positive' | 'negative' | 'mixed';
  supportDays: number;
  detail: string;
}

export interface InsightPrep {
  range: InsightRange;
  logCounts: { food: number; physiological: number; total: number };
  daily: DailyInsightSummary[];
  candidates: InsightCandidate[];
  lowData: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function makeInsightRange(days: number): InsightRange {
  const safeDays = [7, 14, 30].includes(days) ? days : 7;
  const end = Date.now();
  const start = end - safeDays * DAY_MS;
  return { days: safeDays, start, end };
}

function dateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function compactNote(note: string): string {
  return note.trim().replace(/\s+/g, ' ').slice(0, 120);
}

export function prepareInsightInput(logs: HealthLog[], range: InsightRange): InsightPrep {
  const relevant = logs.filter((log) => log.timestamp >= range.start && log.timestamp <= range.end);
  const days = new Map<string, { foods: FoodLog[]; symptoms: PhysiologicalLog[] }>();

  for (let i = range.days - 1; i >= 0; i--) {
    const key = dateKey(range.end - i * DAY_MS);
    days.set(key, { foods: [], symptoms: [] });
  }

  relevant.forEach((log) => {
    const key = dateKey(log.timestamp);
    if (!days.has(key)) return;
    const bucket = days.get(key)!;
    if (log.type === 'FOOD') bucket.foods.push(log);
    if (log.type === 'PHYSIOLOGICAL') bucket.symptoms.push(log);
  });

  const daily = Array.from(days.entries()).map(([date, bucket]) => {
    const symptomGroups = new Map<string, PhysiologicalLog[]>();
    bucket.symptoms.forEach((symptom) => {
      const list = symptomGroups.get(symptom.category) || [];
      list.push(symptom);
      symptomGroups.set(symptom.category, list);
    });

    return {
      date,
      calories: Math.round(bucket.foods.reduce((sum, food) => sum + Number(food.calories || 0), 0)),
      protein: Math.round(bucket.foods.reduce((sum, food) => sum + Number(food.protein || 0), 0)),
      carbs: Math.round(bucket.foods.reduce((sum, food) => sum + Number(food.carbs || 0), 0)),
      fat: Math.round(bucket.foods.reduce((sum, food) => sum + Number(food.fat || 0), 0)),
      foods: bucket.foods.slice(0, 8).map((food) => food.name).filter(Boolean),
      symptoms: Array.from(symptomGroups.entries()).map(([category, group]) => ({
        category,
        avgIntensity: average(group.map((item) => Number(item.intensity || 0))) || 0,
        count: group.length,
        notes: group.map((item) => compactNote(item.notes || '')).filter(Boolean).slice(0, 4),
      })),
    };
  });

  const foodCount = relevant.filter((log) => log.type === 'FOOD').length;
  const physiologicalCount = relevant.filter((log) => log.type === 'PHYSIOLOGICAL').length;

  return {
    range,
    logCounts: { food: foodCount, physiological: physiologicalCount, total: relevant.length },
    daily,
    candidates: extractCandidates(daily),
    lowData: foodCount < 2 || physiologicalCount < 2,
  };
}

function extractCandidates(daily: DailyInsightSummary[]): InsightCandidate[] {
  const metrics: Array<keyof Pick<DailyInsightSummary, 'calories' | 'protein' | 'carbs' | 'fat'>> = ['calories', 'protein', 'carbs', 'fat'];
  const categories = Array.from(new Set(daily.flatMap((day) => day.symptoms.map((symptom) => symptom.category))));
  const candidates: InsightCandidate[] = [];

  categories.forEach((category) => {
    metrics.forEach((metric) => {
      const paired = daily
        .map((day) => {
          const symptom = day.symptoms.find((item) => item.category === category);
          return symptom ? { metricValue: Number(day[metric] || 0), intensity: symptom.avgIntensity } : null;
        })
        .filter((item): item is { metricValue: number; intensity: number } => Boolean(item));

      if (paired.length < 2) return;

      const avgMetric = average(paired.map((item) => item.metricValue)) || 0;
      const avgIntensity = average(paired.map((item) => item.intensity)) || 0;
      const highMetric = paired.filter((item) => item.metricValue >= avgMetric && item.intensity >= avgIntensity).length;
      const lowMetric = paired.filter((item) => item.metricValue < avgMetric && item.intensity >= avgIntensity).length;
      const direction = highMetric > lowMetric ? 'positive' : lowMetric > highMetric ? 'negative' : 'mixed';

      candidates.push({
        label: `${metric} vs ${category.toLowerCase()} intensity`,
        metric,
        symptomCategory: category,
        direction,
        supportDays: paired.length,
        detail: `${paired.length} day(s) include both ${metric} and ${category.toLowerCase()} logs; ${highMetric} high-${metric} day(s) and ${lowMetric} lower-${metric} day(s) also had above-average symptom intensity.`,
      });
    });
  });

  return candidates
    .sort((a, b) => b.supportDays - a.supportDays)
    .slice(0, 6);
}

export function makeInsightCacheKey(prep: InsightPrep): string {
  const payload = JSON.stringify({
    version: 1,
    role: getLlmConfigFingerprint('analysis'),
    range: { days: prep.range.days, startDay: dateKey(prep.range.start), endDay: dateKey(prep.range.end) },
    daily: prep.daily,
    candidates: prep.candidates,
    lowData: prep.lowData,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}
