import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LoadingProgressProps {
  isLoading: boolean;
  message?: string;
}

export default function LoadingProgress({ isLoading, message = 'Carregando dados...' }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90; // Não ultrapassar 90% até terminar
        return prev + Math.random() * 15;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="bg-slate-800 border-slate-700 w-96">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <p className="text-white font-semibold">{message}</p>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">{Math.round(progress)}%</p>
        </CardContent>
      </Card>
    </div>
  );
}
