import { useOrgName } from '../../config/BrandingContext.jsx';

// Text-based wordmark reflecting the live admin-configured organization name (Admin > Settings),
// falling back to config/branding.js's ORG_NAME until that loads.
export default function OrgLogo({ height = 24, style }) {
  const orgName = useOrgName();
  return (
    <div
      role="img"
      aria-label={orgName}
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        fontSize: height * 0.7,
        fontWeight: 800,
        letterSpacing: '0.02em',
        color: '#0060BB',
        flexShrink: 0,
        ...style,
      }}
    >
      {orgName}
    </div>
  );
}
