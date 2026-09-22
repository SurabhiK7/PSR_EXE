import { useEffect, useState } from 'react';
import {
  Button, Field, Input, Dropdown, Option,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
} from '@fluentui/react-components';
import { Add24Regular, Edit20Regular, Delete20Regular } from '@fluentui/react-icons';
import api from '../../api/client.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmDeleteDialog from '../../components/common/ConfirmDeleteDialog.jsx';
import { ORG_NAME } from '../../config/branding.js';

const GROUPS = [ORG_NAME, 'External'];
const emptyForm = { group: ORG_NAME, name: '', role: '', email: '', contactNumber: '' };

export default function ContactsSection({ project }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setLoading(true);
    api
      .get(`/projects/${project._id}/contacts`)
      .then((res) => setContacts(res.data))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, [project._id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAdd(group) {
    setEditing(null);
    setForm({ ...emptyForm, group });
    setError('');
    setDialogOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({ group: c.group, name: c.name || '', role: c.role || '', email: c.email || '', contactNumber: c.contactNumber || '' });
    setError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/contacts/${editing._id}`, { ...form, updatedBy: project.projectManager });
      } else {
        await api.post(`/projects/${project._id}/contacts`, { ...form, addedBy: project.projectManager });
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save contact.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(reason) {
    await api.delete(`/contacts/${deleteTarget._id}`, { data: { reason, deletedBy: project.projectManager } });
    load();
  }

  const orgContacts = contacts.filter((c) => c.group === ORG_NAME);
  const externalContacts = contacts.filter((c) => c.group === 'External');

  return (
    <section className="pcp-card" style={{ padding: 24, marginBottom: 20 }}>
      <div className="pcp-section-title">Key Contacts & Stakeholders</div>

      <ContactGroupTable
        title={ORG_NAME}
        contacts={orgContacts}
        loading={loading}
        onAdd={() => openAdd(ORG_NAME)}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />
      <div style={{ height: 20 }} />
      <ContactGroupTable
        title="External"
        contacts={externalContacts}
        loading={loading}
        onAdd={() => openAdd('External')}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Dialog open={dialogOpen} onOpenChange={(e, d) => setDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editing ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
              <Field label="Group">
                <Dropdown value={form.group} selectedOptions={[form.group]} onOptionSelect={(e, d) => update('group', d.optionValue)}>
                  {GROUPS.map((g) => <Option key={g} value={g}>{g}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Name" required>
                <Input value={form.name} onChange={(e, d) => update('name', d.value)} />
              </Field>
              <Field label="Role">
                <Input value={form.role} onChange={(e, d) => update('role', d.value)} />
              </Field>
              <Field label="Email">
                <Input value={form.email} onChange={(e, d) => update('email', d.value)} />
              </Field>
              <Field label="Contact Number">
                <Input value={form.contactNumber} onChange={(e, d) => update('contactNumber', d.value)} />
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
        title="Delete Contact"
        itemLabel={deleteTarget?.name}
        onConfirm={handleDelete}
      />
    </section>
  );
}

function ContactGroupTable({ title, contacts, loading, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>{title}</div>
        <Button size="small" icon={<Add24Regular />} onClick={onAdd}>Add {title} Contact</Button>
      </div>
      <div className="pcp-table-wrapper">
        {contacts.length ? (
          <table className="pcp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Contact Number</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.role || '-'}</td>
                  <td>{c.email || '-'}</td>
                  <td>{c.contactNumber || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="small" icon={<Edit20Regular />} onClick={() => onEdit(c)}>Edit</Button>
                      <Button size="small" icon={<Delete20Regular />} onClick={() => onDelete(c)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !loading && <EmptyState title={`No ${title} contacts`} message={`Add ${title} contacts to keep stakeholders informed.`} />
        )}
      </div>
    </div>
  );
}
