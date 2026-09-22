export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: subtitle ? 0 : 8, gap: 20 }}>
      <div style={{ display: 'flex', gap: 14 }}>
        <div className="pcp-page-header-accent" />
        <div>
          <h1 className="pcp-page-title">{title}</h1>
          {subtitle && <p className="pcp-page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}
