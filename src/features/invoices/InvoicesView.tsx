import React, { useState, useEffect } from "react";
import { FileText, Plus, Search, FileDown, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  InvoiceItem,
  ClientItem,
  CreateInvoiceInput,
  CreateInvoiceLineItemInput,
} from "../../types/entities";
import { AppSettings } from "../../types/settings";
import { tauriService } from "../../services/tauri";
import { formatCents } from "../../services/currency";
import { generateInvoicePdf } from "../../services/pdf";

interface InvoicesViewProps {
  currencySymbol: string;
  settings: AppSettings;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  currencySymbol,
  settings,
}) => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const { showToast } = useToast();

  // Form state
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [taxRateInput, setTaxRateInput] = useState("0");
  const [notes, setNotes] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState(
    settings.default_payment_terms || "Payment due within 15 days of invoice date."
  );
  const [lineItems, setLineItems] = useState<CreateInvoiceLineItemInput[]>([
    { description: "Freelance Service", quantity: 1, unit_price_cents: 100000 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invData, clientData] = await Promise.all([
        tauriService.getInvoices(),
        tauriService.getClients(),
      ]);
      setInvoices(invData);
      setClients(clientData);
      if (clientData.length > 0 && !clientId) {
        setClientId(clientData[0].id);
      }
    } catch (err) {
      console.error("Failed to load invoice data:", err);
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
  };

  const updateLineItem = (
    index: number,
    field: keyof CreateInvoiceLineItemInput,
    value: any
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || lineItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const discountCents = Math.round(parseFloat(discountInput || "0") * 100);
      const taxRateBps = Math.round(parseFloat(taxRateInput || "0") * 100); // 12% = 1200 bps

      const input: CreateInvoiceInput = {
        client_id: clientId,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        discount_cents: discountCents,
        tax_rate_bps: taxRateBps,
        notes: notes.trim() || undefined,
        payment_instructions: paymentInstructions.trim() || undefined,
        items: lineItems,
      };

      const newInv = await tauriService.createInvoice(input);
      setIsDraftModalOpen(false);
      await loadData();

      showToast({
        type: "success",
        message: `Invoice #${newInv.invoice_number} created!`,
        action: {
          label: "Download PDF",
          onClick: () => generateInvoicePdf(newInv, settings, true),
        },
      });

      // Offer immediate PDF download
      if (window.confirm(`Invoice ${newInv.invoice_number} created! Would you like to download the PDF now?`)) {
        generateInvoicePdf(newInv, settings, true);
      }
    } catch (err) {
      console.error("Failed to create invoice:", err);
      showToast({
        type: "danger",
        message: "Failed to create invoice.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await tauriService.updateInvoiceStatus(id, status);
      showToast({
        type: "info",
        message: `Invoice status updated to ${status}.`,
      });
      await loadData();
    } catch (err) {
      console.error("Failed to update invoice status:", err);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm("Delete this invoice record?")) {
      try {
        await tauriService.deleteInvoice(id);
        showToast({
          type: "info",
          message: "Invoice record deleted.",
        });
        await loadData();
      } catch (err) {
        console.error("Failed to delete invoice:", err);
      }
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
            Invoices
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Generate clean, professional offline PDF invoices with sequential numbering.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setIsDraftModalOpen(true)}
        >
          Draft Invoice
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-80">
          <Search size={14} className="absolute left-3 top-2.5 text-[#8C867A]" />
          <input
            type="text"
            placeholder="Search invoices by number or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#E5E0D5] bg-white text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20"
          />
        </div>
        <div className="text-xs text-[#78716C]">
          Showing <span className="font-semibold text-[#1C1917]">{filteredInvoices.length}</span> invoices
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length > 0 ? (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E0D5] bg-[#FAF8F5] text-[#57534E] font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE8DE]">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-[#854D0E]">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[#1C1917]">
                      {inv.client_name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#57534E]">
                      {inv.issue_date}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#57534E]">
                      {inv.due_date || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums font-bold text-[#1C1917]">
                      {formatCents(inv.total_cents, currencySymbol)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <select
                        value={inv.status}
                        onChange={(e) => handleUpdateStatus(inv.id, e.target.value)}
                        className="text-[11px] font-semibold rounded px-2 py-0.5 border border-[#E5E0D5] bg-[#FAF8F5] text-[#1C1917] focus:outline-none"
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => generateInvoicePdf(inv, settings, true)}
                          className="p-1 rounded text-[#854D0E] hover:text-[#713F12] hover:bg-[#F4F1EA] flex items-center gap-1 text-[11px] font-medium"
                          title="Download Invoice PDF"
                        >
                          <FileDown size={14} />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="p-1 rounded text-[#8C867A] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                          title="Delete Invoice"
                        >
                          <Trash2 size={14} />
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
            icon={<FileText size={28} />}
            title="No invoices created"
            description={
              searchQuery
                ? `No invoices matched "${searchQuery}".`
                : "Draft your first invoice with itemized services, taxes, and payment instructions."
            }
            actionLabel="Draft Invoice"
            actionIcon={<Plus size={14} />}
            onAction={() => setIsDraftModalOpen(true)}
          />
        )
      )}

      {/* Draft Invoice Modal */}
      <Modal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        title="Draft New Invoice"
        description="Generate an invoice with custom line items, tax, and terms."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Select
                label="Client *"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
                required
              />
            </div>
            <Input
              label="Issue Date *"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Line items */}
          <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#ECE8DE] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1C1917]">
                Invoice Line Items
              </span>
              <button
                type="button"
                onClick={addLineItem}
                className="text-xs text-[#854D0E] font-medium hover:underline flex items-center gap-1"
              >
                <Plus size={12} />
                <span>Add Item</span>
              </button>
            </div>

            {lineItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Service description"
                  value={item.description}
                  onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                  className="flex-1 rounded border border-[#E5E0D5] px-2 py-1 text-xs bg-white"
                  required
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
                  placeholder="Price"
                  value={item.unit_price_cents ? item.unit_price_cents / 100 : ""}
                  onChange={(e) =>
                    updateLineItem(
                      idx,
                      "unit_price_cents",
                      Math.round(parseFloat(e.target.value || "0") * 100)
                    )
                  }
                  className="w-24 rounded border border-[#E5E0D5] px-2 py-1 text-xs bg-white text-right font-mono"
                  required
                />
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(idx)}
                    className="p-1 text-[#8C867A] hover:text-[#DC2626]"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Discount (${currencySymbol})`}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="0"
              prefixIcon={<span className="text-xs font-semibold text-[var(--text-muted)]">{currencySymbol}</span>}
            />
            <Input
              label="Tax Rate (%)"
              value={taxRateInput}
              onChange={(e) => setTaxRateInput(e.target.value)}
              placeholder="0 (e.g. 12 for 12%)"
            />
          </div>

          <Textarea
            label="Payment Instructions / Terms"
            rows={2}
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
          />

          <Textarea
            label="Notes / Memo"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Thank you for your business!"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsDraftModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !clientId || lineItems.length === 0}
            >
              {isSubmitting ? "Generating..." : "Generate Invoice"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
