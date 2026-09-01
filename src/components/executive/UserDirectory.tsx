import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';

import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import {
  Users, Search, Filter, Edit2, Trash2, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Clock, ShieldOff,
  ChevronLeft, ChevronRight, X, Eye, EyeOff, UserPlus,
} from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import { Language } from '../../App';
import { adminService, AdminUser } from '../../services/adminService';
import { getTranslatedRole, getTranslatedStatus } from '../../utils/formatters';
import { generateGmailUrl, generatePasswordResetGmailUrl } from '../../utils/emailUtils';
import { translations } from '../../utils/translations';

interface UserDirectoryProps {
  language: Language;
}

type ModalType = 'create' | 'edit' | 'suspend-confirm' | 'delete-confirm' | null;

const ROLES = ['trader', 'agent', 'executive', 'officer', 'wharf'] as const;
const STATUSES = ['active', 'pending', 'suspended', 'rejected'] as const;

const ROLE_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  trader:    { en: 'Trader',     ar: 'تاجر',         color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-900/30' },
  agent:     { en: 'Agent',      ar: 'وكيل بحري',    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/30'   },
  executive: { en: 'Executive',  ar: 'إدارة تنفيذية', color: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-900/30'   },
  officer:   { en: 'Officer',    ar: 'ضابط ميناء',    color: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-900/30'   },
  wharf:     { en: 'Wharf',      ar: 'عامل رصيف',    color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/30'},
};

const STATUS_CONFIG: Record<string, { en: string; ar: string; color: string; icon: ReactNode }> = {
  active:    { en: 'Active',    ar: 'نشط',       color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/30',   icon: <CheckCircle  className="w-3 h-3" /> },
  pending:   { en: 'Pending',   ar: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/30', icon: <Clock        className="w-3 h-3" /> },
  suspended: { en: 'Suspended', ar: 'موقوف',     color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',     icon: <ShieldOff    className="w-3 h-3" /> },
  rejected:  { en: 'Rejected',  ar: 'مرفوض',     color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/30',        icon: <XCircle      className="w-3 h-3" /> },
};

// ─── Reusable Input ────────────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-red-600 dark:text-red-400 text-xs font-medium">{error}</p>}
    </div>
  );
}

function Input({ error, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 bg-[var(--surface-highlight)] border ${error ? 'border-red-500' : 'border-[var(--border-color)]'} rounded-lg text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm shadow-sm`}
    />
  );
}

function Select({ error, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 bg-[var(--surface-highlight)] border ${error ? 'border-red-500' : 'border-[var(--border-color)]'} rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm shadow-sm`}
    >
      {children}
    </select>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, language }: { status: string; language: Language }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${cfg.color}`}>
      {cfg.icon}
      {getTranslatedStatus(status, language)}
    </span>
  );
}

// ─── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role, language }: { role: string; language: Language }) {
  const cfg = ROLE_LABELS[role] ?? { color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg.color}`}>
      {getTranslatedRole(role, language)}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return <LoadingIndicator type="line-spinner" size={size === 'sm' ? 'xs' : 'sm'} />;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${cls} rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center font-bold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function UserDirectory({ language }: UserDirectoryProps) {
  const isAR = language === 'ar';

  // Data state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Edit form

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: '', organization: '', password: '', password_confirmation: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', organization: '', status: '', phone: '' });
  const [pendingSuspend, setPendingSuspend] = useState(false);

  // Password Resets
  const [passwordResets, setPasswordResets] = useState<any[]>([]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (page = currentPage) => {
    setIsLoading(true);
    try {
      const [res, resetsRes] = await Promise.all([
        adminService.getUsers({
          page,
          per_page: 12,
          search: search || undefined,
          role: filterRole || undefined,
          status: filterStatus || undefined,
        }),
        adminService.getPendingPasswordResets()
      ]);
      setUsers(res.data);
      setTotal(res.total);
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
      setPasswordResets(resetsRes);
    } catch {
      toast.error(isAR ? 'فشل تحميل المستخدمين' : 'Failed to load users.');
    } finally {

      setIsLoading(false);
    }
  }, [search, filterRole, filterStatus, currentPage, isAR]);

  useEffect(() => { fetchUsers(1); }, [filterRole, filterStatus]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchUsers(1), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const strength = score === 0 && password.length > 0 ? 1 : score;
    const tRegister = translations[language].register;

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

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setFieldErrors({});
    const errs: Record<string, string> = {};
    if (!createForm.name.trim())  errs.name  = isAR ? 'الاسم مطلوب'           : 'Name is required.';
    if (!createForm.email.trim()) errs.email = isAR ? 'البريد الإلكتروني مطلوب' : 'Email is required.';
    if (!createForm.role)         errs.role  = isAR ? 'الدور مطلوب'            : 'Role is required.';
    
    if (createForm.password) {
      if (createForm.password.length < 8) {
        errs.password = isAR ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.' : 'Password must be at least 8 characters.';
      }
      if (createForm.password !== createForm.password_confirmation) {
        errs.password_confirmation = isAR ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.';
      }
    }

    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setIsSubmitting(true);
    try {
      const res = await adminService.createUser({
        name:  createForm.name,
        email: createForm.email,
        role:  createForm.role,
        organization: createForm.organization || undefined,
        password: createForm.password || undefined,
        password_confirmation: createForm.password_confirmation || undefined,
      });
      setUsers(prev => [res.user, ...prev]);
      setTotal(t => t + 1);
      closeModal();
      toast.success(res.password_reset
        ? (isAR ? 'تم إنشاء الحساب وإرسال رابط تعيين كلمة المرور' : 'Account created. Password reset link sent.')
        : (isAR ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully.')
      );

      if (res.user && res.user.email) {
        const gmailUrl = generateGmailUrl(res.user.email, res.user.name);
        window.open(gmailUrl, '_blank');
      }
    } catch (err: any) {

      if (err?.response?.status === 422) {
        const apiErrors = err.response.data?.errors ?? {};
        const mapped: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([k, v]) => { mapped[k] = (v as string[])[0]; });
        setFieldErrors(mapped);
      } else {
        toast.error(isAR ? 'فشل إنشاء الحساب' : 'Failed to create account.');
      }
    } finally {

      setIsSubmitting(false);
    }
  };

  // ── Password Reset Actions ─────────────────────────────────────────────────
  const handleApprovePasswordReset = async (id: number) => {
    try {
      const res = await adminService.approvePasswordReset(id);
      setPasswordResets(prev => prev.filter(r => r.id !== id));
      toast.success(isAR ? 'تمت الموافقة على إعادة تعيين كلمة المرور.' : 'Password reset approved.');
      
      const gmailUrl = generatePasswordResetGmailUrl(res.email, res.full_name, res.verification_code);
      window.open(gmailUrl, '_blank');
    } catch {
      toast.error(isAR ? 'حدث خطأ' : 'An error occurred.');
    }
  };

  const handleRejectPasswordReset = async (id: number) => {
    try {
      await adminService.rejectPasswordReset(id);
      setPasswordResets(prev => prev.filter(r => r.id !== id));
      toast.info(isAR ? 'تم رفض طلب إعادة التعيين.' : 'Reset request rejected.');
    } catch {
      toast.error(isAR ? 'حدث خطأ' : 'An error occurred.');
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role, organization: user.organization ?? '', status: user.status, phone: user.phone ?? '' });
    setPendingSuspend(false);
    setFieldErrors({});
    setModal('edit');
  };

  const handleEditStatusChange = (newStatus: string) => {
    if (newStatus === 'suspended' && selectedUser?.status !== 'suspended') {
      setPendingSuspend(true);
    } else {
      setPendingSuspend(false);
      setEditForm(f => ({ ...f, status: newStatus }));
    }
  };

  const confirmSuspend = () => {
    setEditForm(f => ({ ...f, status: 'suspended' }));
    setPendingSuspend(false);
    setModal('edit');
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await adminService.updateUser(selectedUser.id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        organization: editForm.organization || undefined,
        status: editForm.status,
        phone: editForm.phone || undefined,
      });
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? res.user : u));
      closeModal();
      const msg = res.tokens_revoked
        ? (isAR ? 'تم تعليق الحساب وإلغاء جميع الجلسات النشطة' : 'Account suspended. All active sessions revoked.')
        : (isAR ? 'تم تحديث بيانات المستخدم' : 'User updated successfully.');
      toast.success(msg);
    } catch (err: any) {

      if (err?.response?.status === 422) {
        const apiErrors = err.response.data?.errors ?? {};
        const mapped: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([k, v]) => { mapped[k] = (v as string[])[0]; });
        setFieldErrors(mapped);
      } else {
        toast.error(isAR ? 'فشل تحديث المستخدم' : 'Failed to update user.');
      }
    } finally {

      setIsSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const openDelete = (user: AdminUser) => {
    setSelectedUser(user);
    setModal('delete-confirm');
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await adminService.deleteUser(selectedUser.id);
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setTotal(t => t - 1);
      closeModal();
      toast.success(isAR ? 'تم إلغاء وصول المستخدم والحفاظ على السجلات التاريخية' : 'User access revoked. Historical records preserved.');
    } catch {
      toast.error(isAR ? 'فشل حذف المستخدم' : 'Failed to delete user.');
    } finally {

      setIsSubmitting(false);
    }
  };

  // ── Close modal ────────────────────────────────────────────────────────────
  const closeModal = () => {
    setModal(null);
    setSelectedUser(null);
    setFieldErrors({});
    setIsSubmitting(false);
    setPendingSuspend(false);
    setCreateForm({ name: '', email: '', role: '', organization: '', password: '', password_confirmation: '' });
    setShowPassword(false);
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString(isAR ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return d; }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-full space-y-6" dir={isAR ? 'rtl' : 'ltr'}>
      {/* ── Header ── */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {isAR ? 'دليل المستخدمين' : 'User Directory'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {isAR ? `إجمالي ${total} مستخدم` : `${total} total users`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchUsers(currentPage)} className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors shadow-sm flex items-center justify-center min-w-[34px] min-h-[34px]">
            {isLoading ? <LoadingIndicator type="line-spinner" size="xs" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setModal('create'); setFieldErrors({}); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            {isAR ? 'إنشاء مستخدم' : 'Create User'}
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute ${isAR ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isAR ? 'ابحث باسم أو بريد إلكتروني...' : 'Search by name or email...'}
            className={`w-full ${isAR ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm`}
          />
        </div>

        {/* Role filter */}
        <div className="relative">
          <Filter className={`absolute ${isAR ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none`} />
          <select
            value={filterRole}
            onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}
            className={`${isAR ? 'pr-9 pl-8' : 'pl-9 pr-8'} py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none`}
          >
            <option value="">{isAR ? 'كل الأدوار' : 'All Roles'}</option>
            {ROLES.map(r => <option key={r} value={r}>{getTranslatedRole(r, language)}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 pr-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none"
          >
            <option value="">{isAR ? 'كل الحالات' : 'All Statuses'}</option>
            {STATUSES.map(s => <option key={s} value={s}>{getTranslatedStatus(s, language)}</option>)}
          </select>
        </div>

        {/* Clear filters */}
        {(filterRole || filterStatus || search) && (
          <button
            onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus(''); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {isAR ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {/* ── Password Reset Requests (Big Red Card) ── */}
      {passwordResets.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-6 shadow-md mb-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-300">
              {isAR ? 'طلبات إعادة تعيين كلمة المرور المعلقة' : 'Pending Password Reset Requests'}
            </h3>
          </div>
          <div className="space-y-4">
            {passwordResets.map(req => (
              <div key={req.id} className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-lg border border-red-200 dark:border-red-900/30">
                <div className="mb-4 sm:mb-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{req.user?.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{req.email}</p>
                  <p className="text-xs text-slate-500 mt-1">{isAR ? 'تاريخ الطلب:' : 'Requested at:'} {new Date(req.created_at).toLocaleString(isAR ? 'ar' : 'en')}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => handleRejectPasswordReset(req.id)}
                    className="flex-1 sm:flex-none px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg font-medium text-sm transition-colors"
                  >
                    {isAR ? 'رفض' : 'Reject'}
                  </button>
                  <button 
                    onClick={() => handleApprovePasswordReset(req.id)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                  >
                    {isAR ? 'موافقة وإرسال الرمز' : 'Approve & Send Code'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Data Grid ── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingIndicator type="line-spinner" size="lg" label={isAR ? 'جاري التحميل...' : 'Loading users...'} />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg mb-3">
              <Users className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="font-semibold text-slate-900 dark:text-slate-50">{isAR ? 'لا يوجد مستخدمون' : 'No users found'}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{isAR ? 'جرّب تغيير معايير البحث' : 'Try adjusting your filters'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  {['User', 'Role', 'Status', 'Organization', 'Created', 'Actions'].map((h, i) => (
                    <th key={i} className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap ${isAR ? 'text-right' : ''}`}>
                      {isAR ? (['المستخدم','الدور','الحالة','المنظمة','تاريخ الإنشاء','الإجراءات'][i]) : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/25 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} />
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-50 text-sm">{user.name}</div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><RoleBadge role={user.role} language={language} /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={user.status} language={language} /></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm">{user.organization || <span className="opacity-50">—</span>}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(user)}
                          title={isAR ? 'تعديل' : 'Edit'}
                          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDelete(user)}
                          title={isAR ? 'حذف' : 'Delete'}
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {isAR ? `صفحة ${currentPage} من ${lastPage}` : `Page ${currentPage} of ${lastPage}`}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchUsers(p); }}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className={`w-4 h-4 ${isAR ? 'rotate-180' : ''}`} />
              </button>
              {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                const p = Math.max(1, currentPage - 2) + i;
                if (p > lastPage) return null;
                return (
                  <button
                    key={p}
                    onClick={() => { setCurrentPage(p); fetchUsers(p); }}
                    className={`min-w-[28px] h-7 rounded text-xs font-medium transition-colors ${p === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchUsers(p); }}
                disabled={currentPage === lastPage}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className={`w-4 h-4 ${isAR ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
             onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          
          {/* Create User */}
          {modal === 'create' && (
            <div className="bg-[var(--bg-card)] rounded-lg shadow-xl border border-[var(--border-color)] max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 text-[var(--text-primary)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    {isAR ? 'إنشاء حساب جديد' : 'Create New Account'}
                  </h2>
                </div>
                <button onClick={closeModal} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label={isAR ? 'الاسم الكامل' : 'Full Name'} error={fieldErrors.name}>
                    <Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} error={fieldErrors.name} />
                  </Field>
                  <Field label={isAR ? 'البريد الإلكتروني' : 'Email'} error={fieldErrors.email}>
                    <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} error={fieldErrors.email} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={createForm.role === 'agent' ? 'col-span-1' : 'col-span-2'}>
                    <Field label={isAR ? 'الدور' : 'Role'} error={fieldErrors.role}>
                      <Select 
                        value={createForm.role} 
                        onChange={e => {
                          const newRole = e.target.value;
                          setCreateForm(f => ({ 
                            ...f, 
                            role: newRole, 
                            organization: newRole === 'agent' ? f.organization : '' 
                          }));
                        }} 
                        error={fieldErrors.role}
                      >
                        <option value="">{isAR ? 'اختر دوراً' : 'Select a role'}</option>
                        {ROLES.map(r => <option key={r} value={r}>{getTranslatedRole(r, language)}</option>)}
                      </Select>
                    </Field>
                  </div>
                  {createForm.role === 'agent' && (
                    <div className="col-span-1">
                      <Field label={isAR ? 'المنظمة (اختياري)' : 'Organization (opt.)'} error={fieldErrors.organization}>
                        <Input value={createForm.organization} onChange={e => setCreateForm(f => ({ ...f, organization: e.target.value }))} error={fieldErrors.organization} />
                      </Field>
                    </div>
                  )}
                </div>
                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-4">
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-1 uppercase tracking-wider">{isAR ? 'كلمة المرور (اختياري)' : 'Password (optional)'}</p>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">{isAR ? 'إذا تُركت فارغة، سيُرسَل رابط التعيين للمستخدم.' : 'If empty, a setup link will be emailed.'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="relative">
                        <Input 
                          type={showPassword ? 'text' : 'password'} 
                          value={createForm.password} 
                          onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} 
                          placeholder={isAR ? 'كلمة المرور' : 'Password'} 
                          error={fieldErrors.password}
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)} className={`absolute ${isAR ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}>
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.password && <p className="mt-1 text-red-600 dark:text-red-400 text-xs font-medium">{fieldErrors.password}</p>}
                      {createForm.password && (
                        <div className="mt-2 space-y-1.5">
                          {(() => {
                            const pStrength = getPasswordStrength(createForm.password);
                            return (
                              <>
                                <div className="flex gap-1 h-1">
                                  {[...Array(4)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={`flex-1 rounded-sm transition-colors ${
                                        i < pStrength.strength ? pStrength.color : "bg-slate-200 dark:bg-slate-700"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{pStrength.label}</p>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <div>
                      <Input 
                        type="password" 
                        value={createForm.password_confirmation} 
                        onChange={e => setCreateForm(f => ({ ...f, password_confirmation: e.target.value }))} 
                        placeholder={isAR ? 'تأكيد' : 'Confirm'} 
                        error={fieldErrors.password_confirmation}
                      />
                      {fieldErrors.password_confirmation && <p className="mt-1 text-red-600 dark:text-red-400 text-xs font-medium">{fieldErrors.password_confirmation}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
                <button onClick={closeModal} className="flex-1 py-2 border border-[var(--border-color)] hover:bg-[var(--surface-highlight)] text-[var(--text-primary)] rounded-lg font-medium transition-colors text-sm">
                  {isAR ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={handleCreate} disabled={isSubmitting} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2">
                  {isSubmitting ? <Spinner /> : null} {isAR ? 'إنشاء' : 'Create'}
                </button>
              </div>
            </div>
          )}

          {/* Edit User */}
          {modal === 'edit' && selectedUser && (
            <div className="bg-[var(--bg-card)] rounded-lg shadow-xl border border-[var(--border-color)] max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 text-[var(--text-primary)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedUser.name} size="md" />
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">{isAR ? 'تعديل المستخدم' : 'Edit User'}</h2>
                    <p className="text-[var(--text-secondary)] text-xs">{selectedUser.email}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label={isAR ? 'الاسم' : 'Name'} error={fieldErrors.name}>
                    <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} error={fieldErrors.name} />
                  </Field>
                  <Field label={isAR ? 'البريد الإلكتروني' : 'Email'} error={fieldErrors.email}>
                    <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} error={fieldErrors.email} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={isAR ? 'الدور' : 'Role'} error={fieldErrors.role}>
                    <Select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} error={fieldErrors.role}>
                      {ROLES.map(r => <option key={r} value={r}>{getTranslatedRole(r, language)}</option>)}
                    </Select>
                  </Field>
                  <Field label={isAR ? 'المنظمة' : 'Organization'}>
                    <Input value={editForm.organization} onChange={e => setEditForm(f => ({ ...f, organization: e.target.value }))} />
                  </Field>
                </div>
                <Field label={isAR ? 'الحالة' : 'Status'} error={fieldErrors.status}>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {STATUSES.map(s => {
                      const cfg = STATUS_CONFIG[s];
                      const sel = editForm.status === s;
                      return (
                        <button key={s} type="button" onClick={() => handleEditStatusChange(s)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded border transition-colors text-xs font-semibold ${sel ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)]'}`}>
                          {cfg.icon}
                          {isAR ? cfg.ar : cfg.en}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                {editForm.status === 'suspended' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed">{isAR ? 'إشعار: سيتم إلغاء الجلسات النشطة.' : 'Note: Active sessions will be revoked.'}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
                <button onClick={closeModal} className="flex-1 py-2 border border-[var(--border-color)] hover:bg-[var(--surface-highlight)] text-[var(--text-primary)] rounded-lg font-medium transition-colors text-sm">
                  {isAR ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={handleUpdate} disabled={isSubmitting} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2">
                  {isSubmitting ? <Spinner /> : null} {isAR ? 'تحديث' : 'Update'}
                </button>
              </div>
            </div>
          )}

          {/* Suspend Confirmation */}
          {modal === 'edit' && pendingSuspend && (
            <div className="bg-[var(--bg-card)] rounded-lg shadow-xl border border-[var(--border-color)] max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200 z-50 text-[var(--text-primary)]">
               <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                 <ShieldOff className="w-6 h-6 text-amber-600 dark:text-amber-400" />
               </div>
               <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{isAR ? 'تأكيد التعليق' : 'Confirm Suspension'}</h3>
               <p className="text-[var(--text-secondary)] text-sm mb-6">{isAR ? 'سيلغي هذا جميع جلسات المستخدم.' : 'This will immediately revoke active sessions.'}</p>
               <div className="flex gap-3">
                 <button onClick={() => setPendingSuspend(false)} className="flex-1 py-2 border border-[var(--border-color)] hover:bg-[var(--surface-highlight)] text-[var(--text-primary)] rounded-lg font-medium transition-colors text-sm">
                   {isAR ? 'تراجع' : 'Back'}
                 </button>
                 <button onClick={confirmSuspend} className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors text-sm">
                   {isAR ? 'تأكيد' : 'Confirm'}
                 </button>
               </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {modal === 'delete-confirm' && selectedUser && (
            <div className="bg-[var(--bg-card)] rounded-lg shadow-xl border border-[var(--border-color)] max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200 text-[var(--text-primary)]">
               <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
               </div>
               <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{isAR ? 'إلغاء الوصول' : 'Revoke Access'}</h3>
               <p className="text-[var(--text-secondary)] text-sm mb-4">{isAR ? `سيتم منع ${selectedUser.name} من الدخول مع حفظ السجلات.` : `Revoke access for ${selectedUser.name}? Records will be kept.`}</p>
               <div className="flex gap-3">
                 <button onClick={closeModal} className="flex-1 py-2 border border-[var(--border-color)] hover:bg-[var(--surface-highlight)] text-[var(--text-primary)] rounded-lg font-medium transition-colors text-sm">
                   {isAR ? 'إلغاء' : 'Cancel'}
                 </button>
                 <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex justify-center items-center gap-2">
                   {isSubmitting ? <Spinner /> : null} {isAR ? 'حذف' : 'Revoke'}
                 </button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
