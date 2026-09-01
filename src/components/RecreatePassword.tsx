import { useState, FormEvent } from 'react';
import { Lock, Eye, EyeOff, Globe, ArrowLeft } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { toast } from 'react-toastify';
import { Language } from '../App';
import { translations } from '../utils/translations';
import api from '../services/api';
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface RecreatePasswordProps {
  language: Language;
  onToggleLanguage: () => void;
  onNavigateBack: () => void;
  onNavigateToLogin: () => void;
  token: string;
}

export function RecreatePassword({ language, onToggleLanguage, onNavigateBack, onNavigateToLogin, token }: RecreatePasswordProps) {
  const isAR = language === 'ar';
  const t = translations[language].register;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const strength = score === 0 && password.length > 0 ? 1 : score;

    const labels = [
      t.passwordStrength.weak,
      t.passwordStrength.weak,
      t.passwordStrength.fair,
      t.passwordStrength.good,
      t.passwordStrength.strong
    ];
    const colors = [
      'bg-muted',
      'bg-destructive',
      'bg-amber-500',
      'bg-yellow-500',
      'bg-green-500'
    ];

    return {
      strength,
      label: labels[strength],
      color: colors[strength],
    };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(isAR ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.' : 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError(isAR ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.post('/password-reset/recreate', {
        token,
        password,
        password_confirmation: confirmPassword
      });
      toast.success(isAR ? 'تم تغيير كلمة المرور بنجاح.' : 'Password has been changed successfully.');
      onNavigateToLogin();
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.data && err.response.data.errors) {
        const errors = err.response.data.errors;
        const msg = Object.values(errors).flat().join(', ');
        setError(msg);
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
        <span className="font-semibold text-sm">{isAR ? 'إلغاء' : 'Cancel'}</span>
      </button>

      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-2 text-center mb-6 mt-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isAR ? 'إنشاء كلمة مرور جديدة' : 'Create New Password'}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {isAR ? 'أدخل كلمة مرور قوية لحسابك.' : 'Enter a strong password for your account.'}
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
                <FieldLabel htmlFor="password" className={isAR ? 'text-right' : 'text-left'}>{t.password}</FieldLabel>
                <div className="relative group">
                  <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", isAR ? 'right-3' : 'left-3')} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    required
                    className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary", isAR ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10')}
                    dir={isAR ? 'rtl' : 'ltr'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn("absolute top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors", isAR ? 'left-3' : 'right-3')}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1 h-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex-1 rounded-sm transition-colors",
                            i < passwordStrength.strength ? passwordStrength.color : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {passwordStrength.label}
                    </p>
                  </div>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword" className={isAR ? 'text-right' : 'text-left'}>{t.confirmPassword}</FieldLabel>
                <div className="relative group">
                  <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", isAR ? 'right-3' : 'left-3')} />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.confirmPasswordPlaceholder}
                    required
                    className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary", isAR ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10')}
                    dir={isAR ? 'rtl' : 'ltr'}
                  />
                </div>
              </Field>

              <Button 
                type="submit" 
                disabled={isLoading || password.length < 8 || password !== confirmPassword}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-sm shadow-none transition-colors mt-4"
              >
                {isLoading ? (
                  <LoadingIndicator type="line-spinner" size="sm" className="text-white" />
                ) : (
                  <span>{isAR ? 'تغيير كلمة المرور' : 'Change Password'}</span>
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
