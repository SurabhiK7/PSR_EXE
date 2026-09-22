import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@fluentui/react-components';
import api from '../../../api/client.js';
import PageHeader from '../../../components/common/PageHeader.jsx';
import WizardShell from '../../../components/wizard/WizardShell.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import StepProjectInfo from './StepProjectInfo.jsx';
import StepLatestUpdate from './StepLatestUpdate.jsx';
import MilestonesSection from '../../Projects/ProjectDetails/MilestonesSection.jsx';
import RisksSection from '../../Projects/ProjectDetails/RisksSection.jsx';
import ContactsSection from '../../Projects/ProjectDetails/ContactsSection.jsx';
import PreviewCommunicationDialog from '../../Projects/ProjectDetails/PreviewCommunicationDialog.jsx';
import SendCommunicationDialog from '../../Projects/ProjectDetails/SendCommunicationDialog.jsx';
import { toInputDate } from '../../../utils/format.js';

const STEPS = [
  { key: 'info', label: 'Project Information' },
  { key: 'update', label: 'Latest Update' },
  { key: 'risks', label: 'Risks / Dependencies' },
  { key: 'milestones', label: 'Project Milestones' },
  { key: 'contacts', label: 'Key Contacts / Stakeholders' },
];

const emptyProjectForm = {
  prId: '',
  accountName: '',
  projectManager: '',
  projectScope: '',
  projectStartDate: '',
  reportingPeriodStartDate: '',
  reportingPeriodEndDate: '',
  projectStage: 'Initiation',
};

