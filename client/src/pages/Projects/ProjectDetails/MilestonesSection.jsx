import { useEffect, useState } from 'react';
import {
  Button, Field, Dropdown, Option,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
} from '@fluentui/react-components';
import { Add24Regular, Edit20Regular, Delete20Regular } from '@fluentui/react-icons';
import api from '../../../api/client.js';
import EmptyState from '../../../components/common/EmptyState.jsx';
import ConfirmDeleteDialog from '../../../components/common/ConfirmDeleteDialog.jsx';
import StatusBadge from '../../../components/common/StatusBadge.jsx';
import DateInput from '../../../components/common/DateInput.jsx';
import { formatDate, toInputDate } from '../../../utils/format.js';
import { ragColors, ragMeanings } from '../../../theme/theme.js';

const STATUS_CODES = ['Green', 'Yellow', 'Red', 'Blue'];
const STATUS_MEANINGS = ragMeanings;
const PHASE_OPTIONS = ['Initiation', 'Service Planning', 'Service Implementation', 'Testing and Validation', 'Handover', 'Closure'];
// Brighter dot colors than the theme's badge text colors (which are darkened for text contrast).
const STATUS_DOT_COLORS = { ...Object.fromEntries(Object.entries(ragColors).map(([k, v]) => [k, v.fg])), Yellow: '#F2B705', Blue: '#0B6FCE' };

const emptyForm = { phase: '', baselineStartDate: '', forecastActualStartDate: '', baselineEndDate: '', forecastActualEndDate: '', status: 'Green' };

export default function MilestonesSection({ project }) {
  const [milestones, setMilestones] = useState([]);
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
      .get(`/projects/${project._id}/milestones`)
      .then((res) => setMilestones(res.data))
      .catch(() => setMilestones([]))
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

  function openEdit(m) {
    setEditing(m);
    setForm({
      phase: m.phase || '',
      baselineStartDate: toInputDate(m.baselineStartDate),
      forecastActualStartDate: toInputDate(m.forecastActualStartDate),
      baselineEndDate: toInputDate(m.baselineEndDate),
      forecastActualEndDate: toInputDate(m.forecastActualEndDate),
      status: m.status || 'Green',
    });
    setError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.phase) {
      setError('Phase is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/milestones/${editing._id}`, { ...form, updatedBy: project.projectManager });
      } else {
        await api.post(`/projects/${project._id}/milestones`, { ...form, addedBy: project.projectManager });
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save milestone.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(reason) {
    await api.delete(`/milestones/${deleteTarget._id}`, { data: { reason, deletedBy: project.projectManager } });
    load();
  }

  return (
    <section className="pcp-card" style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="pcp-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Project Milestones</div>
        <Button size="small" icon={<Add24Regular />} onClick={openAdd}>Add Milestone</Button>
      </div>

      {milestones.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 14 }}>
          {STATUS_CODES.map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--pcp-text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT_COLORS[s], flexShrink: 0 }} />
              {STATUS_MEANINGS[s]}
            </div>
          ))}
        </div>
      )}

      <div className="pcp-table-wrapper">
        {milestones.length ? (
          <table className="pcp-table">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Baseline Start Date</th>
                <th>Forecast/Actual Start Date</th>
                <th>Baseline End Date</th>
                <th>Forecast/Actual End Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m._id}>
                  <td style={{ fontWeight: 600 }}>{m.phase}</td>
                  <td>{formatDate(m.baselineStartDate)}</td>
                  <td>{formatDate(m.forecastActualStartDate)}</td>
                  <td>{formatDate(m.baselineEndDate)}</td>
                  <td>{formatDate(m.forecastActualEndDate)}</td>
                  <td><StatusBadge value={m.status} type="rag" label={STATUS_MEANINGS[m.status] || m.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="small" icon={<Edit20Regular />} onClick={() => openEdit(m)}>Edit</Button>
                      <Button size="small" icon={<Delete20Regular />} onClick={() => setDeleteTarget(m)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !loading && <EmptyState title="No milestones available" message="Add project milestones to track key delivery dates." />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(e, d) => setDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editing ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
              <Field label="Phase" required>
                <Dropdown
                  value={form.phase}
                  selectedOptions={[form.phase]}
                  onOptionSelect={(e, d) => update('phase', d.optionValue)}
                  placeholder="Select phase"
                >
                  {PHASE_OPTIONS.map((p) => (
                    <Option key={p} value={p} text={p}>
                      {p}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Baseline Start Date">
                <DateInput value={form.baselineStartDate} onChange={(e, d) => update('baselineStartDate', d.value)} />
              </Field>
              <Field label="Forecast/Actual Start Date">
                <DateInput value={form.forecastActualStartDate} onChange={(e, d) => update('forecastActualStartDate', d.value)} />
              </Field>
              <Field label="Baseline End Date">
                <DateInput value={form.baselineEndDate} onChange={(e, d) => update('baselineEndDate', d.value)} />
              </Field>
              <Field label="Forecast/Actual End Date">
                <DateInput value={form.forecastActualEndDate} onChange={(e, d) => update('forecastActualEndDate', d.value)} />
              </Field>
              <Field label="Status">
                <Dropdown
                  value={form.status}
                  selectedOptions={[form.status]}
                  onOptionSelect={(e, d) => update('status', d.optionValue)}
                  button={{
                    children: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT_COLORS[form.status], flexShrink: 0 }} />
                        {form.status}
                      </span>
                    ),
                  }}
                >
                  {STATUS_CODES.map((s) => (
                    <Option key={s} value={s} text={s}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT_COLORS[s], flexShrink: 0 }} />
                        {s} <span style={{ color: 'var(--pcp-text-secondary)' }}>&ndash; {STATUS_MEANINGS[s]}</span>
                      </span>
                    </Option>
                  ))}
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
        title="Delete Milestone"
        itemLabel={deleteTarget?.phase}
        onConfirm={handleDelete}
      />
    </section>
  );
}
