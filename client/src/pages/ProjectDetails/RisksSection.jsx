import { useEffect, useState } from 'react';
import {
  Button, Field, Input, Textarea, Dropdown, Option,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
} from '@fluentui/react-components';
import { Add24Regular, Edit20Regular, Delete20Regular } from '@fluentui/react-icons';
import api from '../../api/client.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmDeleteDialog from '../../components/common/ConfirmDeleteDialog.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import DateInput from '../../components/common/DateInput.jsx';
import { formatDate, toInputDate } from '../../utils/format.js';

const IMPACT_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

const emptyForm = { date: '', description: '', impact: 'Medium', owner: '', mitigation: '' };

export default function RisksSection({ project }) {
  const [risks, setRisks] = useState([]);
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
      .get(`/projects/${project._id}/risks`)
      .then((res) => setRisks(res.data))
      .catch(() => setRisks([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, [project._id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, date: toInputDate(new Date()) });
    setError('');
    setDialogOpen(true);
  }

  function openEdit(r) {
    setEditing(r);
    setForm({
      date: toInputDate(r.date),
      description: r.description || '',
      impact: r.impact || 'Medium',
      owner: r.owner || '',
      mitigation: r.mitigation || '',
    });
    setError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.description) {
      setError('Description is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/risks/${editing._id}`, { ...form, updatedBy: project.projectManager });
      } else {
        await api.post(`/projects/${project._id}/risks`, { ...form, addedBy: project.projectManager });
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save risk.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(reason) {
    await api.delete(`/risks/${deleteTarget._id}`, { data: { reason, deletedBy: project.projectManager } });
    load();
  }

  return (
    <section className="pcp-card" style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="pcp-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Risks & Dependencies</div>
        <Button size="small" icon={<Add24Regular />} onClick={openAdd}>Add Risk</Button>
      </div>

      <div className="pcp-table-wrapper">
        {risks.length ? (
          <table className="pcp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Impact</th>
                <th>Owner</th>
                <th>Mitigation</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r._id}>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.description}</td>
                  <td><StatusBadge value={r.impact} type="impact" /></td>
                  <td>{r.owner || '-'}</td>
                  <td>{r.mitigation || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="small" icon={<Edit20Regular />} onClick={() => openEdit(r)}>Edit</Button>
                      <Button size="small" icon={<Delete20Regular />} onClick={() => setDeleteTarget(r)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !loading && <EmptyState title="No risks or dependencies recorded" message="Add a risk or dependency to keep stakeholders informed." />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(e, d) => setDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editing ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
              <Field label="Date">
                <DateInput value={form.date} onChange={(e, d) => update('date', d.value)} />
              </Field>
              <Field label="Description" required>
                <Textarea rows={3} value={form.description} onChange={(e, d) => update('description', d.value)} />
              </Field>
              <Field label="Impact">
                <Dropdown value={form.impact} selectedOptions={[form.impact]} onOptionSelect={(e, d) => update('impact', d.optionValue)}>
                  {IMPACT_LEVELS.map((i) => <Option key={i} value={i}>{i}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Owner">
                <Input value={form.owner} onChange={(e, d) => update('owner', d.value)} />
              </Field>
              <Field label="Mitigation">
                <Textarea rows={3} value={form.mitigation} onChange={(e, d) => update('mitigation', d.value)} />
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
        title="Delete Risk"
        itemLabel={deleteTarget?.description}
        onConfirm={handleDelete}
      />
    </section>
  );
}
