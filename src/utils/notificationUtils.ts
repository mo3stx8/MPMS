import { translations } from './translations';
import { Language } from '../App';
import { NotificationItem } from '../hooks/useNotifications';

/**
 * Localizes a notification message based on its type and data.
 * Falls back to the original message if no translation template is found.
 */
export function getLocalizedNotificationMessage(notification: NotificationItem, language: Language): string {
  let type = notification.type;
  let data = notification.data;

  // Heuristic: If type is missing, try to infer it from common English message patterns (for legacy/existing notifications)
  if (!type && notification.message) {
    const message = notification.message;
    if (message.includes('anchorage request') && message.includes('approved')) {
      type = 'wharf_assigned';
      const vesselMatch = message.match(/vessel (.*?) has/);
      const wharfMatch = message.match(/Wharf (.*?) has/);
      data = { 
        vessel: vesselMatch ? vesselMatch[1] : 'Unknown', 
        wharf: wharfMatch ? wharfMatch[1] : 'Unknown' 
      };
    } else if (message.includes('discharged successfully')) {
      type = 'discharge_approved';
      const vesselMatch = message.match(/from (.*?) have/);
      data = { vessel: vesselMatch ? vesselMatch[1] : 'Unknown' };
    } else if (message.includes('declined') && message.includes('Discharge')) {
      type = 'discharge_declined';
      const vesselMatch = message.match(/for (.*?) has/);
      const reasonMatch = message.match(/Reason: (.*)/);
      data = { 
        vessel: vesselMatch ? vesselMatch[1] : 'Unknown',
        reason: reasonMatch ? reasonMatch[1] : 'Unknown' 
      };
    } else if (message.includes('awaiting arrival approval')) {
      type = 'vessel_awaiting_approval';
      const vesselMatch = message.match(/Vessel (.*?) is/);
      data = { name: vesselMatch ? vesselMatch[1] : 'Unknown' };
    } else if (message.includes('new arrival notification') || message.includes('submitted and is ready for review')) {
      type = 'vessel_awaiting_approval';
      const vesselMatch = message.match(/notification for (.*?) has/);
      data = { name: vesselMatch ? vesselMatch[1] : 'Unknown' };
    } else if (message.includes('withdrawn by agent')) {
      type = 'emergency_exit';
      const vesselMatch = message.match(/Vessel (.*?) \(IMO:/);
      const agentMatch = message.match(/withdrawn by agent (.*?)\. Reason:/);
      const reasonMatch = message.match(/Reason: (.*)/);
      data = { 
        vessel: vesselMatch ? vesselMatch[1] : 'Unknown',
        agent: agentMatch ? agentMatch[1] : 'Unknown',
        reason: reasonMatch ? reasonMatch[1] : 'Unknown'
      };
    } else if (message.includes('updated cargo manifest')) {
      type = 'manifest_updated';
      const vesselMatch = message.match(/for vessel (.*?)\./);
      data = { name: vesselMatch ? vesselMatch[1] : 'Unknown' };
    } else if (message.includes('updated arrival details')) {
      type = 'arrival_updated';
      const vesselMatch = message.match(/for vessel (.*?)\./);
      data = { name: vesselMatch ? vesselMatch[1] : 'Unknown' };
    } else if (message.includes('updated anchorage request')) {
      type = 'anchorage_request_updated';
      const vesselMatch = message.match(/for vessel (.*?)\./);
      data = { name: vesselMatch ? vesselMatch[1] : 'Unknown' };
    } else if (message.includes('updated port clearance request')) {
      type = 'clearance_updated';
      const vesselMatch = message.match(/for vessel (.*?)\./);
      data = { name: vesselMatch ? vesselMatch[1] : 'Unknown' };
    }
  }

  if (!type) {
    return notification.message;
  }

  const langTranslations = (translations as any)[language]?.notifications || (translations as any).en.notifications;
  const template = langTranslations[type];

  if (!template) {
    return notification.message;
  }

  // Handle data injection (placeholders like {vessel})
  let localized = template;
  const contextData = typeof data === 'object' && data !== null ? data : {};
  
  Object.entries(contextData).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    localized = localized.replace(new RegExp(placeholder, 'g'), String(value));
  });

  // Handle operationId as a generic {id} fallback if data.id is missing
  if (notification.operationId && localized.includes('{id}') && !contextData.id) {
    localized = localized.replace(/{id}/g, String(notification.operationId));
  }

  return localized;
}

/**
 * Translates the operation type/title of a notification.
 */
