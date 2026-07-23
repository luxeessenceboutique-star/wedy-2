import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Panel,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, UserPlus, Network, X, Check, Pencil,
} from 'lucide-react';
import { Avatar, Button, Spinner, Modal, Input } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import {
  getOrgChart, createOrgProject, updateOrgProject, deleteOrgProject,
  addOrgMember, removeOrgMember, updateOrgMemberRole,
  type OrgProject, type Employee,
} from '@/services/api';
import { toast } from 'sonner';
import { useLang } from '../../lib/lang';

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = [
  'var(--primary)', 'var(--violet)', '#059669', 'var(--warn)', '#dc2626',
  '#7c3aed', '#0284c7', '#0d9488', '#ea580c', '#be185d',
];

const POS_KEY = 'orgchart_positions_v2';

function loadPositions(): Record<string, { x: number; y: number }> {
  try { return JSON.parse(localStorage.getItem(POS_KEY) || '{}'); } catch { return {}; }
}
function persistPosition(id: string, pos: { x: number; y: number }) {
  const all = loadPositions();
  all[id] = pos;
  localStorage.setItem(POS_KEY, JSON.stringify(all));
}

// ── Handlers context (avoids stale closures in node data) ─────────────────────

type Handlers = {
  onDeleteProject: (id: string) => void;
  onAddMember: (projectId: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onRemoveMember: (projectId: string, employeeId: string) => void;
  onEditMemberRole: (projectId: string, employeeId: string, current: string) => void;
  readOnly: boolean;
};

const HandlersCtx = React.createContext<Handlers>({
  onDeleteProject: () => {},
  onAddMember: () => {},
  onRenameProject: () => {},
  onRemoveMember: () => {},
  onEditMemberRole: () => {},
  readOnly: false,
});

// ── Project (Team) Node ───────────────────────────────────────────────────────

function ProjectNode({ data }: NodeProps) {
  const { t } = useLang();
  const { onDeleteProject, onAddMember, onRenameProject, readOnly } = React.useContext(HandlersCtx);
  const d = data as { projectId: string; name: string; color: string; memberCount: number };

  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(d.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commitRename = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== d.name) onRenameProject(d.projectId, trimmed);
    setEditing(false);
  };

  return (
    <div style={{
      borderRadius: 12,
      width: 240,
      boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
      border: `2px solid ${d.color}`,
      background: 'var(--surface)',
      overflow: 'hidden',
    }}>
      <Handle type="source" position={Position.Bottom} id="s"
        style={{ background: d.color, width: 10, height: 10, border: '2px solid white' }} />

      {/* Header */}
      <div style={{ background: d.color, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.25)',
              border: 'none', borderRadius: 5, padding: '2px 7px',
              color: 'white', fontWeight: 600, fontSize: 13, outline: 'none',
            }}
          />
        ) : (
          <span
            onDoubleClick={readOnly ? undefined : () => { setEditing(true); setNameVal(d.name); }}
            title={readOnly ? undefined : t('org_node_edit_hint')}
            style={{ flex: 1, color: 'white', fontWeight: 600, fontSize: 13, cursor: readOnly ? 'default' : 'text', lineHeight: 1.3 }}
          >
            {d.name}
          </span>
        )}
        {!readOnly && (
          <>
            <button
              onClick={() => onAddMember(d.projectId)}
              title={t('add_member')}
              style={iconBtn}
            ><UserPlus size={13} color="white" /></button>
            <button
              onClick={() => onDeleteProject(d.projectId)}
              title={t('delete')}
              style={iconBtn}
            ><Trash2 size={13} color="white" /></button>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '7px 12px', background: 'var(--surface-2)' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {d.memberCount} {t('members_label')}
          {d.memberCount === 0 && (
            <span style={{ marginLeft: 6, color: 'var(--line-2)' }}>· {t('org_node_edit_hint')}</span>
          )}
        </span>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.2)',
  border: 'none',
  borderRadius: 6,
  padding: '4px 6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'background 0.1s',
};

// ── Person (Employee) Node ────────────────────────────────────────────────────

