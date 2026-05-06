import { useState, useEffect } from 'react';
import { Modal, ErrorMsg } from '../ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api';

export function ProjectModal({ open, onClose, project = null }) {
  const qc = useQueryClient();
  const isEdit = !!project;
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    setForm({ name: project?.name || '', description: project?.description || '' });
    setError(null);
  }, [project, open]);

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? projectsApi.update(project.id, data) : projectsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
    onError: setError,
  });

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    mutation.mutate(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit project' : 'New project'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Project name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Website Redesign" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What is this project about?" />
        </div>
        <ErrorMsg error={error} />
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}