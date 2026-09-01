import React, { useRef, useState, useEffect } from 'react';
import { Eraser, CheckCircle2 } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { API_BASE_URL } from '@/services/api';

interface SignaturePadProps {
  onSignatureChange: (signatureBase64: string | null) => void;
  initialSignature?: string | null;
  className?: string;
  language?: 'en' | 'ar';
}

export function SignaturePad({ onSignatureChange, initialSignature, className, language = 'en' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  // Sync hasSignature with initialSignature prop updates
  useEffect(() => {
    if (initialSignature) {
      setHasSignature(true);
    }
  }, [initialSignature]);

  // Labels
  const labels = {
    clear: language === 'ar' ? 'مسح التوقيع' : 'Clear Signature',
    drawn: language === 'ar' ? 'تم رسم التوقيع بنجاح' : 'Signature drawn successfully',
    placeholder: language === 'ar' ? 'الرجاء التوقيع داخل المربع هنا...' : 'Please sign within the box here...'
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#111827'; 
        setContext(ctx);
      }
    }
  }, []);

  useEffect(() => {
    if (!context || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Fill with white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (initialSignature) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (context && canvas) {
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          setHasSignature(true);
        }
      };
      
      let src = initialSignature;
      
      // Handle different URL formats
      if (src.startsWith('data:')) {
        // Already base64, no change needed
      } else if (src.startsWith('/')) {
        // Relative path, prefix with backend URL
        src = `${API_BASE_URL}${src}`;
      } else if ((src.startsWith('http://localhost/') || src.startsWith('http://127.0.0.1/')) && !src.includes(':8000')) {
        // Fix missing port 8000 if backend is on 8000 but URL was generated with default port
        src = src.replace('localhost/', 'localhost:8000/').replace('127.0.0.1/', '127.0.0.1:8000/');
      }
      
      img.src = src;
    } else {
      setHasSignature(false);
    }
  }, [initialSignature, context]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!context || !canvasRef.current) return;
    setIsDrawing(true);
    
    const pos = getCoordinates(e);
    context.beginPath();
    context.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !context || !canvasRef.current) return;
    
    const pos = getCoordinates(e);
    context.lineTo(pos.x, pos.y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      context?.closePath();
      setIsDrawing(false);
      
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setHasSignature(true);
      onSignatureChange(dataUrl);
    }
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearSignature = () => {
    if (!context || !canvasRef.current) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="relative border border-border rounded-md overflow-hidden bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full h-[150px] cursor-crosshair touch-none bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="text-muted-foreground/40 font-medium tracking-wide">
              {labels.placeholder}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {hasSignature ? (
             <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-500">
               <CheckCircle2 className="w-4 h-4" />
               {labels.drawn}
             </span>
          ) : (
             <span className="text-xs font-semibold text-muted-foreground"></span>
          )}
        </div>
        
        <button
          type="button"
          onClick={clearSignature}
          disabled={!hasSignature}
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-sm transition-colors",
            hasSignature 
              ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" 
              : "text-muted-foreground opacity-50 cursor-not-allowed"
          )}
        >
          <Eraser className="w-3.5 h-3.5" />
          {labels.clear}
        </button>
      </div>
    </div>
  );
}
