'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiPath } from '@/lib/client-api';

export function LogFoodModal({ 
  onClose, 
  onSave 
}: { 
  onClose: () => void; 
  onSave: (data: any) => Promise<any> | any;
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imagePreview && !textInput) {
      toast.error('Please provide an image or text description.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch(apiPath('/api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: imagePreview,
          textInput: textInput
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Analysis failed');
      }

      const data = await response.json();
      
      await onSave({
        name: data.name || 'Unknown Food',
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
        imageUrl: imagePreview,
      });
      
      toast.success(data.name ? `Logged ${data.name}!` : 'Meal logged successfully!');
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Could not analyze the food. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">Log Meal</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-gray-800">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Snap a picture or upload
            </label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video group flex items-center justify-center">
                <img src={imagePreview} alt="Food preview" className="object-cover w-full h-full" />
                <button 
                  onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 z-[1000]">
                <button 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-colors h-32"
                >
                  <Upload className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Upload File</span>
                </button>
                <button 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-orange-300 hover:text-orange-600 transition-colors h-32"
                >
                  <Camera className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Take Photo</span>
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageCapture}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or describe the food / barcode
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none h-24"
              placeholder="e.g. 'A bowl of oatmeal with blueberries' or '04963406'"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!imagePreview && !textInput)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              'Analyze & Log'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