const emptyUpdateForm = { currentUpdate: '', nextSteps: '' };

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
  // Whether this project has ever had any Update record (draft or published) saved. While
  // false, Current Update/Next Steps are mandatory - every project must have a Latest Update
  // on file at least once, same as the create-mode requirement.
  const [hasAnyUpdate, setHasAnyUpdate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

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
        reportingPeriodStartDate: toInputDate(p.reportingPeriodStartDate),
        reportingPeriodEndDate: toInputDate(p.reportingPeriodEndDate),
        projectStage: p.projectStage || 'Initiation',
      });
      // If the most recent update is still an unpublished draft, continuing here means
      // continuing THAT draft - pre-fill its content and keep editing the same record (so
      // Save as Draft/Next/Submit update it in place instead of creating a duplicate). Once
      // it's actually published, the next visit is a fresh update and starts blank again.
      const updatesRes = await api.get(`/projects/${id}/updates`).catch(() => ({ data: [] }));
      const latestUpdate = updatesRes.data[0] || null;
      setHasAnyUpdate(updatesRes.data.length > 0);
      if (latestUpdate?.isDraft) {
        setLatestUpdateId(latestUpdate._id);
        setUpdateForm({
          currentUpdate: latestUpdate.currentUpdate || '',
          nextSteps: latestUpdate.nextSteps || '',
        });
      } else {
        setLatestUpdateId(null);
        setUpdateForm(emptyUpdateForm);
      }
      // Don't mark every step as "done" (green tick) just because the project already
      // exists - milestones/risks/contacts may still be empty. Step-jumping in update mode
      // is already allowed via allowStepJump below, so this only controls the tick marks,
      // which should only light up as the user actually advances through steps.
      // Resume on whichever step "Save as Draft" was last clicked from, instead of always
      // reopening at step 1.
      const resumeStep = Math.min(Math.max(Number(p.draftStep) || 0, 0), STEPS.length - 1);
      setFurthestStep(resumeStep);
      setStep(resumeStep);
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

  // `strict` covers the extra fields (Project Scope, Project Status) Next/Submit require before
  // considering the step complete. Save as Draft only needs what the database itself requires
  // (prId, accountName, projectManager, projectStartDate) - a draft is allowed to be incomplete.
  function validateProjectForm({ strict = true } = {}) {
    if (mode === 'create' && !projectForm.prId?.trim()) {
      setError('Please enter a PR-ID before continuing.');
      return false;
    }
    if (!projectForm.accountName || !projectForm.projectManager || !projectForm.projectStartDate) {
      setError('Please complete all required fields before continuing.');
      return false;
    }
    if (strict && (!projectForm.projectStage || !projectForm.projectScope?.trim())) {
      setError('Please complete all required fields before continuing.');
      return false;
    }
    return true;
  }

  // Same strict/lenient split as validateProjectForm - Save as Draft may save just one of the
  // two fields, since a draft is allowed to be incomplete. That leniency doesn't apply, though,
  // if this project has never had a Latest Update saved at all (mode === 'create' or an
  // existing project with no Update record yet) - every project must have one on file at
  // least once, so both fields are mandatory regardless of strict in that case.
  function validateUpdateForm({ strict = true } = {}) {
    const mustHaveContent = mode === 'create' || !hasAnyUpdate;
    if ((strict || mustHaveContent) && (!updateForm.currentUpdate?.trim() || !updateForm.nextSteps?.trim())) {
      setError(
        mustHaveContent
          ? 'This project has no Latest Update on file yet - please enter a Current Update and Next Steps before continuing.'
          : 'Please complete all required fields before continuing.'
      );
      return false;
    }
    return true;
  }

  async function persistProjectInfo({ strict = true, draftStep } = {}) {
    if (!validateProjectForm({ strict })) return false;
    const extra = draftStep !== undefined ? { draftStep } : {};
    if (!project) {
      const res = await api.post('/projects', { ...projectForm, ...extra, prId: projectForm.prId.trim() });
      setProject(res.data);
    } else {
      const { prId, ...rest } = projectForm;
      const res = await api.put(`/projects/${project._id}`, { ...rest, ...extra, lastUpdatedBy: projectForm.projectManager });
      setProject(res.data);
    }
    return true;
  }

  async function persistLatestUpdate(publish, { strict = true } = {}) {
    if (!project) return false;
    if (!validateUpdateForm({ strict })) return false;
    // Nothing typed - don't create/overwrite an update record with blank content, and don't
    // let it count as a "latest update" or clutter history.
    if (!updateForm.currentUpdate?.trim() && !updateForm.nextSteps?.trim()) return true;
    const payload = { ...updateForm, updatedBy: project.projectManager, isDraft: !publish };
    if (latestUpdateId) {
      const res = await api.put(`/updates/${latestUpdateId}`, payload);
      setLatestUpdateId(res.data._id);
    } else {
      const res = await api.post(`/projects/${project._id}/updates`, payload);
      setLatestUpdateId(res.data._id);
    }
    return true;
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
        const ok = await persistLatestUpdate(false);
        if (!ok) return;
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

  // Persists whatever the active step holds (steps 2-4 save per-row via their own dialogs, so
  // there's nothing to flush for those) - shared by Next, Previous, and direct step-tab clicks
  // so none of them can silently discard unsaved edits.
  async function persistCurrentStep() {
    if (step === 0) return persistProjectInfo();
    if (step === 1) return persistLatestUpdate(false);
    return true;
  }

  async function handlePrevious() {
    setError('');
    setInfo('');
    setSaving(true);
    setSavingLabel('previous');
    try {
      const ok = await persistCurrentStep();
      if (!ok) return;
      setStep((s) => Math.max(0, s - 1));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save this step.');
    } finally {
      setSaving(false);
      setSavingLabel('');
    }
  }

  async function handleStepClick(index) {
    if (index === step) return;
    setError('');
    setInfo('');
    setSaving(true);
    setSavingLabel('stepNav');
    try {
      const ok = await persistCurrentStep();
      if (!ok) return;
      setFurthestStep((f) => Math.max(f, step));
      setStep(index);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save this step.');
    } finally {
      setSaving(false);
      setSavingLabel('');
    }
  }

  async function handleSaveDraft() {
    setError('');
    setInfo('');
    setSaving(true);
    setSavingLabel('draft');
    try {
      if (step === 0) {
        const ok = await persistProjectInfo({ strict: false, draftStep: step });
        if (!ok) return;
      } else if (step === 1) {
        const ok = await persistLatestUpdate(false, { strict: false });
        if (!ok) return;
        await api.put(`/projects/${project._id}`, { draftStep: step, lastUpdatedBy: project.projectManager });
      } else if (project) {
        // Steps 3-5 save per-row via their own dialogs - just record which step to resume on.
        await api.put(`/projects/${project._id}`, { draftStep: step, lastUpdatedBy: project.projectManager });
      }
      navigate('/', { state: { flashMessage: 'Saved as draft.' } });
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

  // "Submit and Send Communication" - submits the PSR (same as handleSubmit) and then opens
  // the Send dialog, instead of navigating away, so the communication can go out right after.
  async function handleSend() {
    setError('');
    setInfo('');
    if (!project) {
      setError('Please complete Project Information before sending.');
      return;
    }
    if (mode === 'create' && (!updateForm.currentUpdate?.trim() || !updateForm.nextSteps?.trim())) {
      setStep(1);
      setError('Please complete the Latest Update step (Current Update and Next Steps) before sending.');
      return;
    }
    setSaving(true);
    setSavingLabel('send');
    try {
      const infoOk = await persistProjectInfo();
      if (!infoOk) return;
      const ok = await persistLatestUpdate(true);
      if (!ok) return;
      const res = await api.put(`/projects/${project._id}`, {
        status: 'Submitted',
        lastUpdatedBy: project.projectManager,
      });
      setProject(res.data);
      setSendOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit and prepare the communication.');
    } finally {
      setSaving(false);
      setSavingLabel('');
    }
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
      if (mode === 'create' && (!updateForm.currentUpdate?.trim() || !updateForm.nextSteps?.trim())) {
        setStep(1);
        setError('Please complete the Latest Update step (Current Update and Next Steps) before submitting.');
        return;
      }
      const ok = await persistLatestUpdate(true);
      if (!ok) return;
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
        onSend={step === STEPS.length - 1 ? handleSend : undefined}
        saving={saving}
        savingLabel={savingLabel}
        isLastStep={step === STEPS.length - 1}
        error={error}
        info={info}
      >
        {step === 0 && <StepProjectInfo form={projectForm} onChange={updateProjectForm} prId={project?.prId} mode={mode} />}
        {step === 1 && <StepLatestUpdate form={updateForm} onChange={updateUpdateForm} project={project} mode={mode} hasAnyUpdate={hasAnyUpdate} />}
        {step === 2 && (project ? <RisksSection project={project} /> : <EmptyState title="Save Project Information first" message="Complete step 1 to unlock risks & dependencies." />)}
        {step === 3 && (project ? <MilestonesSection project={project} /> : <EmptyState title="Save Project Information first" message="Complete step 1 to unlock milestones." />)}
        {step === 4 && (project ? <ContactsSection project={project} /> : <EmptyState title="Save Project Information first" message="Complete step 1 to unlock contacts." />)}
      </WizardShell>

      {project && (
        <PreviewCommunicationDialog open={previewOpen} onOpenChange={setPreviewOpen} project={project} currentForm={updateForm} />
      )}
      {project && (
        <SendCommunicationDialog open={sendOpen} onOpenChange={setSendOpen} project={project} />
      )}
    </div>
  );
}
