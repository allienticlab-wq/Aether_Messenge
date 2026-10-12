import React from 'react';
import { UnifiedAuthView } from '../auth/UnifiedAuthView.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'otp' | 'password' | 'signup' | 'qr';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'otp',
}) => {
  if (!isOpen) return null;

  return (
    <UnifiedAuthView
      mode="modal"
      onClose={onClose}
      defaultTab={defaultTab}
    />
  );
};
