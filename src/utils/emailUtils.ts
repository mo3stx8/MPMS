export const generateGmailUrl = (email: string, name: string): string => {
  const subject = 'Account Approved - تمت الموافقة على الحساب';

  const body = `عزيزي ${name}،

يسعدنا إبلاغك بأنه قد تمت الموافقة رسمياً على حسابك في نظام إدارة ميناء منارة.

يمكنك الآن تسجيل الدخول والوصول إلى لوحة التحكم الخاصة بك لإدارة عمليات الميناء. إذا كان لديك أي أسئلة أو كنت بحاجة إلى مساعدة، يرجى الرد على هذا البريد الإلكتروني أو الاتصال بفريق الدعم لدينا.

مرحباً بك معنا!

أطيب التحيات،
فريق الإدارة التنفيذية
نظام إدارة ميناء منارة

--------------------------------------------------

Dear ${name},

We are pleased to inform you that your account for the Manarah Port Management System has been officially approved. 

You can now log in and access your dashboard to manage your port operations. If you have any questions or require assistance, please reply to this email or contact our support team.

Welcome aboard!

Best regards,
Executive Admin Team
Manarah Port Management System`;

  const baseUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
  const toParam = `&to=${encodeURIComponent(email)}`;
  const suParam = `&su=${encodeURIComponent(subject)}`;
  const bodyParam = `&body=${encodeURIComponent(body)}`;

  return `${baseUrl}${toParam}${suParam}${bodyParam}`;
};

export const generatePasswordResetGmailUrl = (email: string, name: string, code: string): string => {
  const subject = 'Password Reset Code - رمز إعادة تعيين كلمة المرور';

  const body = `عزيزي ${name}،

لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في نظام إدارة ميناء منارة.

رمز التحقق الخاص بك هو: ${code}

يرجى إدخال هذا الرمز في النظام لإكمال عملية إعادة التعيين.

أطيب التحيات،
فريق الإدارة التنفيذية
نظام إدارة ميناء منارة

--------------------------------------------------

Dear ${name},

We received a request to reset your password for the Manarah Port Management System.

Your verification code is: ${code}

Please enter this code in the system to complete your password reset.

Best regards,
Executive Admin Team
Manarah Port Management System`;

  const baseUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
  const toParam = `&to=${encodeURIComponent(email)}`;
  const suParam = `&su=${encodeURIComponent(subject)}`;
  const bodyParam = `&body=${encodeURIComponent(body)}`;

  return `${baseUrl}${toParam}${suParam}${bodyParam}`;
};
