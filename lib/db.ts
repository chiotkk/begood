import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { HealthLog } from '@/types';

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const dbPath = process.env.SQLITE_PATH || path.join(dataDir, 'begood.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS health_logs (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('FOOD', 'PHYSIOLOGICAL')),
    payload TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_health_logs_timestamp
  ON health_logs(timestamp DESC);

  CREATE TABLE IF NOT EXISTS insight_cache (
    cache_key TEXT PRIMARY KEY,
    range_days INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    payload TEXT NOT NULL
  );
`);

function rowToLog(row: { payload: string }): HealthLog {
  return JSON.parse(row.payload) as HealthLog;
}

export function listLogs(): HealthLog[] {
  const rows = db
    .prepare('SELECT payload FROM health_logs ORDER BY timestamp DESC')
    .all() as { payload: string }[];
  return rows.map(rowToLog);
}

export function insertLog(log: HealthLog): HealthLog {
  db.prepare(`
    INSERT OR REPLACE INTO health_logs (id, timestamp, type, payload)
    VALUES (@id, @timestamp, @type, @payload)
  `).run({
    id: log.id,
    timestamp: log.timestamp,
    type: log.type,
    payload: JSON.stringify(log),
  });
  return log;
}

export function deleteLog(id: string): boolean {
  const result = db.prepare('DELETE FROM health_logs WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getDatabasePath(): string {
  return dbPath;
}


export function getInsightCache(cacheKey: string): any | null {
  const row = db
    .prepare('SELECT payload FROM insight_cache WHERE cache_key = ?')
    .get(cacheKey) as { payload: string } | undefined;
  return row ? JSON.parse(row.payload) : null;
}

export function setInsightCache(cacheKey: string, rangeDays: number, payload: any): any {
  db.prepare(`
    INSERT OR REPLACE INTO insight_cache (cache_key, range_days, created_at, payload)
    VALUES (@cacheKey, @rangeDays, @createdAt, @payload)
  `).run({
    cacheKey,
    rangeDays,
    createdAt: Date.now(),
    payload: JSON.stringify(payload),
  });
  return payload;
}
