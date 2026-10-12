import React from 'react';
import { UnifiedAuthView } from '../auth/UnifiedAuthView.js';

interface WebQrLoginViewProps {
  onOpenMobileLogin?: () => void;
}

export const WebQrLoginView: React.FC<WebQrLoginViewProps> = () => {
  return (
    <UnifiedAuthView
      mode="fullscreen"
      defaultTab="qr"
    />
  );
};
