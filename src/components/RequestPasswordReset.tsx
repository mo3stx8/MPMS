import { useState, FormEvent } from 'react';
import { toast } from 'react-toastify';
import { Mail, Globe, ArrowLeft } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language } from '../App';
import api from '../services/api';
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface RequestPasswordResetProps {
  language: Language;
  onToggleLanguage: () => void;
  onNavigateBack: () => void;
  onNavigateToVerification: () => void;
}

export function RequestPasswordReset({ language, onToggleLanguage, onNavigateBack, onNavigateToVerification }: RequestPasswordResetProps) {
  const isAR = language === 'ar';
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(isAR ? 'البريد الإلكتروني مطلوب' : 'Email is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.post('/password-reset/request', { email });
      toast.success(isAR ? 'تم إرسال طلبك إلى الإدارة بنجاح.' : 'Your request has been sent to management successfully.');
      onNavigateToVerification();
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError(isAR ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.');
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
              {isAR ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {isAR ? 'أدخل بريدك الإلكتروني لطلب إعادة تعيين كلمة المرور من الإدارة.' : 'Enter your email to request a password reset from management.'}
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
                <FieldLabel htmlFor="email" className={isAR ? 'text-right' : 'text-left'}>{isAR ? 'البريد الإلكتروني' : 'Email Address'}</FieldLabel>
                <div className="relative group">
                  <Mail className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", isAR ? 'right-3' : 'left-3')} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isAR ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                    required
                    className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary", isAR ? 'pr-10 text-right' : 'pl-10')}
                    dir={isAR ? 'rtl' : 'ltr'}
                  />
                </div>
              </Field>

              <Button 
                type="submit" 
                disabled={isLoading || !email}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-sm shadow-none transition-colors mt-4"
              >
                {isLoading ? (
                  <LoadingIndicator type="line-spinner" size="sm" className="text-white" />
                ) : (
                  <span>{isAR ? 'إرسال الطلب' : 'Submit Request'}</span>
                )}
              </Button>
            </FieldGroup>
          </form>
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
