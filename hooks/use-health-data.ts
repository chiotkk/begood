'use client';

import { useState, useEffect, useCallback } from 'react';
import { HealthLog, FoodLog, PhysiologicalLog } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'health_tracker_logs';

export function useHealthData() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setLogs(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load logs:', e);
      } finally {
        setIsLoaded(true);
      }
    });
  }, []);

  const saveLogs = useCallback((newLogs: HealthLog[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
    } catch (e) {
      console.error('Failed to save logs:', e);
    }
  }, []);

  const addFoodLog = useCallback((data: Omit<FoodLog, 'id' | 'timestamp' | 'type'>) => {
    const newLog: FoodLog = {
      ...data,
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'FOOD',
    };
    saveLogs([newLog, ...logs]);
    return newLog;
  }, [logs, saveLogs]);

  const addPhysiologicalLog = useCallback((data: Omit<PhysiologicalLog, 'id' | 'timestamp' | 'type'>) => {
    const newLog: PhysiologicalLog = {
      ...data,
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'PHYSIOLOGICAL',
    };
    saveLogs([newLog, ...logs]);
    return newLog;
  }, [logs, saveLogs]);

  const deleteLog = useCallback((id: string) => {
    saveLogs(logs.filter(log => log.id !== id));
  }, [logs, saveLogs]);

  return {
    logs,
    isLoaded,
    addFoodLog,
    addPhysiologicalLog,
    deleteLog,
  };
}
