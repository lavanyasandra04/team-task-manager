import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { ProjectModal } from '../components/projects/ProjectModal';
import { Spinner, Empty, Avatar, Badge } from '../components/ui';

function ProjectCard({ project }) {
  const total = project._count?.tasks || 0;
  return (
    <Link to={`/projects/${project.id}`} className="card p-5 hover:shadow-md transition-shadow block group">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{project.name}</h3>
        <Badge className={project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
          {project.status}
        </Badge>
      </div>
      {project.description && <p className="text-sm text-gray-400 mb-4 line-clamp-2">{project.description}</p>}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {project.members.slice(0, 4).map((m) => (
            <div key={m.id} title={m.user.name}>
              <Avatar name={m.user.name} size="sm" />
            </div>
          ))}
          {project.members.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              +{project.members.length - 4}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400">{total} task{total !== 1 ? 's' : ''}</span>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.getAll });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-sm text-gray-400 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} you're part of</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ New project</button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : projects.length === 0 ? (
          <Empty message="No projects yet. Create your first one!" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>

      <ProjectModal open={showModal} onClose={() => setShowModal(false)} />
    </AppLayout>
  );
}