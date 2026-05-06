import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api';
import { Avatar, Badge, ErrorMsg } from '../ui';
import { getRoleBadgeColor } from '../../utils/roles';

export function MemberList({ members = [], projectId, isAdmin, currentUserId }) {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ userId: '', role: 'MEMBER' });
  const [error, setError] = useState(null);

  const removeMutation = useMutation({
    mutationFn: (userId) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
  });

  const addMutation = useMutation({
    mutationFn: (data) => projectsApi.addMember(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      setShowInvite(false);
      setForm({ userId: '', role: 'MEMBER' });
      setError(null);
    },
    onError: setError,
  });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Team members</h3>
        {isAdmin && (
          <button className="btn-primary text-xs py-1.5 px-3" onClick={() => setShowInvite(!showInvite)}>
            {showInvite ? 'Cancel' : '+ Add member'}
          </button>
        )}
      </div>

      {showInvite && (
        <div className="mb-4 p-4 bg-indigo-50 rounded-xl space-y-3">
          <div>
            <label className="label text-xs">User ID</label>
            <input className="input text-sm" placeholder="Paste user UUID" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Ask teammate to copy their ID from profile page</p>
          </div>
          <div>
            <label className="label text-xs">Role</label>
            <select className="input text-sm" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <ErrorMsg error={error} />
          <button className="btn-primary text-sm w-full" onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending || !form.userId}>
            {addMutation.isPending ? 'Adding…' : 'Add member'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={m.user.name} size="sm" />
              <div>
                <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                <p className="text-xs text-gray-400">{m.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getRoleBadgeColor(m.role)}>{m.role}</Badge>
              {isAdmin && m.user.id !== currentUserId && (
                <button
                  className="text-xs text-red-400 hover:text-red-600"
                  onClick={() => removeMutation.mutate(m.user.id)}
                  disabled={removeMutation.isPending}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}