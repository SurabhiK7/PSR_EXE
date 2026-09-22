import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Textarea,
  Dropdown,
  Option,
  Button,
  Field,
  Badge,
} from '@fluentui/react-components';
import { Save24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import api from '../../api/client.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import DateInput from '../../components/common/DateInput.jsx';

const PROJECT_STAGES = ['Initiation', 'Planning', 'In Progress', 'On Hold', 'Completed', 'Closed'];

const emptyForm = {
  accountName: '',
  projectManager: '',
  projectScope: '',
  projectStartDate: '',
  projectStage: 'Initiation',
};

export default function NewProject() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setError('');
    if (!form.accountName || !form.projectManager || !form.projectStartDate) {
      setError('Please complete all required fields before saving.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/projects', form);
      const project = res.data;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentName', file.name);
        formData.append('uploadedBy', form.projectManager);
        await api.post(`/projects/${project._id}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate(`/projects/${project._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save project.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    navigate('/');
  }

  return (
    <div>
      <PageHeader title="Create New Project" subtitle="Register a new project and start tracking its status." />

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Badge appearance="tint" color="danger" size="large">{error}</Badge>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>
        <section className="pcp-card" style={{ padding: 24 }}>
          <div className="pcp-section-title">Project Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <Field label="PR-ID">
              <Input value="Auto Generated" disabled />
            </Field>
            <Field label="Account Name" required>
              <Input value={form.accountName} onChange={(e, d) => update('accountName', d.value)} placeholder="e.g. First Continental Bank" />
            </Field>
            <Field label="Project Manager" required>
              <Input value={form.projectManager} onChange={(e, d) => update('projectManager', d.value)} placeholder="e.g. Jane Doe" />
            </Field>
            <Field label="Project Start Date" required>
              <DateInput value={form.projectStartDate} onChange={(e, d) => update('projectStartDate', d.value)} />
            </Field>
            <Field label="Project Stage">
              <Dropdown
                placeholder="Select stage"
                value={form.projectStage}
                selectedOptions={[form.projectStage]}
                onOptionSelect={(e, d) => update('projectStage', d.optionValue)}
              >
                {PROJECT_STAGES.map((s) => (
                  <Option key={s} value={s}>{s}</Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Attachment">
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </Field>
          </div>
          <div style={{ marginTop: 16 }}>
            <Field label="Project Scope">
              <Textarea value={form.projectScope} onChange={(e, d) => update('projectScope', d.value)} rows={5} placeholder="Describe the project scope..." style={{ width: '100%' }} />
            </Field>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8, paddingBottom: 24 }}>
          <Button icon={<Dismiss24Regular />} onClick={handleCancel}>Cancel</Button>
          <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Project'}
          </Button>
        </div>
      </div>
    </div>
  );
}
