import { useState, FormEvent } from 'react';
import { toast } from 'react-toastify';

import { Eye, EyeOff, Mail, Lock, User as UserIcon, Globe, Anchor, Building, CheckCircle2 } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language, User, UserRole } from '../App';
import { translations } from '../utils/translations';
import { SignaturePad } from './SignaturePad';
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

interface RegisterPageProps {
  language: Language;
  onToggleLanguage: () => void;
  onRegister: (user: User) => void;
  onNavigateToLogin: () => void;
}

export function RegisterPage({ language, onToggleLanguage, onRegister, onNavigateToLogin }: RegisterPageProps) {
  const t = translations[language].register;
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '' as UserRole | '',
    organization: '',
    signature: null as string | null,
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = t.errors.nameRequired;
    }

    if (!formData.email) {
      newErrors.email = t.errors.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.errors.emailInvalid;
    }

    if (!formData.password) {
      newErrors.password = t.errors.passwordRequired;
    } else if (formData.password.length < 8) {
      newErrors.password = t.errors.passwordTooShort;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t.errors.passwordMismatch;
    }

    if (!formData.role) {
      newErrors.role = t.errors.roleRequired;
    }

    if (formData.role === 'agent' && !formData.organization.trim()) {
      newErrors.organization = t.errors.organizationRequired;
    }

    if (!formData.agreeToTerms) {
      newErrors.terms = t.errors.termsRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await api.post('/register', {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        role: formData.role,
        organization: formData.organization,
        signature: formData.signature,
      });

      const { user } = response.data || {};
      
      toast.success(isPendingApproval ? (language === 'ar' ? 'تم استلام طلبك وهو قيد المراجعة.' : 'Request received and under review.') : (language === 'ar' ? 'تم التسجيل بنجاح!' : 'Registration successful!'));
      setShowSuccess(true);

      
      if (response.status === 202) {
        setIsPendingApproval(true);
        setIsLoading(false);
      } else {
        setTimeout(() => {
          onRegister(user);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Register error:', error);
      setIsLoading(false);
      if (error.response && error.response.data && error.response.data.message) {
        setErrors({ ...errors, general: error.response.data.message });
      } else if (error.response && error.response.data && error.response.data.errors) {
        const apiErrors = error.response.data.errors;
        const mappedErrors: Record<string, string> = {};
        if (apiErrors.name) mappedErrors.fullName = apiErrors.name[0];
        if (apiErrors.email) mappedErrors.email = apiErrors.email[0];
        if (apiErrors.password) mappedErrors.password = apiErrors.password[0];
        if (apiErrors.role) mappedErrors.role = apiErrors.role[0];

        setErrors({ ...errors, ...mappedErrors, general: 'Please check the form for errors.' });
      } else {
        setErrors({ ...errors, general: 'Registration failed. Please try again.' });
      }
      toast.error(language === 'ar' ? 'فشل التسجيل. يرجى مراجعة الأخطاء المذكورة.' : 'Registration failed. Please review the errors.');
    }

  };

  const passwordStrength = formData.password ? getPasswordStrength(formData.password) : null;
  const isFormValid = formData.fullName && formData.email && formData.password &&
    formData.confirmPassword && formData.role && formData.agreeToTerms &&
    (formData.role !== 'agent' || formData.organization);

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
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center py-12 px-6 md:px-12 lg:px-20 relative z-10 overflow-y-auto h-screen">
        <div className="w-full max-w-xl space-y-8 my-auto py-8">
          {showSuccess ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {isPendingApproval ? t.success.pendingTitle : t.success.title}
              </h2>
              <p className="text-muted-foreground font-medium mb-8 text-base max-w-lg mx-auto">
                {isPendingApproval ? t.success.pendingMessage : t.success.message}
              </p>
              {!isPendingApproval && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-md mb-8 max-w-md mx-auto">
                  <p className="text-primary text-sm font-semibold">
                    {t.success.verificationNote}
                  </p>
                </div>
              )}
              <Button
                onClick={onNavigateToLogin}
                className="w-full max-w-xs h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-sm shadow-none transition-colors"
              >
                {t.loginLink}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2 text-center mb-8 mt-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
                  {t.title}
                </h1>
                <p className="text-muted-foreground text-sm font-medium">
                  {t.subtitle}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Full Name Field */}
                  <Field className="md:col-span-2">
                    <FieldLabel className={language === 'ar' ? 'text-right' : 'text-left'}>{t.fullName}</FieldLabel>
                    <div className="relative group">
                       <UserIcon className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", language === 'ar' ? 'right-3' : 'left-3')} />
                      <Input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder={t.fullNamePlaceholder}
                        className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary", language === 'ar' ? 'pr-10 text-right' : 'pl-10')}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </div>
                    {errors.fullName && <p className="text-destructive text-[11px] font-semibold mt-1">{errors.fullName}</p>}
                  </Field>

                  {/* Email Field */}
                  <Field className="md:col-span-2">
                     <FieldLabel className={language === 'ar' ? 'text-right' : 'text-left'}>{t.email}</FieldLabel>
                    <div className="relative group">
                      <Mail className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", language === 'ar' ? 'right-3' : 'left-3')} />
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder={t.emailPlaceholder}
                        className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary", language === 'ar' ? 'pr-10 text-right' : 'pl-10')}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </div>
                    {errors.email && <p className="text-destructive text-[11px] font-semibold mt-1">{errors.email}</p>}
                  </Field>

                  {/* Password Field */}
                  <Field>
                     <FieldLabel className={language === 'ar' ? 'text-right' : 'text-left'}>{t.password}</FieldLabel>
                    <div className="relative group">
                       <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", language === 'ar' ? 'right-3' : 'left-3')} />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={t.passwordPlaceholder}
                        className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary", language === 'ar' ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10')}
                        dir="ltr"
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
                    {formData.password && passwordStrength && (
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
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{passwordStrength.label}</p>
                      </div>
                    )}
                  </Field>

                  {/* Confirm Password Field */}
                  <Field>
                    <FieldLabel className={language === 'ar' ? 'text-right' : 'text-left'}>{t.confirmPassword}</FieldLabel>
                    <div className="relative group">
                       <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", language === 'ar' ? 'right-3' : 'left-3')} />
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder={t.confirmPasswordPlaceholder}
                        className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary", language === 'ar' ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10')}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={cn("absolute top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors", language === 'ar' ? 'left-3' : 'right-3')}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-destructive text-[11px] font-semibold mt-1">{errors.confirmPassword}</p>}
                  </Field>

                  {/* Role Selection */}
                  <Field className="md:col-span-2">
                     <FieldLabel className={language === 'ar' ? 'text-right' : 'text-left'}>{t.role}</FieldLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'agent' })}
                        className={cn(
                          "p-4 rounded-sm border transition-colors relative flex items-center justify-center",
                          formData.role === 'agent'
                            ? "bg-primary/5 border-primary text-primary"
                            : "bg-background border-border text-foreground hover:border-primary/50"
                        )}
                      >
                         <div className="font-semibold text-sm">{t.roles.agent}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'trader' })}
                        className={cn(
                          "p-4 rounded-sm border transition-colors relative flex items-center justify-center",
                          formData.role === 'trader'
                            ? "bg-primary/5 border-primary text-primary"
                            : "bg-background border-border text-foreground hover:border-primary/50"
                        )}
                      >
                        <div className="font-semibold text-sm">{t.roles.trader}</div>
                      </button>
                    </div>
                    {errors.role && <p className="text-destructive text-[11px] font-semibold mt-1">{errors.role}</p>}
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-2">{t.roleNote}</p>
                  </Field>

                  {/* Organization Field */}
                  {formData.role === 'agent' && (
                    <Field className="md:col-span-2">
                       <FieldLabel className={language === 'ar' ? 'text-right' : 'text-left'}>{t.organization}</FieldLabel>
                      <div className="relative group">
                        <Building className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100 transition-colors", language === 'ar' ? 'right-3' : 'left-3')} />
                        <Input
                          type="text"
                          value={formData.organization}
                          onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                          placeholder={t.organizationPlaceholder}
                          className={cn("h-11 rounded-sm border-border focus:ring-primary focus:border-primary", language === 'ar' ? 'pr-10 text-right' : 'pl-10')}
                          dir={language === 'ar' ? 'rtl' : 'ltr'}
                        />
                      </div>
                      {errors.organization && <p className="text-destructive text-[11px] font-semibold mt-1">{errors.organization}</p>}
                    </Field>
                  )}

                  {/* Digital Signature Field (Optional) */}
                  <Field className="md:col-span-2">
                    <FieldLabel className={language === 'ar' ? 'text-right' : 'text-left'}>
                      {language === 'ar' ? 'التوقيع الرقمي (اختياري حالياً)' : 'Digital Signature (Optional for now)'}
                    </FieldLabel>
                    <SignaturePad 
                      language={language}
                      onSignatureChange={(signatureBase64) => setFormData({ ...formData, signature: signatureBase64 })}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {language === 'ar' 
                        ? 'سيتم استخدام توقيعك للوثائق الرسمية.' 
                        : 'Your signature will be used for official documents.'}
                    </p>
                  </Field>
                </div>

                {/* Terms & Conditions */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={formData.agreeToTerms}
                        onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-4 h-4 rounded-sm border border-border peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                         <svg className="w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-sm font-medium leading-tight group-hover:text-foreground transition-colors">
                      {t.agreeToTerms}{' '}
                      <button type="button" className="text-primary hover:text-primary/80 hover:underline font-semibold">
                        {t.termsLink}
                      </button>
                    </span>
                  </label>
                  {errors.terms && <p className="text-destructive text-[11px] font-semibold mt-1">{errors.terms}</p>}
                </div>

                {errors.general && (
                   <div className="bg-destructive/10 border-l-4 border-destructive p-4 flex items-start gap-3">
                    <p className="text-destructive text-sm font-semibold">{errors.general}</p>
                  </div>
                )}

                <div className="flex flex-col gap-6 pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading || !isFormValid}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-sm shadow-none transition-colors"
                  >
                    {isLoading ? (
                      <LoadingIndicator type="line-spinner" size="sm" className="text-white" />
                    ) : (
                      <span className="flex items-center gap-2">
                        {t.createButton}
                      </span>
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <p className="text-muted-foreground text-sm">
                      {t.haveAccount}{' '}
                      <button
                        type="button"
                        onClick={onNavigateToLogin}
                        className="text-primary font-semibold hover:text-primary/80 transition-colors hover:underline underline-offset-4"
                      >
                        {t.loginLink}
                      </button>
                    </p>
                  </div>
                </div>
              </form>

              <div className="mt-8 text-center md:hidden">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  {t.footer}
                </p>
              </div>
            </>
          )}
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
            {language === 'ar' ? 'نظام إدارة الموانئ البحرية الذكي والمتكامل' : 'Smart and Integrated Maritime Port Management System'}
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
