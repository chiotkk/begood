import { NextRequest, NextResponse } from 'next/server';
import { getInsightCache, listLogs, setInsightCache } from '@/lib/db';
import { makeInsightCacheKey, makeInsightRange, prepareInsightInput } from '@/lib/insights';
import { extractJsonObject, LlmConfigurationError, runLlmRole } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const range = makeInsightRange(Number(body.days || 7));
    const force = Boolean(body.force);
    const prep = prepareInsightInput(listLogs(), range);
    const cacheKey = makeInsightCacheKey(prep);

    if (!force) {
      const cached = getInsightCache(cacheKey);
      if (cached) return NextResponse.json({ ...cached, cached: true });
    }

    if (prep.lowData) {
      const payload = {
        cached: false,
        generatedAt: new Date().toISOString(),
        lowData: true,
        summary: 'Not enough paired food and symptom logs yet for useful AI trend analysis.',
        candidates: prep.candidates,
        nextSteps: ['Log at least a few meals and symptom/mood/energy/pain check-ins across multiple days, then refresh AI insights.'],
        disclaimer: 'Exploratory wellness insight only; not medical advice or a causality claim.',
        prep,
      };
      setInsightCache(cacheKey, range.days, payload);
      return NextResponse.json(payload);
    }

    const prompt = `You are helping a wellness tracker user explore possible relationships between food intake and symptom/mood/energy/pain logs. Use only the compact JSON summary. Do not claim medical diagnosis or causality. Return ONLY JSON with keys: summary (string), lowData (boolean), candidates (array of {label, explanation, confidence}), nextSteps (array of strings), disclaimer (string). Be concise and honest about weak data.`;
    const llmText = await runLlmRole('analysis', [
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(prep) },
    ]);
    const parsed = extractJsonObject(llmText);
    const payload = {
      cached: false,
      generatedAt: new Date().toISOString(),
      lowData: Boolean(parsed.lowData),
      summary: String(parsed.summary || 'AI insight generated.'),
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : prep.candidates,
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
      disclaimer: String(parsed.disclaimer || 'Exploratory wellness insight only; not medical advice or a causality claim.'),
      prep,
    };

    setInsightCache(cacheKey, range.days, payload);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Failed to generate insights:', error);
    const status = error instanceof LlmConfigurationError ? 503 : 500;
    return NextResponse.json({ error: error.message || 'AI insights are unavailable right now.' }, { status });
  }
}
