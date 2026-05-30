import React from 'react';

export const NotificationContext = React.createContext(null);

export function useNotifications() {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications() must be used inside <NotificationProvider>');
  }
  return ctx;
}
