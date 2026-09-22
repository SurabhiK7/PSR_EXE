import { useRef, useState } from 'react';
import { Button } from '@fluentui/react-components';
import { ArrowUpload24Regular, Document24Regular, Dismiss20Regular } from '@fluentui/react-icons';

function formatSize(bytes) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// Styled click-to-browse + drag-and-drop file picker, replacing a bare <input type="file">.
export default function FileDropZone({ file, onFileSelected, accept, disabled, hint = 'Any file type, up to 25 MB' }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  function pick(fileList) {
    const picked = fileList?.[0];
    if (picked) onFileSelected(picked);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        if (!disabled) pick(e.dataTransfer.files);
      }}
      style={{
        border: `1.5px dashed ${dragActive ? 'var(--pcp-brand)' : 'var(--pcp-border)'}`,
        borderRadius: 'var(--pcp-radius-lg)',
        padding: '22px 16px',
        textAlign: 'center',
        cursor: disabled ? 'default' : 'pointer',
        background: dragActive ? 'rgba(11, 111, 206, 0.06)' : 'var(--pcp-bg-page)',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => pick(e.target.files)}
        disabled={disabled}
      />
      {file ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Document24Regular style={{ color: 'var(--pcp-brand)', flexShrink: 0 }} />
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#101828', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)' }}>{formatSize(file.size)}</div>
          </div>
          <Button
            size="small"
            appearance="subtle"
            icon={<Dismiss20Regular />}
            onClick={(e) => {
              e.stopPropagation();
              onFileSelected(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            disabled={disabled}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <ArrowUpload24Regular style={{ color: 'var(--pcp-brand)' }} fontSize={26} />
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#101828' }}>Click to browse or drag & drop a file here</div>
          <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)' }}>{hint}</div>
        </div>
      )}
    </div>
  );
}
