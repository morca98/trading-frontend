import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LoadingProgressProps {
  isLoading: boolean;
  message?: string;
  externalProgress?: number;
}

export default function LoadingProgress({ isLoading, message = 'Carregando dados...', externalProgress }: LoadingProgressProps) {
  const [internalProgress, setInternalProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setInternalProgress(0);
      return;
    }

    if (externalProgress !== undefined) {
      setInternalProgress(externalProgress);
      return;
    }

    const interval = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 10;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading, externalProgress]);

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
              style={{ width: `${internalProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">{Math.round(internalProgress)}%</p>
        </CardContent>
      </Card>
    </div>
  );
}
