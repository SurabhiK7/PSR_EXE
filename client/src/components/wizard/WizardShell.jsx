import { Button, Spinner } from '@fluentui/react-components';
import {
  ArrowLeft24Regular,
  ArrowRight24Regular,
  Save24Regular,
  DocumentSearch24Regular,
  CheckmarkCircle24Regular,
  Checkmark24Regular,
  ChevronRight12Regular,
  Send24Regular,
} from '@fluentui/react-icons';

/**
 * Shared shell for the Create PSR / Update PSR multi-step wizards.
 * Renders a step tracker across the top and a consistent action bar
 * (Previous / Save as Draft / Preview / Send / Submit / Next) across the bottom,
 * matching the approved wireframe flow.
 */
export default function WizardShell({
  steps,
  activeStep,
  onStepClick,
  allowStepJump,
  furthestStep,
  children,
  onPrevious,
  onNext,
  onSaveDraft,
  onPreview,
  onSubmit,
  onSend,
  saving,
  savingLabel,
  isLastStep,
  error,
  info,
}) {
  return (
    <div>
      <div className="pcp-card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isDone = index < activeStep || (furthestStep !== undefined && index < furthestStep);
            const clickable = allowStepJump || index <= furthestStep;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: index < steps.length - 1 ? '1 1 auto' : '0 0 auto' }}>
                <button
                  type="button"
                  onClick={() => clickable && onStepClick?.(index)}
                  disabled={!clickable}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: clickable ? 'pointer' : 'default',
                    fontFamily: 'inherit',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                      color: isActive || isDone ? '#fff' : 'var(--pcp-text-secondary)',
                      background: isActive ? 'var(--pcp-brand)' : isDone ? '#0E7A2E' : '#EEF0F3',
                      boxShadow: isActive ? '0 0 0 3px rgba(11, 111, 206, 0.16)' : 'none',
                      transition: 'background-color 0.25s var(--pcp-ease), box-shadow 0.25s var(--pcp-ease)',
                    }}
                  >
                    {isDone && !isActive ? <Checkmark24Regular fontSize={12} /> : index + 1}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? '#101828' : 'var(--pcp-text-secondary)', whiteSpace: 'nowrap', transition: 'color 0.2s ease' }}>
                    {step.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight12Regular
                    style={{ flexShrink: 0, margin: '0 8px', color: isDone ? '#0E7A2E' : 'var(--pcp-border)', transition: 'color 0.3s var(--pcp-ease)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FCE8E8', border: '1px solid #EFA6A8', borderRadius: 8, color: '#B0272B', fontSize: 13 }}>
          {error}
        </div>
      )}
      {info && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#E6F4EA', border: '1px solid #9BD8AE', borderRadius: 8, color: '#0E7A2E', fontSize: 13 }}>
          {info}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>{children}</div>

      <div className="pcp-card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, position: 'sticky', bottom: 16 }}>
        <Button icon={<ArrowLeft24Regular />} onClick={onPrevious} disabled={activeStep === 0 || saving}>
          Previous
        </Button>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button icon={<Save24Regular />} onClick={onSaveDraft} disabled={saving}>
            {saving && savingLabel === 'draft' ? <Spinner size="tiny" /> : 'Save as Draft'}
          </Button>
          <Button icon={<DocumentSearch24Regular />} onClick={onPreview} disabled={saving}>
            Preview
          </Button>
          {isLastStep ? (
            <>
              {onSend && (
                <Button icon={<Send24Regular />} onClick={onSend} disabled={saving}>
                  {saving && savingLabel === 'send' ? <Spinner size="tiny" /> : 'Submit and Send Communication'}
                </Button>
              )}
              <Button appearance="primary" icon={<CheckmarkCircle24Regular />} onClick={onSubmit} disabled={saving}>
                {saving && savingLabel === 'submit' ? 'Submitting...' : 'Submit'}
              </Button>
            </>
          ) : (
            <Button appearance="primary" icon={<ArrowRight24Regular />} iconPosition="after" onClick={onNext} disabled={saving}>
              {saving && savingLabel === 'next' ? 'Saving...' : 'Next'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
