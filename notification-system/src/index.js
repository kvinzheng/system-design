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

export { default as NotificationProvider } from './NotificationProvider.jsx';
export { useNotifications } from './context.js';
export { default as NotificationOverlay } from './components/NotificationOverlay.jsx';
export { default as SettingsPopover } from './components/SettingsPopover.jsx';
export { default as Banner } from './components/Banner.jsx';
export { default as OverflowPill } from './components/OverflowPill.jsx';
export { default as Toaster } from './components/Toaster.jsx';
export { toast, toastStore } from './internal/toastStore.js';
