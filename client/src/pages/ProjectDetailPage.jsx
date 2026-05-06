import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import { TaskModal } from '../components/tasks/TaskModal';
import { ProjectModal } from '../components/projects/ProjectModal';
import { MemberList } from '../components/projects/MemberList';
import { Spinner, Badge } from '../components/ui';
import { isProjectAdmin } from '../utils/roles';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [view, setView] = useState('board');
  const [taskModal, setTaskModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: project, isLoading: pl } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getOne(id),
  });

  const { data: tasks = [], isLoading: tl } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.getAll(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); navigate('/projects'); },
  });

  if (pl || tl) return <AppLayout><div className="flex items-center justify-center h-full"><Spinner /></div></AppLayout>;
  if (!project) return <AppLayout><p className="p-8 text-gray-400">Project not found.</p></AppLayout>;

  const membership = project.members.find((m) => m.user.id === user?.id);
  const isAdmin = isProjectAdmin(membership);

  const openTask = (task) => { setSelectedTask(task); setTaskModal(true); };
  const closeTaskModal = () => { setTaskModal(false); setSelectedTask(null); };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <Badge className={project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                {project.status}
              </Badge>
            </div>
            {project.description && <p className="text-sm text-gray-400">{project.description}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {['board', 'members'].map((v) => (
                <button key={v} className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setView(v)}>
                  {v === 'board' ? 'Board' : 'Members'}
                </button>
              ))}
            </div>
            <button className="btn-primary text-sm" onClick={() => { setSelectedTask(null); setTaskModal(true); }}>+ Add task</button>
            {isAdmin && (
              <>
                <button className="btn-secondary text-sm" onClick={() => setEditModal(true)}>Edit</button>
                <button className="btn-danger text-sm" onClick={() => { if (confirm('Delete this project?')) deleteMutation.mutate(); }}>Delete</button>
              </>
            )}
          </div>
        </div>

        {view === 'board' && (
          <KanbanBoard tasks={tasks} projectId={id} onTaskClick={openTask} membership={membership} />
        )}

        {view === 'members' && (
          <MemberList members={project.members} projectId={id} isAdmin={isAdmin} currentUserId={user?.id} />
        )}
      </div>

      <TaskModal
        open={taskModal}
        onClose={closeTaskModal}
        projectId={id}
        members={project.members}
        task={selectedTask}
      />

      <ProjectModal open={editModal} onClose={() => setEditModal(false)} project={project} />
    </AppLayout>
  );
}