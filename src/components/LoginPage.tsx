import { useState, FormEvent } from 'react';
import { toast } from 'react-toastify';

import { Eye, EyeOff, Mail, Lock, Globe, Anchor, ShieldCheck } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language, User } from '../App';
import { translations } from '../utils/translations';
import api from '../services/api';
import { cn } from "@/components/ui/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface LoginPageProps {
  language: Language;
  onToggleLanguage: () => void;
  onLogin: (user: User) => void;
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
}

export function LoginPage({ language, onToggleLanguage, onLogin, onNavigateToRegister, onNavigateToForgotPassword }: LoginPageProps) {
  const t = translations[language].login;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; general?: string } = {};

    if (!email) {
      newErrors.email = t.errors.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t.errors.emailInvalid;
    }

    if (!password) {
      newErrors.password = t.errors.passwordRequired;
    } else if (password.length < 6) {
      newErrors.password = t.errors.passwordTooShort;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (twoFactorToken) {
      return handleTwoFactorSubmit(e);
    }

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await api.post('/login', {
        email,
        password,
      });

      const data = response.data;

      // Two-factor authentication required - show the code step
      if (data.status === 'two_factor_required') {
        setTwoFactorToken(data.two_factor_token);
        setIsLoading(false);
        return;
      }

      const { access_token, user } = data;

      // Save token
      localStorage.setItem('token', access_token);

      // Update app state
      toast.success(language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Login successful!');
      onLogin(user);
    } catch (error: any) {

      console.error('Login error:', error);
      
      if (error.response && error.response.status === 403) {
        const { status, rejection_reason, message } = error.response.data;
        
        if (status === 'pending') {
          setErrors({ general: t.errors.pending || 'Your account is still under review.' });
        } else if (status === 'rejected') {
          const reason = rejection_reason ? ` ${rejection_reason}` : '';
          setErrors({ general: (t.errors.rejected || 'Account rejected:') + reason });
        } else {
          setErrors({ general: message || t.errors.general });
        }
      } else if (error.response && error.response.data && error.response.data.message) {
        setErrors({ general: error.response.data.message });
      } else if (error.response && error.response.data && error.response.data.errors) {
        setErrors({ general: Object.values(error.response.data.errors).flat().join(', ') });
      } else {
        setErrors({ general: t.errors.general || 'An error occurred during login.' });
      }
      toast.error(language === 'ar' ? 'فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.' : 'Login failed. Please check your credentials.');
    } finally {

      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setErrors({ general: language === 'ar' ? 'يرجى إدخال رمز التحقق.' : 'Please enter the verification code.' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await api.post('/2fa/verify', {
        code: twoFactorCode,
        two_factor_token: twoFactorToken,
      });

      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      toast.success(language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Login successful!');
      onLogin(user);
    } catch (error: any) {
      console.error('2FA error:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: language === 'ar' ? 'رمز التحقق غير صحيح.' : 'Invalid verification code.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = twoFactorToken ? !!twoFactorCode.trim() : (email && password && password.length >= 6);

  return (
    <div className="min-h-screen flex w-full bg-background transition-colors duration-300">
      {/* Language Toggle */}
      <button
        onClick={onToggleLanguage}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-background hover:bg-muted border border-border text-foreground rounded-md transition-colors shadow-sm z-20"
      >
        <Globe className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">{language === 'ar' ? 'English' : 'العربية'}</span>
      </button>

      {/* Form Column */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-2 text-center mb-6 mt-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {twoFactorToken ? (language === 'ar' ? 'التحقق بخطوتين' : 'Two-Factor Verification') : t.title}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {twoFactorToken
                ? (language === 'ar' ? 'أدخل الرمز من تطبيق المصادقة الخاص بك.' : 'Enter the code from your authenticator app.')
                : t.subtitle}
            </p>
          </div>

          {errors.general && (
            <div className="bg-destructive/10 border-l-4 border-destructive p-4 flex items-start gap-3">
              <p className="text-destructive text-sm font-semibold">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {twoFactorToken ? (
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="2fa-code" className={language === 'ar' ? 'text-right' : 'text-left'}>
                    {language === 'ar' ? 'رمز التحقق' : 'Verification Code'}
                  </FieldLabel>
                  <div className="relative group">
                    <ShieldCheck className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", language === 'ar' ? 'right-3' : 'left-3')} />
                    <Input
                      id="2fa-code"
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                      maxLength={6}
                      placeholder="000000"
                      className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary text-center tracking-[0.4em] font-semibold", language === 'ar' ? 'pr-10' : 'pl-10')}
                      dir="ltr"
                    />
                  </div>
                </Field>

                <Button
                  type="submit"
                  disabled={isLoading || !twoFactorCode.trim()}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-sm shadow-none transition-colors mt-2"
                >
                  {isLoading ? (
                    <LoadingIndicator type="line-spinner" size="sm" className="text-white" />
                  ) : (
                    <span className="flex items-center gap-2">
                      {language === 'ar' ? 'تحقق' : 'Verify'}
                    </span>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => { setTwoFactorToken(null); setTwoFactorCode(''); setErrors({}); }}
                  className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                >
                  {language === 'ar' ? 'رجوع لتسجيل الدخول' : 'Back to sign in'}
                </button>
              </FieldGroup>
            ) : (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email" className={language === 'ar' ? 'text-right' : 'text-left'}>{t.email}</FieldLabel>
                <div className="relative group">
                  <Mail className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", language === 'ar' ? 'right-3' : 'left-3')} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    required
                    className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary", language === 'ar' ? 'pr-10 text-right' : 'pl-10')}
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>
                {errors.email && <p className="text-destructive text-[11px] font-semibold mt-1">{errors.email}</p>}
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">{t.password}</FieldLabel>
                  <button
                    type="button"
                    onClick={onNavigateToForgotPassword}
                    className="text-xs font-semibold text-primary hover:text-primary/80 hover:underline"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
                <div className="relative group">
                  <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", language === 'ar' ? 'right-3' : 'left-3')} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    required
                    className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary", language === 'ar' ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn("absolute top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors", language === 'ar' ? 'left-3' : 'right-3')}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-destructive text-[11px] font-semibold mt-1">{errors.password}</p>}
              </Field>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-border text-primary focus:ring-primary focus:ring-offset-background"
                />
                <label htmlFor="remember" className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                  {t.rememberMe}
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || !isFormValid}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-sm shadow-none transition-colors mt-4"
              >
                {isLoading ? (
                  <LoadingIndicator type="line-spinner" size="sm" className="text-white" />
                ) : (
                  <span className="flex items-center gap-2">
                    {t.loginButton}
                  </span>
                )}
              </Button>
            </FieldGroup>
            )}
          </form>

          <FieldSeparator className="my-6">{language === 'ar' ? 'أو' : 'Or'}</FieldSeparator>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t.noAccount}{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-primary font-semibold hover:text-primary/80 hover:underline underline-offset-4"
              >
                {t.createAccount}
              </button>
            </p>
          </div>
          
          <div className="mt-8 text-center md:hidden">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
               {t.footer}
            </p>
          </div>
        </div>
      </div>

      {/* Branding Image Column */}
      <div className="hidden md:flex md:w-1/2 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/port_background.png"
            alt="Port Background"
            className="w-full h-full object-cover opacity-40 select-none pointer-events-none mix-blend-luminosity"
          />
        </div>
        <div className="absolute inset-0 bg-black/50 z-0"></div>

        <div className="relative z-10 flex flex-col items-center text-center p-12 mt-12 w-full max-w-lg">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-wide drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
            MANARAH PORT
          </h2>
          <div className="w-20 h-1 bg-white/50 mb-8 rounded-sm"></div>
          <p className="text-white text-lg lg:text-xl font-semibold max-w-md leading-relaxed text-balance drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {language === 'ar' ? 'نظام إدارة الموانئ البحرية الذكي' : 'Smart Maritime Port Management System'}
          </p>
        </div>
        
        <div className="absolute bottom-10 left-0 right-0 text-center z-20 px-8">
          <p className="text-xs uppercase tracking-widest font-semibold text-white/60">
             {t.footer}
          </p>
        </div>
      </div>
    </div>
  );
}
