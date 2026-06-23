import { NextRequest, NextResponse } from 'next/server';
import { extractJsonObject, LlmConfigurationError, LlmMessage, runLlmRole } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, textInput } = await req.json();

    if (!imageBase64 && !textInput) {
      return NextResponse.json({ error: 'Provide at least an image or text input' }, { status: 400 });
    }

    const prompt = `You are a nutrition analysis API for a diet tracker. Estimate food nutrition from the provided image and/or text. Return ONLY a valid JSON object with this schema: {"name":"string","calories":number,"protein":number,"carbs":number,"fat":number}. If uncertain, provide a realistic estimate and do not include markdown.`;
    const content: LlmMessage['content'] = [{ type: 'text', text: prompt }];

    if (imageBase64) {
      content.push({ type: 'image_url', image_url: { url: imageBase64 } });
    }

    if (textInput) {
      content.push({ type: 'text', text: `Food description or barcode text: ${String(textInput).slice(0, 500)}` });
    }

    const text = await runLlmRole('vision', [{ role: 'user', content }]);
    const data = extractJsonObject(text);

    return NextResponse.json({
      name: String(data.name || 'Unknown Food'),
      calories: Number(data.calories) || 0,
      protein: Number(data.protein) || 0,
      carbs: Number(data.carbs) || 0,
      fat: Number(data.fat) || 0,
    });
  } catch (error: any) {
    console.error('Error analyzing food:', error);
    const status = error instanceof LlmConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error.message || 'Food analysis is unavailable right now.' },
      { status }
    );
  }
}
