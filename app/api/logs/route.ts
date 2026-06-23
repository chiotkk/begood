import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { insertLog, listLogs } from '@/lib/db';
import { FoodLog, HealthLog, PhysiologicalLog } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FoodInput = Omit<FoodLog, 'id' | 'timestamp' | 'type'>;
type PhysiologicalInput = Omit<PhysiologicalLog, 'id' | 'timestamp' | 'type'>;

export async function GET() {
  return NextResponse.json({ logs: listLogs() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type !== 'FOOD' && body.type !== 'PHYSIOLOGICAL') {
      return NextResponse.json({ error: 'Invalid log type' }, { status: 400 });
    }

    const log: HealthLog = body.type === 'FOOD'
      ? ({
          ...(body.data as FoodInput),
          id: uuidv4(),
          timestamp: Date.now(),
          type: 'FOOD',
        } as FoodLog)
      : ({
          ...(body.data as PhysiologicalInput),
          id: uuidv4(),
          timestamp: Date.now(),
          type: 'PHYSIOLOGICAL',
        } as PhysiologicalLog);

    return NextResponse.json({ log: insertLog(log) }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create log:', error);
    return NextResponse.json({ error: error.message || 'Failed to create log' }, { status: 500 });
  }
}
