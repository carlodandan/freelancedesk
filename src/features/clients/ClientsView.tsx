import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Trash2,
  Eye,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { EmptyState } from "../../components/ui/EmptyState";
import { ClientItem, CreateClientInput } from "../../types/entities";
import { tauriService } from "../../services/tauri";
import { formatCents } from "../../services/currency";

interface ClientsViewProps {
  currencySymbol: string;
  onNavigateToCommissions?: (clientId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  currencySymbol,
}) => {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const { showToast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactHandle, setContactHandle] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await tauriService.getClients();
      setClients(data);
    } catch (err) {
      console.error("Failed to load clients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const input: CreateClientInput = {
        name: name.trim(),
        company_name: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        contact_handle: contactHandle.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      await tauriService.createClient(input);
      setIsCreateModalOpen(false);
      showToast({
        type: "success",
        message: `Client "${name.trim()}" registered.`,
      });
      resetForm();
      await loadClients();
    } catch (err) {
      console.error("Failed to create client:", err);
      showToast({
        type: "danger",
        message: "Failed to create client.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (window.confirm("Are you sure you want to remove or archive this client?")) {
      try {
        await tauriService.deleteClient(id);
        if (selectedClient?.id === id) setSelectedClient(null);
        showToast({
          type: "info",
          message: "Client record removed.",
        });
        await loadClients();
      } catch (err) {
        console.error("Failed to delete client:", err);
        showToast({
          type: "danger",
          message: "Failed to delete client.",
        });
      }
    }
  };

  const resetForm = () => {
    setName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setContactHandle("");
    setAddress("");
    setNotes("");
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
            Client Directory
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Manage your client accounts, financial ledgers, and contact details.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Add Client
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-80">
          <Search size={14} className="absolute left-3 top-2.5 text-[#8C867A]" />
          <input
            type="text"
            placeholder="Filter clients by name, company, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#E5E0D5] bg-white text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20 focus:border-[#854D0E]"
          />
        </div>
        <div className="text-xs text-[#78716C]">
          Showing <span className="font-semibold text-[#1C1917]">{filteredClients.length}</span> clients
        </div>
      </div>

      {/* Clients Table */}
      {filteredClients.length > 0 ? (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-ledger)] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider select-none">
                  <th className="px-5 py-3">Client Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-right">Total Billed</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-ledger-subtle)]">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">{client.name}</div>
                      {client.company_name && (
                        <div className="text-[11px] text-[var(--text-secondary)]">{client.company_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                      {client.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-[var(--text-muted)]" />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mt-0.5">
                          <Phone size={12} className="text-[var(--text-muted)]" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[var(--text-primary)]">
                      {formatCents(client.total_billed_cents, currencySymbol)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[#166534] font-medium">
                      {formatCents(client.total_paid_cents, currencySymbol)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums font-bold text-[#B45309]">
                      {formatCents(client.outstanding_cents, currencySymbol)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        variant={
                          client.status === "active"
                            ? "success"
                            : client.status === "archived"
                            ? "neutral"
                            : "warning"
                        }
                        size="sm"
                      >
                        {client.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
                          title="View Client Details"
                          aria-label={`View ${client.name} details`}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                          title="Delete / Archive"
                          aria-label={`Delete ${client.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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
            icon={<Users size={28} />}
            title="No clients found"
            description={
              searchQuery
                ? `No clients matched "${searchQuery}".`
                : "Add your first client to start logging projects, commissions, and payments."
            }
            actionLabel="Add Client"
            actionIcon={<Plus size={14} />}
            onAction={() => setIsCreateModalOpen(true)}
          />
        )
      )}

      {/* Create Client Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Client"
        description="Register a client to track jobs, contracts, and financial payments."
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <Input
            label="Client Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Maria Santos"
            required
            autoFocus
          />
          <Input
            label="Company / Brand Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Santos Art Studio"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@example.com"
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+63 917 123 4567"
            />
          </div>
          <Input
            label="Social Media / Contact Handle"
            value={contactHandle}
            onChange={(e) => setContactHandle(e.target.value)}
            placeholder="@mariasantos on X/Discord"
          />
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Makati City, Metro Manila"
          />
          <Textarea
            label="Client Notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions, preferences, timezone, rate agreements..."
          />

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
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? "Adding..." : "Save Client"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Client Detail View Modal */}
      {selectedClient && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedClient(null)}
          title={selectedClient.name}
          description={selectedClient.company_name || "Direct Client Profile"}
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-[#FAF8F5] border border-[#ECE8DE]">
                <div className="text-[11px] font-semibold uppercase text-[#78716C]">
                  Total Billed
                </div>
                <div className="text-base font-bold font-mono text-[#1C1917] mt-1 tabular-nums">
                  {formatCents(selectedClient.total_billed_cents, currencySymbol)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                <div className="text-[11px] font-semibold uppercase text-[#166534]">
                  Total Paid
                </div>
                <div className="text-base font-bold font-mono text-[#166534] mt-1 tabular-nums">
                  {formatCents(selectedClient.total_paid_cents, currencySymbol)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
                <div className="text-[11px] font-semibold uppercase text-[#B45309]">
                  Outstanding
                </div>
                <div className="text-base font-bold font-mono text-[#B45309] mt-1 tabular-nums">
                  {formatCents(selectedClient.outstanding_cents, currencySymbol)}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[#1C1917] border-b border-[#E5E0D5] pb-1">
                Contact & Details
              </div>
              <div className="grid grid-cols-2 gap-4 text-[#57534E]">
                <div>
                  <span className="font-medium text-[#78716C]">Email:</span>{" "}
                  {selectedClient.email || "—"}
                </div>
                <div>
                  <span className="font-medium text-[#78716C]">Phone:</span>{" "}
                  {selectedClient.phone || "—"}
                </div>
                <div>
                  <span className="font-medium text-[#78716C]">Handle:</span>{" "}
                  {selectedClient.contact_handle || "—"}
                </div>
                <div>
                  <span className="font-medium text-[#78716C]">Address:</span>{" "}
                  {selectedClient.address || "—"}
                </div>
              </div>
            </div>

            {selectedClient.notes && (
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-[#1C1917]">Notes</div>
                <div className="p-3 rounded bg-[#F4F1EA] text-[#57534E] leading-relaxed">
                  {selectedClient.notes}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
