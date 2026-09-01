import { useState, FormEvent } from 'react';
import { KeyRound, Globe, ArrowLeft } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language } from '../App';
import api from '../services/api';
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface ForgotPasswordVerificationProps {
  language: Language;
  onToggleLanguage: () => void;
  onNavigateBack: () => void;
  onNavigateToRequest: () => void;
  onVerified: (token: string) => void;
}

export function ForgotPasswordVerification({ language, onToggleLanguage, onNavigateBack, onNavigateToRequest, onVerified }: ForgotPasswordVerificationProps) {
  const isAR = language === 'ar';
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 4) {
      setError(isAR ? 'يجب أن يتكون الرمز من 4 أرقام.' : 'Code must be exactly 4 digits.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/password-reset/verify', { code });
      onVerified(response.data.reset_token);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError(isAR ? 'رمز غير صالح أو منتهي الصلاحية.' : 'Invalid or expired code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background transition-colors duration-300">
      <button
        onClick={onToggleLanguage}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-background hover:bg-muted border border-border text-foreground rounded-md transition-colors shadow-sm z-20"
      >
        <Globe className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">{isAR ? 'English' : 'العربية'}</span>
      </button>

      <button
        onClick={onNavigateBack}
        className={cn("absolute top-6 flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors z-20", isAR ? "left-6" : "left-6")}
      >
        <ArrowLeft className={cn("w-4 h-4", isAR && "rotate-180")} />
        <span className="font-semibold text-sm">{isAR ? 'عودة' : 'Back'}</span>
      </button>

      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-2 text-center mb-6 mt-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isAR ? 'التحقق من الرمز' : 'Verify Code'}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {isAR ? 'أدخل الرمز المكون من 4 أرقام الذي تلقيته من الإدارة.' : 'Enter the 4-digit code you received from management.'}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border-l-4 border-destructive p-4 flex items-start gap-3">
              <p className="text-destructive text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="code" className={isAR ? 'text-right' : 'text-left'}>{isAR ? 'رمز التحقق (OTP)' : 'Verification Code (OTP)'}</FieldLabel>
                <div className="relative group">
                  <KeyRound className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", isAR ? 'right-3' : 'left-3')} />
                  <Input
                    id="code"
                    type="text"
                    maxLength={4}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0000"
                    required
                    className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary text-center text-lg tracking-widest")}
                    dir="ltr"
                  />
                </div>
              </Field>

              <Button 
                type="submit" 
                disabled={isLoading || code.length !== 4}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-sm shadow-none transition-colors mt-4"
              >
                {isLoading ? (
                  <LoadingIndicator type="line-spinner" size="sm" className="text-white" />
                ) : (
                  <span>{isAR ? 'تحقق من الرمز' : 'Verify Code'}</span>
                )}
              </Button>
            </FieldGroup>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={onNavigateToRequest}
              className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline underline-offset-4"
            >
              {isAR ? 'أو اطلب رمز إعادة تعيين كلمة المرور' : 'OR ask for forgot password code'}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:flex md:w-1/2 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="/port_background.png" alt="Port Background" className="w-full h-full object-cover opacity-40 select-none pointer-events-none mix-blend-luminosity" />
        </div>
        <div className="absolute inset-0 bg-black/50 z-0"></div>
        <div className="relative z-10 flex flex-col items-center text-center p-12 mt-12 w-full max-w-lg">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-wide drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">MANARAH PORT</h2>
          <div className="w-20 h-1 bg-white/50 mb-8 rounded-sm"></div>
        </div>
      </div>
    </div>
  );
}
