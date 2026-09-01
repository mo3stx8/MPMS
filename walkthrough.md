# Walkthrough - Unified Account Settings

I have implemented a unified and responsive **Account Settings** page that is accessible across all user roles (Trader, Port Officer, Maritime Agent, Wharf Officer, and Executive).

## Key Features

### 1. Unified Settings View
A new `AccountSettings.tsx` component has been created with a sleek, tabbed navigation layout. It includes:
- **Profile Management**: Update name, email, and phone number.
- **Avatar Upload**: Interactive file picker with real-time preview functionality.
- **Preferences**: Synchronized Theme (Light/Dark) and Language (Arabic/English) selectors.
- **Security**: Password management form with validation.

### 2. Global State Synchronization
The Theme and Language selectors in the Account Settings page are directly bound to the application's global state. Changing these settings instantly updates the entire UI, including RTL/LTR layout transitions.

### 3. Responsive Design & Role Agnosticism
The settings page is fully responsive and automatically identifies the user's role from the auth context to display personalized information.

### 4. Integrated Navigation
The existing user profile dropdown in the top navigation bar has been updated for **all roles** to include a functional link to the Account Settings page.

## Changes Made

### Frontend Components
- **[NEW] [AccountSettings.tsx](file:///d:/University/Univearsty/level_4/project3/Mukalla_port_system/src/components/AccountSettings.tsx)**: The core settings interface.
- **[MODIFY] [DashboardRouter.tsx](file:///d:/University/Univearsty/level_4/project3/Mukalla_port_system/src/components/DashboardRouter.tsx)**: Integrated the settings route and updated profile menus for Executive, Officer, Wharf, and Trader roles.
- **[MODIFY] [MainLayout.tsx](file:///d:/University/Univearsty/level_4/project3/Mukalla_port_system/src/components/MainLayout.tsx)**: Updated the profile menu for the Maritime Agent role.

### Utilities & Localization
- **[MODIFY] [translations.ts](file:///d:/University/Univearsty/level_4/project3/Mukalla_port_system/src/utils/translations.ts)**: Added comprehensive Arabic and English strings for the new settings interface.

## Verification Results

- ✅ **Navigation**: Verified that clicking "Account Settings" (or "إعدادات الحساب") in the profile dropdown opens the settings view.
- ✅ **Theming**: Verified that switching to Light/Dark mode in settings updates the CSS variables across the app.
- ✅ **Localization**: Verified that switching languages instantly toggles between RTL (Arabic) and LTR (English) layouts.
- ✅ **Validation**: Form validation for required fields and password strength is implemented and tested with toast notifications.
- ✅ **Responsive**: Layout adjusts correctly on mobile and desktop views.

> [!TIP]
> The avatar upload currently uses a local `FileReader` for the preview. To fully persist the avatar, the `handleUpdateProfile` function in `AccountSettings.tsx` should be wired to your backend API endpoint.
