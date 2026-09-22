import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home24Regular,
  Home24Filled,
  FolderAdd24Regular,
  FolderAdd24Filled,
  Folder24Regular,
  Folder24Filled,
  DataBarVertical24Regular,
  DataBarVertical24Filled,
  DocumentSave24Regular,
  DocumentSave24Filled,
  People24Regular,
  People24Filled,
  Settings24Regular,
  Settings24Filled,
  ShieldLock24Regular,
  ShieldLock24Filled,
  ChevronDown16Regular,
  ChevronRight16Regular,
  bundleIcon,
} from '@fluentui/react-icons';
import { sidebarTheme } from '../../theme/theme.js';
import OrgLogo from '../common/OrgLogo.jsx';

const HomeIcon = bundleIcon(Home24Filled, Home24Regular);
const CreateIcon = bundleIcon(FolderAdd24Filled, FolderAdd24Regular);
const ProjectsIcon = bundleIcon(Folder24Filled, Folder24Regular);
const ReportsIcon = bundleIcon(DataBarVertical24Filled, DataBarVertical24Regular);
const DraftsIcon = bundleIcon(DocumentSave24Filled, DocumentSave24Regular);
const UsersIcon = bundleIcon(People24Filled, People24Regular);
const SettingsIcon = bundleIcon(Settings24Filled, Settings24Regular);
const PermissionsIcon = bundleIcon(ShieldLock24Filled, ShieldLock24Regular);

const navItems = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/create-psr', label: 'Create PSR', icon: CreateIcon },
  { to: '/projects', label: 'My PSR', icon: ProjectsIcon },
  { to: '/drafts', label: 'Drafts', icon: DraftsIcon },
  { to: '/reports', label: 'Reports', icon: ReportsIcon },
  { to: '/users', label: 'Users', icon: UsersIcon },
];

const adminItems = [
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/admin/permissions', label: 'Permissions', icon: PermissionsIcon },
];

export default function Sidebar() {
  const location = useLocation();
  const [adminOpen, setAdminOpen] = useState(location.pathname.startsWith('/admin'));
  const adminActive = location.pathname.startsWith('/admin');

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 'var(--pcp-sidebar-width)',
        background: `linear-gradient(180deg, ${sidebarTheme.bgTop} 0%, ${sidebarTheme.bgBottom} 100%)`,
        borderRight: `1px solid ${sidebarTheme.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        boxShadow: '2px 0 12px rgba(5, 15, 30, 0.15)',
      }}
    >
      <div
        style={{
          height: 'var(--pcp-header-height)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 20px',
          borderBottom: `1px solid ${sidebarTheme.border}`,
        }}
      >
        <OrgLogo height={20} />
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: sidebarTheme.textActive, letterSpacing: '0.005em', whiteSpace: 'nowrap' }}>
            PSR Communication Tool
          </div>
        </div>
      </div>

      <nav style={{ padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `pcp-sidebar-link${isActive ? ' is-active' : ''}`}
            >
              <span className="pcp-sidebar-link-bar" />
              <Icon />
              {item.label}
            </NavLink>
          );
        })}

        <div
          style={{
            margin: '18px 14px 8px',
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: sidebarTheme.textMuted,
          }}
        >
          Administration
        </div>

        <button
          type="button"
          onClick={() => setAdminOpen((v) => !v)}
          className={`pcp-sidebar-link${adminActive ? ' is-active' : ''}`}
          style={{ border: 'none', background: adminActive ? undefined : 'transparent', fontFamily: 'inherit', cursor: 'pointer', width: '100%', textAlign: 'left' }}
        >
          <span className="pcp-sidebar-link-bar" />
          <ShieldLock24Regular />
          Admin
          <span style={{ marginLeft: 'auto', display: 'flex' }}>
            {adminOpen ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
          </span>
        </button>
        {adminOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 22, marginTop: 2 }}>
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `pcp-sidebar-link${isActive ? ' is-active' : ''}`}
                  style={{ fontSize: 13.5, padding: '9px 14px' }}
                >
                  <Icon fontSize={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}

