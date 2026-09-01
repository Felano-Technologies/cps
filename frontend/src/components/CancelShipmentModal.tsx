import { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Ban, Loader2 } from 'lucide-react';
import api from '../services/api';
import Modal from './Modal';
import { useToast } from '../contexts/ToastContext';
import type { Shipment } from '../types/models';

interface CancelShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment | null;
  onSuccess: (cancelledShipment: Shipment) => void;
}

const COMMON_REASONS = [
  'Changed my mind',
  'Delivery no longer needed',
  'Incorrect pickup or dropoff details',
  'Found alternative service',
  'Other',
];

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') {
    return err.response.data.error;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function CancelShipmentModal({
  isOpen,
  onClose,
  shipment,
  onSuccess,
}: CancelShipmentModalProps) {
  const toast = useToast();
  const [selectedReason, setSelectedReason] = useState<string>('Changed my mind');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !shipment) return null;

  const handleCancel = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const finalReason = selectedReason === 'Other' && customReason.trim()
        ? customReason.trim()
        : selectedReason;

      const { data } = await api.patch<Shipment>(`/shipments/${shipment.id}/cancel`, {
        reason: finalReason,
      });

      toast.success(`Order ${shipment.trackingCode} has been cancelled.`);
      onSuccess(data);
      onClose();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to cancel order. Please try again.');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={isSubmitting ? () => {} : onClose} title="Cancel Order" maxWidth="500px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: '#fee2e2',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #fca5a5'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#ef4444',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#991b1b' }}>
              Are you sure you want to cancel this order?
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: 1.4 }}>
              Order <strong style={{ color: '#0f172a' }}>#{shipment.trackingCode}</strong> will be cancelled. This action cannot be undone.
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
            Reason for cancellation (optional):
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {COMMON_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(reason)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: selectedReason === reason ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                  background: selectedReason === reason ? '#fee2e2' : '#ffffff',
                  color: selectedReason === reason ? '#991b1b' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {reason}
              </button>
            ))}
          </div>

          {selectedReason === 'Other' && (
            <textarea
              placeholder="Please specify your reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="shipments-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <Ban size={16} />
                Yes, Cancel Order
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
