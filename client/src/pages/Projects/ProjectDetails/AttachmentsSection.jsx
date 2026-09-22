import { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, Input, Field, Checkbox,
} from '@fluentui/react-components';
import { ArrowUpload24Regular, Open20Regular, ArrowDownload20Regular, Delete20Regular, Document24Regular } from '@fluentui/react-icons';
import api from '../../../api/client.js';
import EmptyState from '../../../components/common/EmptyState.jsx';
import ConfirmDeleteDialog from '../../../components/common/ConfirmDeleteDialog.jsx';
import FileDropZone from '../../../components/common/FileDropZone.jsx';
import { formatDate } from '../../../utils/format.js';

function formatSize(bytes) {
  if (!bytes) return '-';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function AttachmentsSection({ project }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function loadDocuments() {
    setLoading(true);
    api
      .get(`/projects/${project._id}/documents`)
      .then((res) => setDocuments(res.data))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }

  useEffect(loadDocuments, [project._id]);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentName', docName || file.name);
      formData.append('uploadedBy', project.projectManager || 'Unknown');
      await api.post(`/projects/${project._id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDialogOpen(false);
      setDocName('');
      setFile(null);
      loadDocuments();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(reason) {
    await api.delete(`/documents/${deleteTarget._id}`, { data: { reason, deletedBy: project.projectManager } });
    loadDocuments();
  }

  async function toggleIncludeInCommunication(doc, checked) {
    setDocuments((prev) => prev.map((d) => (d._id === doc._id ? { ...d, includeInCommunication: checked } : d)));
    try {
      await api.patch(`/documents/${doc._id}`, { includeInCommunication: checked });
    } catch {
      setDocuments((prev) => prev.map((d) => (d._id === doc._id ? { ...d, includeInCommunication: doc.includeInCommunication } : d)));
    }
  }

  return (
    <section className="pcp-card" style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="pcp-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Attachments</div>
        <Button size="small" icon={<ArrowUpload24Regular />} onClick={() => setDialogOpen(true)}>Upload Document</Button>
      </div>

      <div className="pcp-table-wrapper">
        {documents.length ? (
          <table className="pcp-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Uploaded By</th>
                <th>Upload Date</th>
                <th>File Type</th>
                <th>Size</th>
                <th>Send with Communication</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d._id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <Document24Regular style={{ color: 'var(--pcp-brand)' }} />
                    {d.documentName}
                  </td>
                  <td>{d.uploadedBy}</td>
                  <td>{formatDate(d.uploadDate)}</td>
                  <td>{d.fileType}</td>
                  <td>{formatSize(d.size)}</td>
                  <td>
                    <Checkbox
                      checked={Boolean(d.includeInCommunication)}
                      onChange={(e, data) => toggleIncludeInCommunication(d, data.checked)}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="small" icon={<Open20Regular />} as="a" href={d.filePath} target="_blank" rel="noreferrer">View</Button>
                      <Button size="small" icon={<ArrowDownload20Regular />} as="a" href={`/api/documents/${d._id}/download`}>Download</Button>
                      <Button size="small" icon={<Delete20Regular />} onClick={() => setDeleteTarget(d)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !loading && <EmptyState title="No attachments uploaded" message="Upload project documents to build the shared repository." />
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(e, d) => {
          setDialogOpen(d.open);
          if (!d.open) {
            setDocName('');
            setFile(null);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Upload Document</DialogTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12 }}>
              <Field label="Document Name">
                <Input value={docName} onChange={(e, d) => setDocName(d.value)} placeholder="Optional - defaults to file name" />
              </Field>
              <Field label="File">
                <FileDropZone file={file} onFileSelected={setFile} disabled={uploading} />
              </Field>
            </div>
            <DialogActions style={{ marginTop: 20 }}>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button appearance="primary" onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Document"
        itemLabel={deleteTarget?.documentName}
        onConfirm={handleDelete}
      />
    </section>
  );
}
