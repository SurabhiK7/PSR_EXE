import { useEffect, useState } from 'react';
import {
  Button, Field, Input,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
} from '@fluentui/react-components';
import { Add24Regular, Edit20Regular, Delete20Regular } from '@fluentui/react-icons';
import api from '../../../api/client.js';
import EmptyState from '../../../components/common/EmptyState.jsx';
import ConfirmDeleteDialog from '../../../components/common/ConfirmDeleteDialog.jsx';
import PhoneNumberInput from '../../../components/common/PhoneNumberInput.jsx';
import { isValidEmail, isValidPhoneNumber, splitPhoneValue } from '../../../utils/validation.js';

const emptyForm = { name: '', role: '', email: '', contactNumber: '', company: '' };

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

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({
      name: c.name || '',
      role: c.role || '',
      email: c.email || '',
      contactNumber: c.contactNumber || '',
      company: c.company || '',
    });
    setError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name) {
      setError('Name is required.');
      return;
    }
    if (form.email && !isValidEmail(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.contactNumber) {
      const { dialCode, number } = splitPhoneValue(form.contactNumber);
      if (!isValidPhoneNumber(dialCode, number)) {
        setError('Please enter a valid phone number for the selected country code.');
        return;
      }
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

  return (
    <section className="pcp-card" style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="pcp-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Key Contacts / Stakeholders</div>
        <Button size="small" icon={<Add24Regular />} onClick={openAdd}>Add Contact</Button>
      </div>

      <div className="pcp-table-wrapper">
        {contacts.length ? (
          <table className="pcp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Contact No.</th>
                <th>Company</th>
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
                  <td>{c.company || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="small" icon={<Edit20Regular />} onClick={() => openEdit(c)}>Edit</Button>
                      <Button size="small" icon={<Delete20Regular />} onClick={() => setDeleteTarget(c)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !loading && <EmptyState title="No contacts available" message="Add key contacts and stakeholders to keep everyone informed." />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(e, d) => setDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editing ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
              <Field label="Name" required>
                <Input value={form.name} onChange={(e, d) => update('name', d.value)} />
              </Field>
              <Field label="Role">
                <Input value={form.role} onChange={(e, d) => update('role', d.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e, d) => update('email', d.value)} />
              </Field>
              <Field label="Contact No.">
                <PhoneNumberInput value={form.contactNumber} onChange={(v) => update('contactNumber', v)} />
              </Field>
              <Field label="Company">
                <Input value={form.company} onChange={(e, d) => update('company', d.value)} />
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
