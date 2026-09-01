import api from './api';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  organization?: string;
  status: string;
  phone?: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface AdminUserPagination {
  data: AdminUser[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  organization?: string;
  password?: string;
  password_confirmation?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: string;
  organization?: string;
  status?: string;
  rejection_reason?: string;
  phone?: string;
}

export const adminService = {
  getUsers: async (params: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    per_page?: number;
    trashed?: boolean;
  } = {}): Promise<AdminUserPagination> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  createUser: async (payload: CreateUserPayload): Promise<{ user: AdminUser; password_reset: boolean }> => {
    const response = await api.post('/admin/users', payload);
    return response.data;
  },

  updateUser: async (id: number, payload: UpdateUserPayload): Promise<{ user: AdminUser; tokens_revoked: boolean }> => {
    const response = await api.patch(`/admin/users/${id}`, payload);
    return response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  restoreUser: async (id: number): Promise<{ user: AdminUser }> => {
    const response = await api.post(`/admin/users/${id}/restore`);
    return response.data;
  },

  getPendingPasswordResets: async (): Promise<any[]> => {
    const response = await api.get('/admin/password-resets');
    return response.data;
  },

  approvePasswordReset: async (id: number): Promise<{ email: string; full_name: string; verification_code: string; message: string }> => {
    const response = await api.post(`/admin/password-resets/${id}/approve`);
    return response.data;
  },

  rejectPasswordReset: async (id: number): Promise<{ message: string }> => {
    const response = await api.post(`/admin/password-resets/${id}/reject`);
    return response.data;
  },
};
