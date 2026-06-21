export type LogType = 'FOOD' | 'PHYSIOLOGICAL';

export interface BaseLog {
  id: string;
  timestamp: number;
  type: LogType;
}

export interface FoodLog extends BaseLog {
  type: 'FOOD';
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  barcode?: string;
}

export type PhysiologicalType = 'MOOD' | 'PAIN' | 'DISCOMFORT' | 'ENERGY' | 'DIGESTION';

export interface PhysiologicalLog extends BaseLog {
  type: 'PHYSIOLOGICAL';
  category: PhysiologicalType;
  intensity: number; // 1 to 10
  notes: string;
}

export type HealthLog = FoodLog | PhysiologicalLog;

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  avgMood: number | null;
  avgPain: number | null;
  avgEnergy: number | null;
}
