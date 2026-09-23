import { useState } from 'react';
import {
  Button, Field, Input, Textarea, Dropdown, Option,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
} from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/client.js';
import StatusBadge from '../../../components/common/StatusBadge.jsx';
import ConfirmDeleteDialog from '../../../components/common/ConfirmDeleteDialog.jsx';
import DateInput from '../../../components/common/DateInput.jsx';
import { formatDate, toInputDate } from '../../../utils/format.js';

const PROJECT_STAGES = ['In Progress', 'At Risk', 'Delayed', 'On Hold', 'Completed', 'Closed'];

export default function ProjectInfoSection({ project, onUpdated }) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function openEdit() {
    setForm({
      accountName: project.accountName || '',
      projectManager: project.projectManager || '',
      projectScope: project.projectScope || '',
      projectStartDate: toInputDate(project.projectStartDate),
      projectStage: project.projectStage || 'In Progress',
    });
    setError('');
    setEditOpen(true);
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.accountName || !form.projectManager || !form.projectStartDate) {
      setError('Please complete all required fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/projects/${project._id}`, { ...form, lastUpdatedBy: form.projectManager });
      onUpdated(res.data);
      setEditOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(reason) {
    await api.delete(`/projects/${project._id}`, { data: { reason, deletedBy: project.projectManager } });
    navigate('/projects');
  }

  return (
    <section className="pcp-card" style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div className="pcp-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Project Information</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="small" icon={<Edit24Regular />} onClick={openEdit}>Edit</Button>
          <Button size="small" icon={<Delete24Regular />} onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px 24px' }}>
        <InfoField label="PR-ID" value={project.prId} link />
        <InfoField label="Account Name" value={project.accountName} />
        <InfoField label="Project Manager" value={project.projectManager} />
        <InfoField label="Project Start Date" value={formatDate(project.projectStartDate)} />
        <InfoField label="Project Stage" value={<StatusBadge value={project.projectStage} type="stage" />} />
        <InfoField label="Last Updated" value={`${formatDate(project.lastUpdatedDate)} by ${project.lastUpdatedBy || '-'}`} />
      </div>

      {project.projectScope && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Project Scope</div>
          <div style={{ fontSize: 13.5, color: '#1F2937', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{project.projectScope}</div>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={(e, d) => setEditOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Edit Project Information</DialogTitle>
            {form && (
              <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
                <Field label="Account Name" required>
                  <Input value={form.accountName} onChange={(e, d) => update('accountName', d.value)} />
                </Field>
                <Field label="Project Manager" required>
                  <Input value={form.projectManager} onChange={(e, d) => update('projectManager', d.value)} />
                </Field>
                <Field label="Project Start Date" required>
                  <DateInput value={form.projectStartDate} onChange={(e, d) => update('projectStartDate', d.value)} />
                </Field>
                <Field label="Project Stage">
                  <Dropdown
                    value={form.projectStage}
                    selectedOptions={[form.projectStage]}
                    onOptionSelect={(e, d) => update('projectStage', d.optionValue)}
                  >
                    {PROJECT_STAGES.map((s) => <Option key={s} value={s}>{s}</Option>)}
                  </Dropdown>
                </Field>
                <Field label="Project Scope">
                  <Textarea rows={4} value={form.projectScope} onChange={(e, d) => update('projectScope', d.value)} />
                </Field>
                {error && <div style={{ color: '#C4314B', fontSize: 13 }}>{error}</div>}
              </DialogContent>
            )}
            <DialogActions style={{ marginTop: 8 }}>
              <Button onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
              <Button appearance="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project"
        itemLabel={`${project.prId} - ${project.accountName}`}
        onConfirm={handleDelete}
      />
    </section>
  );
}

function InfoField({ label, value, link }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
      <div className={link ? 'pcp-link-id' : ''} style={{ fontSize: 14, fontWeight: 600, color: link ? undefined : '#101828' }}>{value || '-'}</div>
    </div>
  );
}