export function getLocalizedNotificationTitle(notification: NotificationItem, language: Language): string {
  let type = notification.type;

  // Infer type from message if missing to allow title translation for legacy items too
  if (!type && notification.message) {
    const message = notification.message;
    if (message.includes('anchorage request') && message.includes('approved')) {
      type = 'wharf_assigned';
    } else if (message.includes('discharged successfully')) {
      type = 'discharge_approved';
    } else if (message.includes('declined') && message.includes('Discharge')) {
      type = 'discharge_declined';
    } else if (message.includes('awaiting arrival approval')) {
      type = 'vessel_awaiting_approval';
    } else if (message.includes('new arrival notification') || message.includes('submitted and is ready for review')) {
      type = 'vessel_awaiting_approval';
    } else if (message.includes('withdrawn by agent')) {
      type = 'emergency_exit';
    } else if (message.includes('updated cargo manifest')) {
      type = 'manifest_updated';
    } else if (message.includes('updated arrival details')) {
      type = 'arrival_updated';
    } else if (message.includes('updated anchorage request')) {
      type = 'anchorage_request_updated';
    } else if (message.includes('updated port clearance request')) {
      type = 'clearance_updated';
    }
  }

  const lang = language === 'ar' ? 'ar' : 'en';

  const titles: Record<string, { ar: string; en: string }> = {
    arrival_approval_pending: { ar: 'موافقة وصول معلقة', en: 'Arrival Approval Pending' },
    vessel_awaiting_approval: { ar: 'انتظار موافقة الوصول', en: 'Awaiting Arrival Approval' },
    vessel_scheduled: { ar: 'جدولة الرسو للسفينة', en: 'Vessel Scheduled' },
    anchorage_request_new: { ar: 'طلب رسو جديد', en: 'New Anchorage Request' },
    wharf_assigned: { ar: 'تم تعيين الرصيف', en: 'Wharf Assigned' },
    vessel_waitlisted: { ar: 'السفينة في الانتظار', en: 'Vessel Waitlisted' },
    discharge_approved: { ar: 'موافقة على التفريغ', en: 'Discharge Approved' },
    discharge_declined: { ar: 'تفريغ مرفوض', en: 'Discharge Declined' },
    anchorage_timeout: { ar: 'انتهاء فترة الرسو', en: 'Anchorage Timeout' },
    arrival_updated: { ar: 'تحديث تفاصيل الوصول', en: 'Arrival Updated' },
    manifest_updated: { ar: 'تحديث بيان الشحن', en: 'Manifest Updated' },
    anchorage_request_updated: { ar: 'تحديث طلب الرسو', en: 'Anchorage Request Updated' },
    clearance_updated: { ar: 'تحديث طلب التصريح', en: 'Clearance Updated' },
    emergency_exit: { ar: 'سحب سفينة اضطراري', en: 'Emergency Vessel Exit' },
    arrival_approved: { ar: 'تمت الموافقة على الوصول', en: 'Arrival Approved' },
    arrival_rejected: { ar: 'تم رفض الوصول', en: 'Arrival Rejected' },
    anchorage_approved: { ar: 'تمت الموافقة على الرسو', en: 'Anchorage Approved' },
    anchorage_rejected: { ar: 'تم رفض الرسو', en: 'Anchorage Rejected' },
    user_approved: { ar: 'تم تفعيل الحساب', en: 'Account Approved' },
    user_rejected: { ar: 'تم رفض الحساب', en: 'Account Rejected' },
    discharge_request_new: { ar: 'طلب تفريغ جديد', en: 'New Discharge Request' },
    // Fallbacks for synthesized operationTypes
    arrival_approval: { ar: 'موافقة الوصول', en: 'Arrival Approval' },
    berth_assignment: { ar: 'تعيين الرصيف', en: 'Berth Assignment' },
    anchorage_request: { ar: 'طلب الرسو', en: 'Anchorage Request' },
    discharge_request: { ar: 'طلب التفريغ', en: 'Discharge Request' },
    notification: { ar: 'إشعار', en: 'Notification' }
  };

  // Normalize the lookup key (strip whitespace/slashes/case)
  let lookupKey = (type || String(notification.operationType))
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '');

  if (lookupKey.includes('approval') && !titles[lookupKey]) lookupKey = 'arrival_approval';
  if (lookupKey.includes('berth') && !titles[lookupKey]) lookupKey = 'berth_assignment';
  if (lookupKey.includes('anchorage') && !titles[lookupKey]) lookupKey = 'anchorage_request';
  if (lookupKey.includes('discharge') && !titles[lookupKey]) lookupKey = 'discharge_request';

  return titles[lookupKey]?.[lang] || String(notification.operationType);
}
