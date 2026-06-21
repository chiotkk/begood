import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { imageBase64, textInput } = await req.json();

    if (!imageBase64 && !textInput) {
      return NextResponse.json({ error: 'Provide at least an image or text input' }, { status: 400 });
    }

    const prompt = `You are an expert nutritionist and diet tracker logic API. 
Analyze the image of food provided (or the barcode/text description) and return the nutritional information.
Return ONLY a valid JSON object matching this schema:
{
  "name": "string (the name of the food or meal)",
  "calories": number (estimated total calories),
  "protein": number (estimated total protein in grams),
  "carbs": number (estimated total carbohydrates in grams),
  "fat": number (estimated total fat in grams)
}
If there are multiple food items, provide the sum for the total dish. If the image is not food or you cannot identify it, provide your best estimation for standard equivalents or a realistic placeholder based on visual cues. Provide ONLY JSON.`;

    const contents: any[] = [{ text: prompt }];

    if (imageBase64) {
      // Strip off the data:image/...;base64, prefix if present
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const mimeType = imageBase64.includes(',') ? imageBase64.split(';')[0].split(':')[1] : 'image/jpeg';
      
      contents.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: base64Data,
        }
      });
    }

    if (textInput) {
      contents.push({ text: `Additional info or barcode text: ${textInput}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    // Attempt to parse JSON safely if it's wrapped in markdown
    let jsonStr = text.trim();
    if (jsonStr.startsWith('\`\`\`json')) {
      jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }
    
    const data = JSON.parse(jsonStr);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error analyzing food:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
