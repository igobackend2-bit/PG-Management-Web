import React from 'react';
import { useUiStore } from '../../store/uiStore';
import './ToastContainer.scss';

export function ToastContainer() {
  const { toastQueue, dismissToast } = useUiStore();

  if (!toastQueue.length) return null;

  return (
    <div className="toast-container">
      {toastQueue.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'warning' && '⚠'}
            {toast.type === 'info' && 'ℹ'}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => dismissToast(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
