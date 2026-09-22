import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions, Button, Field, Input, Spinner, Checkbox } from '@fluentui/react-components';
import { ArrowDownload24Regular, Send24Regular } from '@fluentui/react-icons';
import api from '../../../api/client.js';
import { ORG_NAME } from '../../../config/branding.js';

const EMAIL_RE = /^[^\s@;]+@[^\s@;]+\.[^\s@;]+$/;

/**
 * Renders the real, server-generated HTML communication template (the same markup that will
 * be used as the email body once sending is wired up) inside a sandboxed iframe, so what you
 * see here is exactly what would be pasted into the mail. Always populated with real-time
 * data — if `currentForm` (in-progress, not-yet-saved wizard edits) is provided, those values
 * are merged in live; otherwise the latest saved update on file is used.
 *
 * Also offers "Download" (saves the exact same HTML as a standalone file) and, since
 * automatic sending requires Azure credentials that may not be configured yet, "Send"
 * (falls back to opening a pre-filled Outlook draft with this HTML as the body, unchanged
 * existing behavior) as an alternative.
 */
export default function PreviewCommunicationDialog({ open, onOpenChange, project, currentForm }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendResult, setSendResult] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    setTo('');
    setCc('');
    setSendError('');
    setSendResult('');
    setSelectedDocIds([]);
    api
      .post(`/projects/${project._id}/communication-preview`, currentForm || {})
      .then((res) => setHtml(res.data.html))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load preview.'))
      .finally(() => setLoading(false));
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
  }, [open, project._id, currentForm]);

  function toggleDocument(id, checked) {
    setSelectedDocIds((prev) => (checked ? [...prev, id] : prev.filter((docId) => docId !== id)));
  }

  function handleDownload() {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${project.prId}-communication.html`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function validate(list) {
    return list
      .split(';')
      .map((e) => e.trim())
      .filter(Boolean)
      .every((e) => EMAIL_RE.test(e));
  }

  async function handleSend() {
    setSendError('');
    setSendResult('');
    if (to && !validate(to)) return setSendError('One or more recipient email addresses are invalid.');
    if (cc && !validate(cc)) return setSendError('One or more CC email addresses are invalid.');

    setSending(true);
    try {
      const res = await api.post(`/projects/${project._id}/send-communication`, { to, cc, documentIds: selectedDocIds });
      setSendResult(res.data.message);
      onOpenChange(false);
      navigate('/', { state: { flashMessage: 'Submitted.' } });
    } catch (err) {
      setSendError(err.response?.data?.message || 'Failed to send communication.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(e, d) => onOpenChange(d.open)}>
      <DialogSurface style={{ maxWidth: 780 }}>
        <DialogBody>
          <DialogTitle>Preview Communication</DialogTitle>
          <DialogContent>
            <div style={{ fontSize: 13, color: 'var(--pcp-text-secondary)', marginBottom: 14 }}>
              This is exactly what will be sent as the email body. Automatic sending requires Azure credentials - until
              those are configured, use Download or Send (opens a pre-filled Outlook draft with this content).
            </div>

            {loading ? (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <Spinner label="Loading preview..." />
              </div>
            ) : error ? (
              <div style={{ color: '#C4314B', fontSize: 13, padding: '12px 0' }}>{error}</div>
            ) : (
              <iframe
                title="Communication preview"
                srcDoc={html}
                sandbox=""
                style={{ width: '100%', height: '55vh', border: '1px solid var(--pcp-border)', borderRadius: 8, background: '#fff' }}
              />
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--pcp-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>Send Communication</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <Field label="To (optional, semicolon-separated)">
                    <Input value={to} onChange={(e, d) => setTo(d.value)} placeholder="name@example.com" disabled={sending} />
                  </Field>
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <Field label="CC (optional, semicolon-separated)">
                    <Input value={cc} onChange={(e, d) => setCc(d.value)} placeholder="name@example.com" disabled={sending} />
                  </Field>
                </div>
              </div>
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
              {sendError && <div style={{ color: '#C4314B', fontSize: 13 }}>{sendError}</div>}
              {sendResult && <div style={{ color: '#0E7A2E', fontSize: 13 }}>{sendResult}</div>}
            </div>
          </DialogContent>
          <DialogActions style={{ marginTop: 12 }}>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
            <Button icon={<ArrowDownload24Regular />} onClick={handleDownload} disabled={loading || Boolean(error)}>
              Download
            </Button>
            <Button appearance="primary" icon={<Send24Regular />} onClick={handleSend} disabled={loading || Boolean(error) || sending}>
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

