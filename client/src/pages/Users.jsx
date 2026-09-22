import { useEffect, useState } from 'react';
import {
  Button, Field, Input, Dropdown, Option,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
} from '@fluentui/react-components';
import { Add24Regular, Edit20Regular, Delete20Regular, Person24Regular } from '@fluentui/react-icons';
import api from '../api/client.js';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDeleteDialog from '../components/common/ConfirmDeleteDialog.jsx';

const ROLES = ['Admin', 'Project Manager', 'Service Delivery Manager', 'Early Engagement Owner'];
const STATUSES = ['Active', 'Inactive'];
const emptyForm = { name: '', email: '', role: 'Project Manager', status: 'Active' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setLoading(true);
    api.get('/users').then((res) => setUsers(res.data)).catch(() => setUsers([])).finally(() => setLoading(false));
  }

  useEffect(load, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, role: u.role, status: u.status });
    setError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.email) {
      setError('Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/users/${editing._id}`, form);
      } else {
        await api.post('/users', form);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await api.delete(`/users/${deleteTarget._id}`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage the people who can access the PSR Communication Tool."
        actions={<Button appearance="primary" icon={<Add24Regular />} onClick={openAdd}>Add User</Button>}
      />

      <div className="pcp-table-wrapper">
        {users.length ? (
          <table className="pcp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <Person24Regular style={{ color: 'var(--pcp-brand)' }} />
                    {u.name}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                        background: u.status === 'Active' ? '#E6F4EA' : '#EEF0F3',
                        color: u.status === 'Active' ? '#0E7A2E' : '#5B6472',
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="small" icon={<Edit20Regular />} onClick={() => openEdit(u)}>Edit</Button>
                      <Button size="small" icon={<Delete20Regular />} onClick={() => setDeleteTarget(u)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !loading && <EmptyState title="No users yet" message="Add a user to get started." />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(e, d) => setDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
              <Field label="Name" required>
                <Input value={form.name} onChange={(e, d) => update('name', d.value)} />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={form.email} onChange={(e, d) => update('email', d.value)} />
              </Field>
              <Field label="Role">
                <Dropdown value={form.role} selectedOptions={[form.role]} onOptionSelect={(e, d) => update('role', d.optionValue)}>
                  {ROLES.map((r) => <Option key={r} value={r}>{r}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Status">
                <Dropdown value={form.status} selectedOptions={[form.status]} onOptionSelect={(e, d) => update('status', d.optionValue)}>
                  {STATUSES.map((s) => <Option key={s} value={s}>{s}</Option>)}
                </Dropdown>
              </Field>
              {error && <div style={{ color: '#C4314B', fontSize: 13 }}>{error}</div>}
            </DialogContent>
            <DialogActions style={{ marginTop: 8 }}>
              <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button appearance="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove User"
        itemLabel={deleteTarget?.name}
        onConfirm={handleDelete}
      />
    </div>
  );
}
