import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions, Button, Field, Input, Checkbox } from '@fluentui/react-components';
import api from '../../../api/client.js';
import { ORG_NAME } from '../../../config/branding.js';

const EMAIL_RE = /^[^\s@;]+@[^\s@;]+\.[^\s@;]+$/;

/**
 * Collects optional recipient info, then asks the backend to generate a PDF status
 * report and open it as an Outlook attachment. Does not send email content directly —
 * only a short cover note plus the attached report.
 */
export default function SendCommunicationDialog({ open, onOpenChange, project }) {
  const navigate = useNavigate();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  useEffect(() => {
    if (open) {
      setTo('');
      setCc('');
      setError('');
      setResult('');
      setSelectedDocIds([]);
      api
        .get(`/projects/${project._id}/contacts`)
        .then((res) => {
          const contacts = res.data || [];
          const emails = (group) => contacts.filter((c) => c.group === group && c.email).map((c) => c.email).join('; ');
          setTo(emails(ORG_NAME));
          setCc(emails('External'));
        })
        .catch(() => {});
      api
        .get(`/projects/${project._id}/documents`)
        .then((res) => {
          const docs = res.data || [];
          setDocuments(docs);
          setSelectedDocIds(docs.filter((d) => d.includeInCommunication).map((d) => d._id));
        })
        .catch(() => setDocuments([]));
    }
  }, [open, project._id]);

  function toggleDocument(id, checked) {
    setSelectedDocIds((prev) => (checked ? [...prev, id] : prev.filter((docId) => docId !== id)));
  }

  function validate(list) {
    return list
      .split(';')
      .map((e) => e.trim())
      .filter(Boolean)
      .every((e) => EMAIL_RE.test(e));
  }

  async function handleSend() {
    setError('');
    if (to && !validate(to)) return setError('One or more recipient email addresses are invalid.');
    if (cc && !validate(cc)) return setError('One or more CC email addresses are invalid.');

    setSending(true);
    try {
      const res = await api.post(`/projects/${project._id}/send-communication`, { to, cc, documentIds: selectedDocIds });
      setResult(res.data.message);
      onOpenChange(false);
      navigate('/', { state: { flashMessage: 'Submitted.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send communication.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(e, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Send Communication</DialogTitle>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
            <div style={{ fontSize: 13, color: 'var(--pcp-text-secondary)' }}>
              A project status report will be generated as a document and attached to a new Outlook message. You can add or edit recipients directly in Outlook before sending.
            </div>
            <Field label="To (optional, semicolon-separated)">
              <Input value={to} onChange={(e, d) => setTo(d.value)} placeholder="name@example.com; name2@example.com" disabled={sending} />
            </Field>
            <Field label="CC (optional, semicolon-separated)">
              <Input value={cc} onChange={(e, d) => setCc(d.value)} placeholder="name@example.com" disabled={sending} />
            </Field>
            {documents.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#101828', marginBottom: 8 }}>Attachments to include</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {documents.map((d) => (
                    <Checkbox
                      key={d._id}
                      label={d.documentName}
                      checked={selectedDocIds.includes(d._id)}
                      onChange={(e, data) => toggleDocument(d._id, data.checked)}
                      disabled={sending}
                    />
                  ))}
                </div>
              </div>
            )}
            {error && <div style={{ color: '#C4314B', fontSize: 13 }}>{error}</div>}
            {result && <div style={{ color: '#0E7A2E', fontSize: 13 }}>{result}</div>}
          </DialogContent>
          <DialogActions style={{ marginTop: 8 }}>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
            <Button appearance="primary" onClick={handleSend} disabled={sending}>
              {sending ? 'Generating...' : 'Generate & Open in Outlook'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
