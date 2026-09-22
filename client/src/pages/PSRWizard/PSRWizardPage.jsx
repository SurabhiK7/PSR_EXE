import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@fluentui/react-components';
import api from '../../api/client.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import WizardShell from '../../components/wizard/WizardShell.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import StepProjectInfo from './StepProjectInfo.jsx';
import StepLatestUpdate from './StepLatestUpdate.jsx';
import MilestonesSection from '../ProjectDetails/MilestonesSection.jsx';
import RisksSection from '../ProjectDetails/RisksSection.jsx';
import ContactsSection from '../ProjectDetails/ContactsSection.jsx';
import PreviewCommunicationDialog from '../ProjectDetails/PreviewCommunicationDialog.jsx';
import { toInputDate } from '../../utils/format.js';

const STEPS = [
  { key: 'info', label: 'Project Information' },
  { key: 'update', label: 'Latest Update' },
  { key: 'milestones', label: 'Project Milestones' },
  { key: 'risks', label: 'Risks / Dependencies' },
  { key: 'contacts', label: 'Key Contacts / Stakeholders' },
];

const emptyProjectForm = {
  accountName: '',
  projectManager: '',
  projectScope: '',
  projectStartDate: '',
  projectStage: 'Initiation',
};

const emptyUpdateForm = { currentUpdate: '', nextSteps: '', risksDependencies: '' };

/**
 * Shared multi-step wizard used by both "Create PSR" (mode="create") and
 * "Update PSR" (mode="update", pre-loaded with an existing project) flows.
 */
export default function PSRWizardPage({ mode, projectId }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(Boolean(projectId));
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [project, setProject] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [updateForm, setUpdateForm] = useState(emptyUpdateForm);
  const [latestUpdateId, setLatestUpdateId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadExisting = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${id}`);
      const p = res.data;
      setProject(p);
      setProjectForm({
        accountName: p.accountName || '',
        projectManager: p.projectManager || '',
        projectScope: p.projectScope || '',
        projectStartDate: toInputDate(p.projectStartDate),
        projectStage: p.projectStage || 'Initiation',
      });
      const updatesRes = await api.get(`/projects/${id}/updates`);
      const latest = updatesRes.data[0] || null;
      if (latest) {
        setLatestUpdateId(latest._id);
        setUpdateForm({
          currentUpdate: latest.currentUpdate || '',
          nextSteps: latest.nextSteps || '',
          risksDependencies: latest.risksDependencies || '',
        });
      }
      setFurthestStep(STEPS.length - 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the project.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) loadExisting(projectId);
  }, [projectId, loadExisting]);

  function updateProjectForm(field, value) {
    setProjectForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateUpdateForm(field, value) {
    setUpdateForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateProjectForm() {
    if (!projectForm.accountName || !projectForm.projectManager || !projectForm.projectStartDate) {
      setError('Please complete all required fields before continuing.');
      return false;
    }
    return true;
  }

  async function persistProjectInfo() {
    if (!validateProjectForm()) return false;
    if (!project) {
      const res = await api.post('/projects', projectForm);
      setProject(res.data);
    } else {
      const res = await api.put(`/projects/${project._id}`, { ...projectForm, lastUpdatedBy: projectForm.projectManager });
      setProject(res.data);
    }
    return true;
  }

  async function persistLatestUpdate(publish) {
    if (!project) return;
    const payload = { ...updateForm, updatedBy: project.projectManager, isDraft: !publish };
    if (latestUpdateId) {
      const res = await api.put(`/updates/${latestUpdateId}`, payload);
      setLatestUpdateId(res.data._id);
    } else {
      const res = await api.post(`/projects/${project._id}/updates`, payload);
      setLatestUpdateId(res.data._id);
    }
  }

  async function handleNext() {
    setError('');
    setInfo('');
    setSaving(true);
    setSavingLabel('next');
    try {
      if (step === 0) {
        const ok = await persistProjectInfo();
        if (!ok) return;
      } else if (step === 1) {
        await persistLatestUpdate(false);
      }
      setFurthestStep((f) => Math.max(f, step + 1));
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save this step.');
    } finally {
      setSaving(false);
      setSavingLabel('');
    }
  }

  function handlePrevious() {
    setError('');
    setInfo('');
    setStep((s) => Math.max(0, s - 1));
  }

  function handleStepClick(index) {
    setError('');
    setInfo('');
    setStep(index);
  }

  async function handleSaveDraft() {
    setError('');
    setInfo('');
    setSaving(true);
    setSavingLabel('draft');
    try {
      if (step === 0) {
        const ok = await persistProjectInfo();
        if (!ok) return;
      } else if (step === 1) {
        await persistLatestUpdate(false);
      }
      setInfo('Saved as draft.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
      setSavingLabel('');
    }
  }

  function handlePreview() {
    setError('');
    if (!project) {
      setError('Please complete Project Information before previewing.');
      return;
    }
    setPreviewOpen(true);
  }

  async function handleSubmit() {
    setError('');
    setInfo('');
    setSaving(true);
    setSavingLabel('submit');
    try {
      if (step === 0) {
        const ok = await persistProjectInfo();
        if (!ok) return;
      }
      if (!project) {
        setError('Please complete Project Information before submitting.');
        return;
      }
      await persistLatestUpdate(true);
      const res = await api.put(`/projects/${project._id}`, {
        status: 'Submitted',
        lastUpdatedBy: project.projectManager,
      });
      navigate(`/projects/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit the PSR.');
    } finally {
      setSaving(false);
      setSavingLabel('');
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Loading project..." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={mode === 'create' ? 'Create PSR' : `Update PSR${project ? ` - ${project.prId}` : ''}`}
        subtitle={
          mode === 'create'
            ? 'Register a new project and complete each step to submit the status report.'
            : 'Step through each section to update project details, then submit to publish the changes.'
        }
      />

      <WizardShell
        steps={STEPS}
        activeStep={step}
        onStepClick={handleStepClick}
        allowStepJump={mode === 'update'}
        furthestStep={furthestStep}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSaveDraft={handleSaveDraft}
        onPreview={handlePreview}
        onSubmit={handleSubmit}
        saving={saving}
        savingLabel={savingLabel}
        isLastStep={step === STEPS.length - 1}
        error={error}
        info={info}
      >
        {step === 0 && <StepProjectInfo form={projectForm} onChange={updateProjectForm} prId={project?.prId} />}
        {step === 1 && <StepLatestUpdate form={updateForm} onChange={updateUpdateForm} project={project} />}
        {step === 2 && (project ? <MilestonesSection project={project} /> : <EmptyState title="Save Project Information first" message="Complete step 1 to unlock milestones." />)}
        {step === 3 && (project ? <RisksSection project={project} /> : <EmptyState title="Save Project Information first" message="Complete step 1 to unlock risks & dependencies." />)}
        {step === 4 && (project ? <ContactsSection project={project} /> : <EmptyState title="Save Project Information first" message="Complete step 1 to unlock contacts." />)}
      </WizardShell>

      {project && (
        <PreviewCommunicationDialog open={previewOpen} onOpenChange={setPreviewOpen} project={project} currentForm={updateForm} />
      )}
    </div>
  );
}
