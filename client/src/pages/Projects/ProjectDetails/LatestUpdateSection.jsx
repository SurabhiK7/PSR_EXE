import { useEffect, useState } from 'react';
import { Button, Textarea, Field } from '@fluentui/react-components';
import { Save24Regular, DocumentSearch24Regular, Send24Regular } from '@fluentui/react-icons';
import api from '../../../api/client.js';
import { formatDateTime } from '../../../utils/format.js';
import PreviewCommunicationDialog from './PreviewCommunicationDialog.jsx';
import SendCommunicationDialog from './SendCommunicationDialog.jsx';

const emptyForm = { currentUpdate: '', nextSteps: '' };

export default function LatestUpdateSection({ project, onProjectUpdated, onHistoryChanged }) {
  const [latestUpdate, setLatestUpdate] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  function loadLatest() {
    api
      .get(`/projects/${project._id}/updates`)
      .then((res) => {
        const latest = res.data[0] || null;
        setLatestUpdate(latest);
        setForm(latest ? {
          currentUpdate: latest.currentUpdate || '',
          nextSteps: latest.nextSteps || '',
        } : emptyForm);
      })
      .catch(() => {});
  }

  useEffect(loadLatest, [project._id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function persist(isDraft) {
    const payload = { ...form, updatedBy: project.projectManager, isDraft };
    if (latestUpdate && latestUpdate.isDraft) {
      const res = await api.put(`/updates/${latestUpdate._id}`, payload);
      return res.data;
    }
    const res = await api.post(`/projects/${project._id}/updates`, payload);
    return res.data;
  }

  async function handleSaveDraft() {
    setSaving(true);
    setMessage('');
    try {
      const saved = await persist(true);
      setLatestUpdate(saved);
      setMessage('Saved as draft.');
      onHistoryChanged?.();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishThenSend() {
    setSaving(true);
    setMessage('');
    try {
      const saved = await persist(false);
      setLatestUpdate(saved);
      const res = await api.get(`/projects/${project._id}`);
      onProjectUpdated(res.data);
      onHistoryChanged?.();
      setSendOpen(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save update.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="pcp-card" style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="pcp-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Latest Update / MoM</div>
        {latestUpdate && (
          <div style={{ fontSize: 12, color: 'var(--pcp-text-secondary)' }}>
            {latestUpdate.isDraft ? 'Draft' : 'Published'} · Last saved {formatDateTime(latestUpdate.updatedAt || latestUpdate.createdAt)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Current Update">
          <Textarea rows={4} value={form.currentUpdate} onChange={(e, d) => update('currentUpdate', d.value)} placeholder="Summarize the current status of the project..." />
        </Field>
        <Field label="Next Steps">
          <Textarea rows={3} value={form.nextSteps} onChange={(e, d) => update('nextSteps', d.value)} placeholder="What happens next..." />
        </Field>
      </div>

      {message && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--pcp-text-secondary)' }}>{message}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <Button icon={<Save24Regular />} onClick={handleSaveDraft} disabled={saving}>Save Draft</Button>
        <Button icon={<DocumentSearch24Regular />} onClick={() => setPreviewOpen(true)}>Preview Communication</Button>
        <Button appearance="primary" icon={<Send24Regular />} onClick={handlePublishThenSend} disabled={saving}>
          Send Communication
        </Button>
      </div>

      <PreviewCommunicationDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        project={project}
        currentForm={form}
      />
      <SendCommunicationDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        project={project}
      />
    </section>
  );
}
