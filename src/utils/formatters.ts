import { translations } from './translations';
import { Language } from '../App';

/**
 * Utility to get translated labels for common system entities like statuses, roles, and types.
 */

export const getTranslatedStatus = (status: string, language: Language): string => {
  const s = status.toLowerCase().replace(/-/g, '_');
  const common = translations[language]?.common?.statuses || translations.en.common.statuses;
  
  // Map some backend variations to our translation keys
  const statusMap: Record<string, string> = {
    'approved': 'approved',
    'clearance_approved': 'clearance_approved',
    'rejected': 'rejected',
    'pending': 'pending',
    'pending_clearance': 'pending_clearance',
    'awaiting': 'awaiting',
    'awaiting_review': 'awaiting',
    'active': 'active',
    'inactive': 'inactive',
    'suspended': 'suspended',
    'departed': 'departed',
    'valid': 'valid',
    'expired': 'expired',
    'draft': 'draft',
    'expiring_soon': 'expiringSoon',
    'expiring-soon': 'expiringSoon',
    'wharf_assigned': 'wharf_assigned',
    'waiting': 'waiting',
  };

  const key = statusMap[s] || s;
  return (common as any)[key] || status;
};

export const getTranslatedVesselType = (type: string, language: Language): string => {
  const t = type.toLowerCase();
  const common = translations[language]?.common?.vesselTypes || translations.en.common.vesselTypes;
  
  const typeMap: Record<string, string> = {
    'container': 'container',
    'tanker': 'tanker',
    'cargo': 'cargo',
    'bulk': 'bulk',
    'general': 'general',
  };

  const key = typeMap[t] || t;
  return (common as any)[key] || type;
};

export const getTranslatedRole = (role: string, language: Language): string => {
  const r = role.toLowerCase();
  const common = translations[language]?.common?.roles || translations.en.common.roles;
  return (common as any)[r] || role;
};

export const getTranslatedCargoType = (type: string, language: Language): string => {
  const t = type.toLowerCase();
  const common = translations[language]?.common?.cargoTypes || translations.en.common.cargoTypes;
  return (common as any)[t] || type;
};

export const getManifestStatusLabel = (hasManifest: boolean, language: Language): string => {
  const common = translations[language]?.common?.manifest || translations.en.common.manifest;
  return hasManifest ? common.submitted : common.pending;
};
