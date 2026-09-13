import React, { useState, useEffect } from "react";
import { Briefcase, Plus, Search, Calendar, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  ProjectItem,
  ClientItem,
  CreateProjectInput,
} from "../../types/entities";
import { tauriService } from "../../services/tauri";
import { formatCents, parseToCents } from "../../services/currency";

interface ProjectsViewProps {
  currencySymbol: string;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  currencySymbol,
}) => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projData, clientData] = await Promise.all([
        tauriService.getProjects(),
        tauriService.getClients(),
      ]);
      setProjects(projData);
      setClients(clientData);
      if (clientData.length > 0 && !clientId) {
        setClientId(clientData[0].id);
      }
    } catch (err) {
      console.error("Failed to load project data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientId) return;

    setIsSubmitting(true);
    try {
      const priceCents = parseToCents(priceInput);
      const input: CreateProjectInput = {
        client_id: clientId,
        name: name.trim(),
        description: description.trim() || undefined,
        start_date: startDate || undefined,
        deadline: deadline || undefined,
        price_cents: priceCents,
        notes: notes.trim() || undefined,
      };

      await tauriService.createProject(input);
      setIsCreateModalOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    project: ProjectItem,
    newStatus: string,
  ) => {
    try {
      await tauriService.updateProject({
        id: project.id,
        client_id: project.client_id,
        name: project.name,
        description: project.description,
        start_date: project.start_date,
        deadline: project.deadline,
        status: newStatus,
        price_cents: project.price_cents,
        notes: project.notes,
      });
      await loadData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm("Archive this project?")) {
      try {
        await tauriService.deleteProject(id);
        await loadData();
      } catch (err) {
        console.error("Failed to delete project:", err);
      }
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPriceInput("");
    setStartDate("");
    setDeadline("");
    setNotes("");
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
            Projects
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Organize larger client deliverables, contracts, and deadlines.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create Project
        </Button>
      </div>

      {/* Controls: Search and Status Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search
              size={14}
              className="absolute left-3 top-2.5 text-[#8C867A]"
            />
            <input
              type="text"
              placeholder="Search projects or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#E5E0D5] bg-white text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="text-xs text-[#78716C]">
          Showing{" "}
          <span className="font-semibold text-[#1C1917]">
            {filteredProjects.length}
          </span>{" "}
          projects
        </div>
      </div>

      {/* Projects Table */}
      {filteredProjects.length > 0 ? (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E0D5] bg-[#FAF8F5] text-[#57534E] font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3">Project Title</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 text-right">Price / Budget</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE8DE]">
                {filteredProjects.map((proj) => (
                  <tr
                    key={proj.id}
                    className="hover:bg-[#FAF8F5] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[#1C1917]">
                        {proj.name}
                      </div>
                      {proj.description && (
                        <div className="text-[11px] text-[#78716C] line-clamp-1">
                          {proj.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#1C1917]">
                      {proj.client_name}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[#1C1917]">
                      {formatCents(proj.price_cents, currencySymbol)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums font-semibold text-[#166534]">
                      {formatCents(proj.total_paid_cents, currencySymbol)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#57534E]">
                      {proj.deadline ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-[#8C867A]" />
                          <span>{proj.deadline}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <select
                        value={proj.status}
                        onChange={(e) =>
                          handleUpdateStatus(proj, e.target.value)
                        }
                        className="text-[11px] font-semibold rounded px-2 py-0.5 border border-[#E5E0D5] bg-[#FAF8F5] text-[#1C1917] focus:outline-none"
                      >
                        <option value="planning">Planning</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting">Waiting</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteProject(proj.id)}
                        className="p-1 rounded text-[#8C867A] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                        title="Archive Project"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        !isLoading && (
          <EmptyState
            icon={<Briefcase size={28} />}
            title="No projects found"
            description={
              searchQuery
                ? `No projects matched "${searchQuery}".`
                : "Create your first project to organize larger scopes of freelance work."
            }
            actionLabel="Create Project"
            actionIcon={<Plus size={14} />}
            onAction={() => setIsCreateModalOpen(true)}
          />
        )
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
        description="Establish a project budget, milestones, and client assignment."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wider mb-1.5">
              Client *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-md border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20"
              required
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company_name ? `(${c.company_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Project Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website Redesign 2026"
            required
            autoFocus
          />

          <Input
            label="Project Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Overall goals, deliverables, and scope"
          />

          <Input
            label="Budget / Price"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="e.g. 50000"
            hint={`Total contract value in ${currencySymbol}`}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wider mb-1.5">
              Project Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Milestone checkpoints, client expectations..."
              className="w-full rounded-md border border-[#E5E0D5] bg-white p-3 text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !name.trim() || !clientId}
            >
              {isSubmitting ? "Creating..." : "Save Project"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
