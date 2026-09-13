import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  CommissionItem,
  ClientItem,
  ProjectItem,
  CreateCommissionInput,
  CreateCommissionLineItemInput,
} from "../../types/entities";
import { tauriService } from "../../services/tauri";
import { formatCents, parseToCents, calculateDeposit } from "../../services/currency";

interface CommissionsViewProps {
  currencySymbol: string;
  defaultDepositPct?: number;
  onNavigateToPayments?: (commissionId: string) => void;
}

export const CommissionsView: React.FC<CommissionsViewProps> = ({
  currencySymbol,
  defaultDepositPct = 50,
}) => {
  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [commissionType, setCommissionType] = useState("Illustration");
  const [priceInput, setPriceInput] = useState("");
  const [depositPct, setDepositPct] = useState<number>(defaultDepositPct);
  const [dateRequested, setDateRequested] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<CreateCommissionLineItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [commData, clientData, projData] = await Promise.all([
        tauriService.getCommissions(),
        tauriService.getClients(),
        tauriService.getProjects(),
      ]);
      setCommissions(commData);
      setClients(clientData);
      setProjects(projData);
      if (clientData.length > 0 && !clientId) {
        setClientId(clientData[0].id);
      }
    } catch (err) {
      console.error("Failed to load commissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unit_price_cents: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    const updated = [...lineItems];
    updated.splice(index, 1);
    setLineItems(updated);
    recalcTotalFromItems(updated);
  };

  const updateLineItem = (
    index: number,
    field: keyof CreateCommissionLineItemInput,
    value: any
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
    recalcTotalFromItems(updated);
  };

  const recalcTotalFromItems = (items: CreateCommissionLineItemInput[]) => {
    if (items.length > 0) {
      const totalCents = items.reduce(
        (sum, item) => sum + item.unit_price_cents * item.quantity,
        0
      );
      setPriceInput((totalCents / 100).toString());
    }
  };

  const handleCreateCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId) return;

    setIsSubmitting(true);
    try {
      const priceCents = parseToCents(priceInput);
      const input: CreateCommissionInput = {
        client_id: clientId,
        project_id: projectId.trim() || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        commission_type: commissionType.trim() || undefined,
        price_cents: priceCents,
        deposit_percentage: depositPct,
        date_requested: dateRequested || undefined,
        start_date: new Date().toISOString().split("T")[0],
        deadline: deadline || undefined,
        notes: notes.trim() || undefined,
        items: lineItems,
      };

      await tauriService.createCommission(input);
      setIsCreateModalOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Failed to create commission:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await tauriService.updateCommissionStatus(id, newStatus);
      await loadData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteCommission = async (id: string) => {
    if (window.confirm("Archive or delete this commission?")) {
      try {
        await tauriService.deleteCommission(id);
        await loadData();
      } catch (err) {
        console.error("Failed to delete commission:", err);
      }
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriceInput("");
    setDepositPct(defaultDepositPct);
    setDeadline("");
    setNotes("");
    setLineItems([]);
  };

  const calculatedDeposit = calculateDeposit(parseToCents(priceInput), depositPct);

  const filteredCommissions = commissions.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Paid</Badge>;
      case "deposit_paid":
        return <Badge variant="warning">Deposit Paid</Badge>;
      case "partially_paid":
        return <Badge variant="info">Partially Paid</Badge>;
      default:
        return <Badge variant="neutral">Unpaid</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
            Commissions & Job Orders
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Track individual jobs, custom line items, upfront deposits, and balances.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          New Commission
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-[#8C867A]" />
            <input
              type="text"
              placeholder="Search by job title or client..."
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
            <option value="inquiry">Inquiry</option>
            <option value="quoted">Quoted</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="for_review">For Review</option>
            <option value="revision">Revision</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="text-xs text-[#78716C]">
          Showing <span className="font-semibold text-[#1C1917]">{filteredCommissions.length}</span> commissions
        </div>
      </div>

      {/* Commissions Table */}
      {filteredCommissions.length > 0 ? (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E0D5] bg-[#FAF8F5] text-[#57534E] font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3">Commission Job</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Deposit ({defaultDepositPct}%)</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3 text-center">Payment</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE8DE]">
                {filteredCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[#1C1917]">{comm.title}</div>
                      <div className="text-[11px] text-[#78716C]">
                        {comm.commission_type || "Standard"}
                        {comm.project_name ? ` • ${comm.project_name}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#1C1917]">
                      {comm.client_name}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[#1C1917]">
                      {formatCents(comm.price_cents, currencySymbol)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[#854D0E] font-medium">
                      {formatCents(comm.deposit_amount_cents, currencySymbol)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums font-bold text-[#B45309]">
                      {formatCents(comm.remaining_balance_cents, currencySymbol)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {getPaymentStatusBadge(comm.payment_status)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <select
                        value={comm.status}
                        onChange={(e) => handleUpdateStatus(comm.id, e.target.value)}
                        className="text-[11px] font-semibold rounded px-2 py-0.5 border border-[#E5E0D5] bg-[#FAF8F5] text-[#1C1917] focus:outline-none"
                      >
                        <option value="inquiry">Inquiry</option>
                        <option value="quoted">Quoted</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="for_review">For Review</option>
                        <option value="revision">Revision</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteCommission(comm.id)}
                        className="p-1 rounded text-[#8C867A] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                        title="Delete / Cancel Commission"
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
            icon={<Sparkles size={28} />}
            title="No commissions found"
            description={
              searchQuery
                ? `No commissions matched "${searchQuery}".`
                : "Create your first commission to start tracking freelance deliverables, deposits, and balances."
            }
            actionLabel="New Commission"
            actionIcon={<Plus size={14} />}
            onAction={() => setIsCreateModalOpen(true)}
          />
        )
      )}

      {/* Create Commission Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Commission"
        description="Specify job requirements, itemized line items, and upfront deposit percentage."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCommission} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wider mb-1.5">
                Client *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-md border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wider mb-1.5">
                Related Project (Optional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-md border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
              >
                <option value="">None (Stand-alone Commission)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.client_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Commission Title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Character Illustration Full Body"
                required
                autoFocus
              />
            </div>
            <Input
              label="Type / Category"
              value={commissionType}
              onChange={(e) => setCommissionType(e.target.value)}
              placeholder="Illustration, Writing..."
            />
          </div>

          {/* Pricing & Deposit Section */}
          <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#ECE8DE] space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-[#1C1917]">
                Pricing & Deposit Schedule
              </div>
              <button
                type="button"
                onClick={addLineItem}
                className="text-xs text-[#854D0E] font-medium hover:underline flex items-center gap-1"
              >
                <Plus size={12} />
                <span>Add Line Item</span>
              </button>
            </div>

            {/* Line items if any */}
            {lineItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Item description (e.g. Commercial License)"
                  value={item.description}
                  onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                  className="flex-1 rounded border border-[#E5E0D5] px-2 py-1 text-xs bg-white"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(idx, "quantity", parseInt(e.target.value, 10) || 1)
                  }
                  className="w-14 rounded border border-[#E5E0D5] px-2 py-1 text-xs bg-white text-center"
                />
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={item.unit_price_cents ? item.unit_price_cents / 100 : ""}
                  onChange={(e) =>
                    updateLineItem(
                      idx,
                      "unit_price_cents",
                      Math.round(parseFloat(e.target.value || "0") * 100)
                    )
                  }
                  className="w-24 rounded border border-[#E5E0D5] px-2 py-1 text-xs bg-white text-right font-mono"
                />
                <button
                  type="button"
                  onClick={() => removeLineItem(idx)}
                  className="p-1 text-[#8C867A] hover:text-[#DC2626]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-[#E5E0D5]">
              <Input
                label={`Total Price (${currencySymbol}) *`}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="2000"
                required
              />
              <Input
                label="Deposit (%)"
                type="number"
                min="0"
                max="100"
                value={depositPct}
                onChange={(e) => setDepositPct(parseInt(e.target.value, 10) || 0)}
              />
              <div>
                <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wider mb-1.5">
                  Calculated Deposit
                </label>
                <div className="py-2 text-xs font-mono font-bold text-[#854D0E]">
                  {formatCents(calculatedDeposit.depositCents, currencySymbol)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date Requested"
              type="date"
              value={dateRequested}
              onChange={(e) => setDateRequested(e.target.value)}
            />
            <Input
              label="Delivery Deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wider mb-1.5">
              Commission Notes / Specs
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Character details, canvas resolution, delivery formats..."
              className="w-full rounded-md border border-[#E5E0D5] bg-white p-3 text-xs text-[#1C1917] focus:outline-none"
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
              disabled={isSubmitting || !title.trim() || !clientId}
            >
              {isSubmitting ? "Creating..." : "Save Commission"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
