import { useState, useEffect } from 'react';
import {
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
  Button, Field, Textarea,
} from '@fluentui/react-components';

/**
 * Generic confirmation dialog for deletions. Requires the user to type a reason,
 * which is passed to onConfirm(reason) and stored in the audit history on the server.
 */
export default function ConfirmDeleteDialog({ open, onOpenChange, title = 'Delete Item', itemLabel, onConfirm }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
      setDeleting(false);
    }
  }, [open]);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Please enter a reason for deletion.');
      return;
    }
    setDeleting(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(e, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            {itemLabel && (
              <div style={{ fontSize: 13.5, color: 'var(--pcp-text-secondary)' }}>
                Are you sure you want to delete <strong style={{ color: '#101828' }}>{itemLabel}</strong>? This cannot be undone.
              </div>
            )}
            <Field label="Reason for Deletion" required>
              <Textarea value={reason} onChange={(e, d) => setReason(d.value)} rows={3} placeholder="Explain why this record is being deleted..." disabled={deleting} />
            </Field>
            {error && <div style={{ color: '#C4314B', fontSize: 13 }}>{error}</div>}
          </DialogContent>
          <DialogActions style={{ marginTop: 8 }}>
            <Button onClick={() => onOpenChange(false)} disabled={deleting}>Cancel</Button>
            <Button appearance="primary" style={{ background: '#B0272B' }} onClick={handleConfirm} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
