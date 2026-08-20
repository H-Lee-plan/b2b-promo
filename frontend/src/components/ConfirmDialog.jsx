import { useEffect, useState } from 'react';
import './ConfirmDialog.css';

export default function ConfirmDialog({ open, title, message, confirmLabel = '확인', onConfirm, onCancel }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  return (
    <div className="confirm-dialog__scrim" onClick={onCancel}>
      <div
        className={`confirm-dialog${visible ? ' confirm-dialog--visible' : ''}`}
        role="alertdialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="confirm-dialog__title">{title}</p>
        {message && <p className="confirm-dialog__message">{message}</p>}
        <div className="confirm-dialog__actions">
          <button type="button" className="button button--secondary" onClick={onCancel}>
            취소
          </button>
          <button type="button" className="button button--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
