import { useEffect, useState } from 'react';
import { Button, Field, Input, Textarea, Switch, Spinner } from '@fluentui/react-components';
import { Save24Regular } from '@fluentui/react-icons';
import api from '../../api/client.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import { isValidEmail } from '../../utils/validation.js';

export default function Settings() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loadedOrgName, setLoadedOrgName] = useState('');

  useEffect(() => {
    api.get('/settings').then((res) => {
      const { emailAutomation: ea, ...rest } = res.data;
      setForm(rest);
      setLoadedOrgName(rest.organizationName || '');
    }).finally(() => setLoading(false));
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setError('');
  }

  async function handleSave() {
    if (form.supportEmail && !isValidEmail(form.supportEmail)) {
      setError('Please enter a valid support email address.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/settings', form);
      const { emailAutomation: ea, ...rest } = res.data;
      setSaved(true);
      // The organization name is read once on app load (sidebar logo, login page, etc.) - a
      // full reload is the simplest way to make every already-mounted component pick up the
      // new value everywhere at once.
      if ((rest.organizationName || '') !== loadedOrgName) {
        window.location.reload();
        return;
      }
      setForm(rest);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Loading settings..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Organization-wide preferences for the PSR Communication Tool." />

      <section className="pcp-card" style={{ padding: 24, marginBottom: 20, maxWidth: 640 }}>
        <div className="pcp-section-title">General</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Organization Name">
            <Input value={form.organizationName || ''} onChange={(e, d) => update('organizationName', d.value)} />
          </Field>
          <Field label="Organization Tagline">
            <Input value={form.organizationTagline || ''} onChange={(e, d) => update('organizationTagline', d.value)} />
          </Field>
          <Field label="Support Email">
            <Input type="email" value={form.supportEmail || ''} onChange={(e, d) => update('supportEmail', d.value)} />
          </Field>
          <Field label="Email Footer">
            <Textarea rows={3} value={form.emailFooter || ''} onChange={(e, d) => update('emailFooter', d.value)} />
          </Field>
        </div>
      </section>

      <section className="pcp-card" style={{ padding: 24, marginBottom: 20, maxWidth: 640 }}>
        <div className="pcp-section-title">Notifications</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Switch
            label="Notify on PSR submission"
            checked={Boolean(form.notifyOnSubmit)}
            onChange={(e, d) => update('notifyOnSubmit', d.checked)}
          />
          <Switch
            label="Notify on PSR deletion"
            checked={Boolean(form.notifyOnDelete)}
            onChange={(e, d) => update('notifyOnDelete', d.checked)}
          />
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {saved && <span style={{ color: '#0E7A2E', fontSize: 13 }}>Saved successfully.</span>}
        {error && <span style={{ color: '#C4314B', fontSize: 13 }}>{error}</span>}
      </div>
    </div>
  );
}
