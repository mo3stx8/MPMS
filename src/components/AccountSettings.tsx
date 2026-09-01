import { useState, useRef, useEffect } from 'react';
import { 
  User as UserIcon, 
  Settings, 
  Shield, 
  Camera, 
  Mail, 
  Phone, 
  Lock, 
  Check, 
  Moon, 
  Sun, 
  Globe,
  PenTool
} from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { User, Language } from '../App';
import { translations } from '../utils/translations';
import { toast } from 'react-toastify';
import { userService } from '../services/userService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from './ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from './ui/tabs';

interface AccountSettingsProps {
  user: User;
  language: Language;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
}

export function AccountSettings({ 
  user, 
  language, 
  theme, 
  onToggleTheme, 
  onToggleLanguage 
}: AccountSettingsProps) {
  const t = translations[language].accountSettings;
  const tRegister = translations[language].register;
  const isRTL = language === 'ar';
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const strength = score === 0 && password.length > 0 ? 1 : score;

    const labels = [
      tRegister.passwordStrength.weak,
      tRegister.passwordStrength.weak,
      tRegister.passwordStrength.fair,
      tRegister.passwordStrength.good,
      tRegister.passwordStrength.strong
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

  const passwordStrength = securityForm.newPassword ? getPasswordStrength(securityForm.newPassword) : null;

  // Fetch real user data on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsInitialLoading(true);
        const data = await userService.fetchUserSettings();
        // Assuming backend returns { user: { name, email, phone, avatar_url }, preferences: { theme, language } }
        if (data.user) {
          setProfileForm({
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone || '',
          });
          if (data.user.avatar_url) {
            setAvatarPreview(data.user.avatar_url);
          }
        }
      } catch (error: any) {
        console.error('Failed to load settings:', error);
        toast.error(language === 'ar' ? 'فشل تحميل الإعدادات' : 'Failed to load settings');
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadSettings();
  }, [language]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Backend upload
      try {
        setIsLoading(true);
        const response = await userService.uploadUserAvatar(file);
        if (response.avatar_url) {
          setAvatarPreview(response.avatar_url);
          toast.success(t.success.profileUpdated);
        }
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || (language === 'ar' ? 'فشل تحميل الصورة' : 'Avatar upload failed');
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name) {
      toast.error(t.errors.nameRequired);
      return;
    }
    
    try {
      setIsLoading(true);
      await userService.updateUserProfile({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
      });
      toast.success(t.success.profileUpdated);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || (language === 'ar' ? 'فشل تحديث البيانات' : 'Profile update failed');
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error(t.errors.passwordMismatch);
      return;
    }
    if (securityForm.newPassword.length > 0 && securityForm.newPassword.length < 8) {
      toast.error(t.errors.passwordTooShort);
      return;
    }

    try {
      setIsLoading(true);
      await userService.updateUserPassword({
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword,
      });
      toast.success(t.success.passwordChanged);
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || (language === 'ar' ? 'فشل تغيير كلمة المرور' : 'Password change failed');
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSignature = async () => {
    if (!signatureBase64) {
      toast.error(language === 'ar' ? 'الرجاء رسم التوقيع أولاً' : 'Please draw your signature first');
      return;
    }
    try {
      setIsLoading(true);
      await userService.updateSignature(signatureBase64);
      toast.success(language === 'ar' ? 'تم حفظ التوقيع بنجاح' : 'Signature saved successfully');
      // Reload to update global user state
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || (language === 'ar' ? 'فشل حفظ التوقيع' : 'Failed to save signature');
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTheme = async () => {
    onToggleTheme();
    try {
      await userService.updateUserPreferences({
        theme: theme === 'dark' ? 'light' : 'dark',
        language: language,
      });
    } catch (error) {
      console.error('Failed to sync theme preference:', error);
    }
  };

  const handleToggleLanguage = async () => {
    onToggleLanguage();
    try {
      await userService.updateUserPreferences({
        theme: theme,
        language: language === 'ar' ? 'en' : 'ar',
      });
    } catch (error) {
      console.error('Failed to sync language preference:', error);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <LoadingIndicator 
          type="line-spinner" 
          size="lg" 
          label={language === 'ar' ? 'جاري تحميل الإعدادات...' : 'Loading settings...'} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">{t.title}</h1>
        <p className="text-[var(--text-secondary)]">
          {language === 'ar' 
            ? `إدارة حسابك كـ ${user.role === 'trader' ? 'تاجر' : user.role === 'agent' ? 'وكيل بحري' : 'مسؤول'}`
            : `Manage your account as ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64 space-y-2">
            <TabsList className="flex flex-row md:flex-col h-auto w-full bg-transparent p-0 gap-2">
              <TabsTrigger 
                value="profile" 
                className={`w-full justify-start gap-3 px-4 py-3 text-sm font-medium transition-all
                  ${activeTab === 'profile' 
                    ? 'bg-primary/10 text-primary border-l-2 md:border-l-0 md:border-r-2 border-primary' 
                    : 'text-[var(--text-secondary)] hover:bg-secondary/10'}`}
              >
                <UserIcon className="w-4 h-4" />
                {t.profile}
              </TabsTrigger>
              <TabsTrigger 
                value="preferences" 
                className={`w-full justify-start gap-3 px-4 py-3 text-sm font-medium transition-all
                  ${activeTab === 'preferences' 
                    ? 'bg-primary/10 text-primary border-l-2 md:border-l-0 md:border-r-2 border-primary' 
                    : 'text-[var(--text-secondary)] hover:bg-secondary/10'}`}
              >
                <Settings className="w-4 h-4" />
                {t.preferences}
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className={`w-full justify-start gap-3 px-4 py-3 text-sm font-medium transition-all
                  ${activeTab === 'security' 
                    ? 'bg-primary/10 text-primary border-l-2 md:border-l-0 md:border-r-2 border-primary' 
                    : 'text-[var(--text-secondary)] hover:bg-secondary/10'}`}
              >
                <Shield className="w-4 h-4" />
                {t.security}
              </TabsTrigger>
            </TabsList>
          </aside>

          {/* Tab Contents */}
          <div className="flex-1">
            {/* Profile Content */}
            <TabsContent value="profile" className="mt-0">
              <Card className="bg-[var(--bg-card)] border-secondary/50">
                <form onSubmit={handleUpdateProfile}>
                  <CardHeader>
                    <CardTitle>{t.personalInfo}</CardTitle>
                    <CardDescription>{t.personalInfoDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-secondary/30">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30 group-hover:border-primary transition-colors">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-10 h-10 text-primary/40" />
                          )}
                        </div>
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:scale-110 transition-transform"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleAvatarChange} 
                        />
                      </div>
                      <div className="text-center sm:text-left space-y-1">
                        <h4 className="font-medium text-[var(--text-primary)]">{t.avatar}</h4>
                        <p className="text-xs text-[var(--text-secondary)]">JPG, GIF or PNG. Max size of 2MB</p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2"
                        >
                          {t.upload}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t.fullName}</Label>
                        <div className="relative">
                          <UserIcon className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-4 h-4 text-[var(--text-secondary)]`} />
                          <Input 
                            id="name" 
                            value={profileForm.name} 
                            onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                            className={`${isRTL ? 'pr-10' : 'pl-10'} bg-[var(--bg-primary)] border-secondary`}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t.email}</Label>
                        <div className="relative">
                          <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-4 h-4 text-[var(--text-secondary)]`} />
                          <Input 
                            id="email" 
                            type="email" 
                            disabled
                            value={profileForm.email} 
                            className={`${isRTL ? 'pr-10' : 'pl-10'} bg-[var(--bg-primary)]/50 border-secondary cursor-not-allowed`}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t.phone}</Label>
                        <div className="relative">
                          <Phone className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-4 h-4 text-[var(--text-secondary)]`} />
                          <Input 
                            id="phone" 
                            value={profileForm.phone} 
                            onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                            className={`${isRTL ? 'pr-10' : 'pl-10'} bg-[var(--bg-primary)] border-secondary`}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end border-t border-secondary/30 pt-6">
                    <Button type="submit" disabled={isLoading} className="gap-2">
                      {isLoading ? (
                        <LoadingIndicator type="line-spinner" size="xs" className="text-white" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {isLoading ? t.saving : t.saveChanges}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* Digital Signature Card */}
              <Card className="bg-[var(--bg-card)] border-secondary/50 mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-primary" />
                    {language === 'ar' ? 'التوقيع الرقمي' : 'Digital Signature'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' 
                      ? 'أضف توقيعك لاعتماد الوثائق والتصاريح رسمياً.' 
                      : 'Add your signature to officially authorize documents and clearances.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SignaturePad 
                    language={language}
                    initialSignature={user.signature_base64 || user.signature}
                    onSignatureChange={setSignatureBase64}
                  />
                  {!user.signature && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                      <p className="text-amber-600 dark:text-amber-500 text-sm font-medium">
                        {language === 'ar' 
                          ? 'تنبيه: يجب إضافة توقيعك لتفعيل حسابك واستخدام النظام.' 
                          : 'Notice: You must add your signature to activate your account and use the system.'}
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end border-t border-secondary/30 pt-6">
                  <Button 
                    type="button" 
                    onClick={handleUpdateSignature} 
                    disabled={isLoading || !signatureBase64} 
                    className="gap-2"
                  >
                    {isLoading ? (
                      <LoadingIndicator type="line-spinner" size="xs" className="text-white" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {isLoading ? t.saving : t.saveChanges}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Preferences Content */}
            <TabsContent value="preferences" className="mt-0 space-y-6">
              <Card className="bg-[var(--bg-card)] border-secondary/50">
                <CardHeader>
                  <CardTitle>{t.theme}</CardTitle>
                  <CardDescription>{t.themeDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleToggleTheme}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all
                        ${theme === 'light' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-secondary/30 hover:border-secondary bg-[var(--bg-primary)]/50'}`}
                    >
                      <div className={`p-3 rounded-lg ${theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-secondary/10 text-[var(--text-secondary)]'}`}>
                        <Sun className="w-6 h-6" />
                      </div>
                      <span className="font-medium text-sm text-[var(--text-primary)]">{t.light}</span>
                    </button>
                    <button 
                      onClick={handleToggleTheme}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all
                        ${theme === 'dark' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-secondary/30 hover:border-secondary bg-[var(--bg-primary)]/50'}`}
                    >
                      <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-secondary/10 text-[var(--text-secondary)]'}`}>
                        <Moon className="w-6 h-6" />
                      </div>
                      <span className="font-medium text-sm text-[var(--text-primary)]">{t.dark}</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[var(--bg-card)] border-secondary/50">
                <CardHeader>
                  <CardTitle>{t.language}</CardTitle>
                  <CardDescription>{t.languageDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleToggleLanguage}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all
                        ${language === 'en' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-secondary/30 hover:border-secondary bg-[var(--bg-primary)]/50'}`}
                    >
                      <div className={`p-3 rounded-lg ${language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-secondary/10 text-[var(--text-secondary)]'}`}>
                        <Globe className="w-6 h-6" />
                      </div>
                      <span className="font-medium text-sm text-[var(--text-primary)]">English (EN)</span>
                    </button>
                    <button 
                      onClick={handleToggleLanguage}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all
                        ${language === 'ar' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-secondary/30 hover:border-secondary bg-[var(--bg-primary)]/50'}`}
                    >
                      <div className={`p-3 rounded-lg ${language === 'ar' ? 'bg-primary text-primary-foreground' : 'bg-secondary/10 text-[var(--text-secondary)]'}`}>
                        <Globe className="w-6 h-6" />
                      </div>
                      <span className="font-medium text-sm text-[var(--text-primary)]">العربيــة (AR)</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Content */}
            <TabsContent value="security" className="mt-0 space-y-6">
              <Card className="bg-[var(--bg-card)] border-secondary/50">
                <form onSubmit={handleUpdateSecurity}>
                  <CardHeader>
                    <CardTitle>{t.changePassword}</CardTitle>
                    <CardDescription>{t.changePasswordDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">{t.currentPassword}</Label>
                      <div className="relative">
                        <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-4 h-4 text-[var(--text-secondary)]`} />
                        <Input 
                          id="currentPassword" 
                          type="password"
                          value={securityForm.currentPassword}
                          onChange={e => setSecurityForm({...securityForm, currentPassword: e.target.value})}
                          className={`${isRTL ? 'pr-10' : 'pl-10'} bg-[var(--bg-primary)] border-secondary`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">{t.newPassword}</Label>
                        <div className="relative">
                          <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-4 h-4 text-[var(--text-secondary)]`} />
                          <Input 
                            id="newPassword" 
                            type="password"
                            value={securityForm.newPassword}
                            onChange={e => setSecurityForm({...securityForm, newPassword: e.target.value})}
                            className={`${isRTL ? 'pr-10' : 'pl-10'} bg-[var(--bg-primary)] border-secondary`}
                            dir="ltr"
                          />
                        </div>
                        {securityForm.newPassword && passwordStrength && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex gap-1 h-1">
                              {[...Array(4)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`flex-1 rounded-sm transition-colors ${
                                    i < passwordStrength.strength ? passwordStrength.color : "bg-secondary/50"
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{passwordStrength.label}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t.confirmNewPassword}</Label>
                        <div className="relative">
                          <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-4 h-4 text-[var(--text-secondary)]`} />
                          <Input 
                            id="confirmPassword" 
                            type="password"
                            value={securityForm.confirmPassword}
                            onChange={e => setSecurityForm({...securityForm, confirmPassword: e.target.value})}
                            className={`${isRTL ? 'pr-10' : 'pl-10'} bg-[var(--bg-primary)] border-secondary`}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end border-t border-secondary/30 pt-6">
                    <Button type="submit" disabled={isLoading} className="gap-2">
                      {isLoading ? (
                        <LoadingIndicator type="line-spinner" size="xs" className="text-white" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                      {isLoading ? t.saving : t.saveChanges}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              <Card className="bg-[var(--bg-card)] border-secondary/50 opacity-60">
                <CardHeader>
                  <CardTitle>{t.twoFactor}</CardTitle>
                  <CardDescription>{t.twoFactorDesc}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-[var(--text-primary)]">{t.disabled}</span>
                  </div>
                  <Button variant="outline" disabled size="sm">Enable</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
