import api from './api';
import { Language } from '../App';

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: Language;
}

export interface UserProfileUpdate {
  name: string;
  email: string;
  phone?: string;
}

export interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
}

export const userService = {
  /**
   * Fetch full user settings including profile and preferences
   */
  fetchUserSettings: async () => {
    try {
      const response = await api.get('/user/profile');
      // response.data expected: { user: { ... }, preferences: { ... } }
      return response.data;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }
  },

  /**
   * Update basic user profile information
   */
  updateUserProfile: async (data: UserProfileUpdate) => {
    try {
      const response = await api.put('/user/profile', data);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  /**
   * Upload user avatar using FormData
   */
  uploadUserAvatar: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/user/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data; // Expected: { avatar_url: '...' }
    } catch (error) {
      console.error('Error uploading user avatar:', error);
      throw error;
    }
  },

  /**
   * Persist theme and language preferences to the backend
   */
  updateUserPreferences: async (preferences: UserPreferences) => {
    try {
      const response = await api.put('/user/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  },

  /**
   * Update user password
   */
  updateUserPassword: async (data: PasswordUpdate) => {
    try {
      const response = await api.put('/user/password', {
        current_password: data.currentPassword,
        password: data.newPassword,
        password_confirmation: data.newPassword, // Usually required by Laravel
      });
      return response.data;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  },

  /**
   * Update user signature
   */
  updateSignature: async (signatureBase64: string) => {
    try {
      const response = await api.put('/user/signature', { signature: signatureBase64 });
      return response.data;
    } catch (error) {
      console.error('Error updating signature:', error);
      throw error;
    }
  },
};
