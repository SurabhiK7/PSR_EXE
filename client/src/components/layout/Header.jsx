import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from '@fluentui/react-components';
import { Search24Regular, Person24Regular, SignOut24Regular } from '@fluentui/react-icons';
import { getCurrentUser, logout } from '../../auth/localAuth.js';

export default function Header() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/projects?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header
      style={{
        height: 'var(--pcp-header-height)',
        borderBottom: '1px solid var(--pcp-border)',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 5,
        boxShadow: '0 1px 0 rgba(15,44,87,0.04), 0 2px 8px rgba(15,44,87,0.04)',
      }}
    >
      <form onSubmit={handleSearch} style={{ width: 440, maxWidth: '45vw' }}>
        <Input
          contentBefore={<Search24Regular style={{ color: 'var(--pcp-text-secondary)' }} />}
          placeholder="Search by PR-ID or Account Name"
          value={query}
          onChange={(e, data) => setQuery(data.value)}
          style={{ width: '100%', borderRadius: 8 }}
        />
      </form>
      {currentUser ? (
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" icon={<Person24Regular />}>
              {currentUser.name}
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<SignOut24Regular />} onClick={handleLogout}>
                Log Out
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      ) : (
        <Button appearance="primary" icon={<Person24Regular />} onClick={() => navigate('/login')}>
          Log In
        </Button>
      )}
    </header>
  );
}
