import { NextResponse } from 'next/server';
import { deleteLog } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteLog(id);
  return NextResponse.json({ ok: true });
}
