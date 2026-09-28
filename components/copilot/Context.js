'use client';

import { CheckCircle2, Circle, FolderKanban, Loader2, PlayCircle, Rocket } from 'lucide-react';

const STATUS_META = {
  todo: { label: 'TODO', cls: 'border-line text-text3', icon: Circle },
  in_progress: { label: 'IN PROGRESS', cls: 'border-brandblue/60 text-brandblue', icon: PlayCircle },
  done: { label: 'DONE', cls: 'border-brandgreen/60 text-brandgreen', icon: CheckCircle2 },
};

const NEXT_STATUS = { todo: 'in_progress', in_progress: 'done', done: 'todo' };

function TaskRow({ task, onStatus }) {
  const meta = STATUS_META[task.status] || STATUS_META.todo;
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-line bg-white/[0.03] px-2.5 py-2">
      <button
        onClick={() => onStatus(task, NEXT_STATUS[task.status] || 'in_progress')}
        aria-label={`Change status of ${task.title}`}
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${meta.cls} transition-all active:scale-90`}
      >
        <Icon size={11} />
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-[12px] leading-snug ${task.status === 'done' ? 'text-text3 line-through' : 'text-text1'}`}>
          {task.title}
        </div>
        <div className={`mt-1 inline-block text-[8.5px] font-black uppercase tracking-wider ${meta.cls.split(' ')[1]}`}>
          {task.phaseTitle ? `${meta.label} · ${meta.phaseTitle}` : meta.label}
        </div>
      </div>
    </div>
  );
}

export default function CopilotContext({
  projects,
  selectedProject,
  tasks,
  loadingTasks,
  onSelectProject,
  onTaskStatus,
  onGoProjects,
}) {
  return (
    <div className="no-scrollbar flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="border-b border-linesoft px-4 py-3">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-gold">
          <FolderKanban size={13} />
          Your projects
        </div>
      </div>

      <div className="px-3 py-3">
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-3 text-[11.5px] leading-relaxed text-text3">
            No projects yet. Run the <span className="font-bold text-gold-hi">Plan MVP</span> mode and create one —
            it will appear here with its tasks.
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => {
              const active = selectedProject && selectedProject.id === project.id;
              return (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={`w-full rounded-xl border p-3 text-left transition-all ${
                    active ? 'border-gold/60 bg-[rgba(217,172,61,0.08)]' : 'border-line bg-white/[0.03] active:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] font-extrabold text-text1">{project.name}</span>
                    <span className="shrink-0 text-[10px] font-bold text-gold-hi">{project.progress || 0}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gold-grad" style={{ width: `${project.progress || 0}%` }} />
                  </div>
                  <div className="mt-1.5 text-[10px] text-text3">
                    {project.tasksDone || 0}/{project.tasksTotal || 0} tasks
                    {project.membersCount > 1 ? ` · ${project.membersCount} members` : ''}
                  </div>
                </button>
              );
            })}
            <button
              onClick={onGoProjects}
              className="w-full rounded-xl border border-line px-3 py-2 text-[11px] font-bold text-text3 active:bg-white/5"
            >
              Open projects page
            </button>
          </div>
        )}
      </div>

      {selectedProject ? (
        <div className="border-t border-linesoft">
          <div className="flex items-center gap-1.5 px-4 py-3 text-[11px] font-extrabold uppercase tracking-wide text-gold">
            <Rocket size={13} />
            {selectedProject.name} — tasks
          </div>
          <div className="px-3 pb-4">
            {loadingTasks ? (
              <div className="flex items-center gap-2 px-1 py-2 text-[11.5px] text-text3">
                <Loader2 size={13} className="animate-spin" /> Loading tasks…
              </div>
            ) : tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-3 text-[11.5px] text-text3">
                This project has no tasks yet. Open an MVP Roadmap card and use “Add tasks to selected project”.
              </div>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onStatus={onTaskStatus} />
                ))}
                <div className="pt-1 text-[10px] text-text3">
                  Tap the circle to cycle TODO → IN PROGRESS → DONE.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
