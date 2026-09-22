import OrgLogo from '../common/OrgLogo.jsx';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="pcp-auth-bg">
      <div className="pcp-auth-blob pcp-auth-blob-1" />
      <div className="pcp-auth-blob pcp-auth-blob-2" />
      <div className="pcp-auth-blob pcp-auth-blob-3" />
      <div className="pcp-auth-blob pcp-auth-blob-4" />
      <div className="pcp-auth-shine" />
      <div className="pcp-auth-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <OrgLogo height={34} />
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--pcp-text-secondary)', marginTop: 12, letterSpacing: '0.01em' }}>
            PSR Communication Tool
          </div>
        </div>
        <h1 style={{ fontSize: 25, fontWeight: 700, color: '#101828', margin: '0 0 8px' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14, color: 'var(--pcp-text-secondary)', margin: '0 0 28px', lineHeight: 1.55 }}>{subtitle}</p>}
        {children}
        {footer && <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--pcp-text-secondary)' }}>{footer}</div>}
      </div>
    </div>
  );
}