function PersonNode({ data }: NodeProps) {
  const { t } = useLang();
  const { onRemoveMember, onEditMemberRole, readOnly } = React.useContext(HandlersCtx);
  const d = data as {
    employeeId: string; projectId: string;
    name: string; position?: string; roleInTeam?: string; color: string;
  };

  return (
    <div style={{
      borderRadius: 10,
      width: 200,
      background: 'var(--surface)',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 2px 14px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* top color strip */}
      <div style={{ height: 3, background: d.color, position: 'absolute', top: 0, left: 0, right: 0 }} />

      <Handle type="target" position={Position.Top} id="t"
        style={{ background: d.color, width: 8, height: 8, border: '2px solid white', top: 3 }} />

      <div style={{ padding: '12px 12px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Avatar name={d.name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.name}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.position || '—'}
          </p>
          {d.roleInTeam && (
            <span style={{
              display: 'inline-block', marginTop: 4,
              fontSize: 10, fontWeight: 600,
              color: d.color,
              background: `${d.color}18`,
              border: `1px solid ${d.color}40`,
              borderRadius: 999, padding: '1px 7px',
            }}>
              {d.roleInTeam}
            </span>
          )}
        </div>

        {!readOnly && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
            <button
              onClick={() => onEditMemberRole(d.projectId, d.employeeId, d.roleInTeam || '')}
              title={t('edit_role')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.color = d.color)}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
            ><Pencil size={11} /></button>
            <button
              onClick={() => onRemoveMember(d.projectId, d.employeeId)}
              title={t('remove')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
            ><X size={11} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

const NODE_TYPES = { projectNode: ProjectNode, personNode: PersonNode };

// ── Build ReactFlow nodes + edges from API data ───────────────────────────────

function buildGraph(
  projects: OrgProject[],
  savedPositions: Record<string, { x: number; y: number }>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  projects.forEach((proj, pi) => {
    const teamId = `team-${proj.id}`;
    const defaultTeamPos = { x: 60 + pi * 320, y: 60 };
    const teamPos = savedPositions[teamId] ?? defaultTeamPos;

    nodes.push({
      id: teamId,
      type: 'projectNode',
      position: teamPos,
      data: {
        projectId: proj.id,
        name: proj.name,
        color: proj.color ?? 'var(--primary)',
        memberCount: proj.members.length,
      },
    });

    proj.members.forEach((m, mi) => {
      const personId = `person-${m.employee_id}`;
      const count = proj.members.length;
      const spread = Math.min(count - 1, 3) * 220;
      const defaultPersonPos = {
        x: teamPos.x + mi * 220 - spread / 2,
        y: teamPos.y + 170,
      };
      const personPos = savedPositions[personId] ?? defaultPersonPos;

      nodes.push({
        id: personId,
        type: 'personNode',
        position: personPos,
        data: {
          employeeId: m.employee_id,
          projectId: proj.id,
          name: m.employee?.full_name ?? 'Inconnu',
          position: m.employee?.position,
          roleInTeam: m.role_in_team,
          color: proj.color ?? 'var(--primary)',
        },
      });

      edges.push({
        id: `e-${proj.id}-${m.employee_id}`,
        source: teamId,
        target: personId,
        sourceHandle: 's',
        targetHandle: 't',
        style: { stroke: proj.color ?? 'var(--primary)', strokeWidth: 1.5, strokeDasharray: '6 3' },
        animated: false,
      });
    });
  });

  return { nodes, edges };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrgChartPage({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Modals
  const [newProjectModal, setNewProjectModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newDesc, setNewDesc] = useState('');

  const [addMemberModal, setAddMemberModal] = useState<string | null>(null); // projectId
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [memberRole, setMemberRole] = useState('');

  const [editRoleModal, setEditRoleModal] = useState<{ projectId: string; employeeId: string; current: string } | null>(null);
  const [editRoleVal, setEditRoleVal] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['orgchart'], queryFn: getOrgChart });

  // ── Mutations ──────────────────────────────────────────────────────
  const createProject = useMutation({
    mutationFn: (b: { name: string; color: string; description?: string }) => createOrgProject(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgchart'] }); toast.success(t('save')); setNewProjectModal(false); setNewName(''); setNewDesc(''); },
    onError: () => toast.error('Error'),
  });

  const delProject = useMutation({
    mutationFn: (id: string) => deleteOrgProject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgchart'] }); toast.success(t('save')); },
  });

  const renameProject = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateOrgProject(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orgchart'] }),
  });

  const addMember = useMutation({
    mutationFn: ({ pid, empId, role }: { pid: string; empId: string; role?: string }) =>
      addOrgMember(pid, { employee_id: empId, role_in_team: role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgchart'] }); toast.success(t('save')); setAddMemberModal(null); setSelectedEmpId(''); setMemberRole(''); },
    onError: () => toast.error('Error'),
  });

  const removeMember = useMutation({
    mutationFn: ({ pid, empId }: { pid: string; empId: string }) => removeOrgMember(pid, empId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgchart'] }); toast.success(t('save')); },
  });

  const editRole = useMutation({
    mutationFn: ({ pid, empId, role }: { pid: string; empId: string; role: string }) =>
      updateOrgMemberRole(pid, empId, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgchart'] }); setEditRoleModal(null); },
  });

  // ── Stable handlers (passed via context) ──────────────────────────
  const handlers = useMemo<Handlers>(() => ({
    onDeleteProject: (id) => delProject.mutate(id),
    onAddMember: (pid) => setAddMemberModal(pid),
    onRenameProject: (id, name) => renameProject.mutate({ id, name }),
    onRemoveMember: (pid, empId) => removeMember.mutate({ pid, empId }),
    onEditMemberRole: (pid, empId, current) => { setEditRoleModal({ projectId: pid, employeeId: empId, current }); setEditRoleVal(current); },
    readOnly,
  }), [delProject, renameProject, removeMember, editRole, readOnly]);

  // ── Sync API data → ReactFlow nodes ───────────────────────────────
  useEffect(() => {
    if (!data) return;
    const { nodes: n, edges: e } = buildGraph(data.projects, loadPositions());
    setNodes(n);
    setEdges(e);
  }, [data, setNodes, setEdges]);

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    persistPosition(node.id, node.position);
  }, []);

  const unassigned: Employee[] = data?.unassigned ?? [];

  return (
    <HandlersCtx.Provider value={handlers}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PageHeader
          title={t('nav_orgchart')}
          subtitle={t('org_subtitle')}
          action={
            !readOnly ? (
              <Button variant="primary" onClick={() => setNewProjectModal(true)}>
                <Plus size={14} style={{ marginRight: 6 }} /> {t('org_new_team')}
              </Button>
            ) : undefined
          }
        />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── Left panel: unassigned ── */}
          <aside style={{
            width: 220,
            borderRight: '1px solid var(--line)',
            background: 'var(--surface)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', flexShrink: 0,
          }}>
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--line)' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('org_unassigned')} ({unassigned.length})
              </p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }} className="scroll">
              {isLoading && <div style={{ padding: 16, textAlign: 'center' }}><Spinner /></div>}
              {!isLoading && unassigned.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', padding: '20px 8px' }}>
                  {t('org_all_assigned')}
                </p>
              )}
              {unassigned.map((emp) => (
                <div key={emp.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8, marginBottom: 4,
                  background: 'var(--surface-2)', border: '1px solid var(--line)',
                }}>
                  <Avatar name={emp.full_name} size={28} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.full_name}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.position || emp.department || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* ── ReactFlow canvas ── */}
          <div style={{ flex: 1, position: 'relative' }}>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Spinner />
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={readOnly ? undefined : onNodesChange}
                onEdgesChange={readOnly ? undefined : onEdgesChange}
                nodeTypes={NODE_TYPES}
                onNodeDragStop={readOnly ? undefined : onNodeDragStop}
                nodesDraggable={!readOnly}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                minZoom={0.2}
                maxZoom={2}
                deleteKeyCode={null}
              >
                <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#dde1e7" />
                <Controls style={{ borderRadius: 8 }} />
                <MiniMap
                  nodeColor={(n) => {
                    const c = (n.data as any)?.color;
                    return n.type === 'projectNode' ? (c ?? 'var(--primary)') : 'var(--line)';
                  }}
                  style={{ borderRadius: 8, border: '1px solid var(--line)' }}
                />

                {/* Empty state */}
                {nodes.length === 0 && (
                  <Panel position="top-center">
                    <div style={{
                      marginTop: 100,
                      textAlign: 'center',
                      background: 'var(--surface)',
                      borderRadius: 16,
                      padding: '40px 56px',
                      border: '1px dashed #cbd5e1',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                    }}>
                      <Network size={44} style={{ color: 'var(--line-2)', marginBottom: 14 }} />
                      <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, color: 'var(--ink)' }}>{t('org_empty_title')}</p>
                      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>
                        {t('org_empty_desc')}
                      </p>
                      {!readOnly && (
                        <Button variant="primary" onClick={() => setNewProjectModal(true)}>
                          <Plus size={14} style={{ marginRight: 6 }} /> {t('org_new_team')}
                        </Button>
                      )}
                    </div>
                  </Panel>
                )}
              </ReactFlow>
            )}
          </div>
        </div>

        {/* ── Modal: New Project ── */}
        <Modal open={newProjectModal} onClose={() => setNewProjectModal(false)} title={t('org_new_team')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0 8px' }}>
            <Input
              label={t('org_team_name')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ex: Projet Alpha, Équipe Backend..."
            />
            <Input
              label={t('description_label')}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder={t('description_label') + "..."}
            />
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>{t('color')}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)} style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: newColor === c ? '3px solid #0f172a' : '2px solid transparent',
                    cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {newColor === c && <Check size={12} color="white" />}
                  </button>
                ))}
              </div>
            </div>
            {/* Preview */}
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${newColor}` }}>
              <div style={{ background: newColor, padding: '9px 14px' }}>
                <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>
                  {newName || t('org_team_name')}
                </span>
              </div>
              <div style={{ padding: '7px 14px', background: 'var(--surface-2)' }}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>0 {t('members_label')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setNewProjectModal(false)}>{t('cancel')}</Button>
              <Button
                variant="primary"
                onClick={() => { if (newName.trim()) createProject.mutate({ name: newName.trim(), color: newColor, description: newDesc || undefined }); }}
                disabled={!newName.trim() || createProject.isPending}
              >
                {createProject.isPending ? '...' : t('save')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── Modal: Add Member ── */}
        <Modal
          open={!!addMemberModal}
          onClose={() => { setAddMemberModal(null); setSelectedEmpId(''); setMemberRole(''); }}
          title={t('add_member')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0 8px' }}>
            <div>
              <p style={{ margin: '0 0 7px', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>{t('employee')}</p>
              <select
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--line)', fontSize: 13,
                  background: 'var(--bg)', color: 'var(--fg)', outline: 'none',
                }}
              >
                <option value="">— {t('select')} —</option>
                {unassigned.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}{e.position ? ` — ${e.position}` : ''}
                  </option>
                ))}
              </select>
              {unassigned.length === 0 && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--warn)' }}>
                  {t('org_all_assigned')}
                </p>
              )}
            </div>
            <Input
              label={t('position_label')}
              value={memberRole}
              onChange={e => setMemberRole(e.target.value)}
              placeholder="Ex: Tech Lead, Designer, Chef de projet..."
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => { setAddMemberModal(null); setSelectedEmpId(''); setMemberRole(''); }}>
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (addMemberModal && selectedEmpId)
                    addMember.mutate({ pid: addMemberModal, empId: selectedEmpId, role: memberRole || undefined });
                }}
                disabled={!selectedEmpId || addMember.isPending}
              >
                {addMember.isPending ? '...' : t('save')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── Modal: Edit Role ── */}
        <Modal
          open={!!editRoleModal}
          onClose={() => setEditRoleModal(null)}
          title={t('edit_role')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0 8px' }}>
            <Input
              label={t('position_label')}
              value={editRoleVal}
              onChange={e => setEditRoleVal(e.target.value)}
              placeholder="Ex: Tech Lead, Designer..."
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setEditRoleModal(null)}>{t('cancel')}</Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (editRoleModal)
                    editRole.mutate({ pid: editRoleModal.projectId, empId: editRoleModal.employeeId, role: editRoleVal });
                }}
                disabled={editRole.isPending}
              >
                {editRole.isPending ? '...' : t('save')}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </HandlersCtx.Provider>
  );
}
