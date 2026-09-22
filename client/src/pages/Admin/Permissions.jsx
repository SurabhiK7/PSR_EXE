import { useEffect, useState } from 'react';
import { Button, Spinner } from '@fluentui/react-components';
import { Checkmark16Regular, Save24Regular } from '@fluentui/react-icons';
import api from '../../api/client.js';
import PageHeader from '../../components/common/PageHeader.jsx';

export default function Permissions() {
  const [matrix, setMatrix] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/permissions').then((res) => {
      setMatrix(res.data.matrix);
      setRoles(res.data.roles);
      setPermissionKeys(res.data.permissionKeys);
    }).finally(() => setLoading(false));
  }, []);

  function toggle(role, key) {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [key]: !prev[role]?.[key] },
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.put('/permissions', { matrix });
      setMatrix(res.data.matrix);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !matrix) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Loading permissions..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Permissions" subtitle="Control what each role can do within the PSR Communication Tool." />

      <div className="pcp-table-wrapper" style={{ marginBottom: 20 }}>
        <table className="pcp-table">
          <thead>
            <tr>
              <th>Permission</th>
              {roles.map((role) => <th key={role} style={{ textAlign: 'center' }}>{role}</th>)}
            </tr>
          </thead>
          <tbody>
            {permissionKeys.map((key) => (
              <tr key={key}>
                <td>{key}</td>
                {roles.map((role) => (
                  <td key={role} style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => toggle(role, key)}
                      aria-label={`Toggle ${key} for ${role}`}
                      style={{
                        width: 26, height: 26, borderRadius: 6, border: '1px solid var(--pcp-border)',
                        background: matrix[role]?.[key] ? 'var(--pcp-brand)' : '#fff',
                        color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      {matrix[role]?.[key] && <Checkmark16Regular />}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Permissions'}
        </Button>
        {saved && <span style={{ color: '#0E7A2E', fontSize: 13 }}>Saved successfully.</span>}
      </div>
    </div>
  );
}
