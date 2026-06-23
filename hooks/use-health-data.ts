'use client';

import { useState, useEffect, useCallback } from 'react';
import { HealthLog, FoodLog, PhysiologicalLog } from '@/types';
import { apiPath } from '@/lib/client-api';

export function useHealthData() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      const response = await fetch(apiPath('/api/logs'), { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load logs');
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error('Failed to load logs:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const addFoodLog = useCallback(async (data: Omit<FoodLog, 'id' | 'timestamp' | 'type'>) => {
    const response = await fetch(apiPath('/api/logs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'FOOD', data }),
    });
    if (!response.ok) throw new Error('Failed to save food log');
    const { log } = await response.json();
    setLogs((current) => [log, ...current]);
    return log as FoodLog;
  }, []);

  const addPhysiologicalLog = useCallback(async (data: Omit<PhysiologicalLog, 'id' | 'timestamp' | 'type'>) => {
    const response = await fetch(apiPath('/api/logs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PHYSIOLOGICAL', data }),
    });
    if (!response.ok) throw new Error('Failed to save physiological log');
    const { log } = await response.json();
    setLogs((current) => [log, ...current]);
    return log as PhysiologicalLog;
  }, []);

  const deleteLog = useCallback(async (id: string) => {
    const previousLogs = logs;
    setLogs((current) => current.filter(log => log.id !== id));

    try {
      const response = await fetch(apiPath(`/api/logs/${id}`), { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete log');
    } catch (e) {
      console.error('Failed to delete log:', e);
      setLogs(previousLogs);
    }
  }, [logs]);

  return {
    logs,
    isLoaded,
    addFoodLog,
    addPhysiologicalLog,
    deleteLog,
  };
}
