// priority-notifications — React-only public API.
//
// Usage:
//   <NotificationProvider spamShield={{ trustedSenders: ['celebrity'] }}>
//     <YourApp />
//     <NotificationOverlay />
//   </NotificationProvider>
//
//   function SomeFeature() {
//     const { notify } = useNotifications();
//     return <button onClick={() => notify({ priority: 'medium', title: 'hi' })}>ping</button>;
//   }

export { default as NotificationProvider } from './NotificationProvider.js';
export { useNotifications } from './context.js';
export { default as NotificationOverlay } from './components/NotificationOverlay.js';
export { default as SettingsPopover } from './components/SettingsPopover.js';
export { default as Banner } from './components/Banner.js';
export { default as OverflowPill } from './components/OverflowPill.js';
export { default as Toaster } from './components/Toaster.js';
export { toast, toastStore } from './internal/toastStore.js';
