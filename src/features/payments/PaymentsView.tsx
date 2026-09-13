import React, { useState, useEffect } from "react";
import { CreditCard, Plus, Search, FileDown, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  PaymentItem,
  ClientItem,
  CommissionItem,
  CreatePaymentInput,
} from "../../types/entities";
import { AppSettings } from "../../types/settings";
import { tauriService } from "../../services/tauri";
import { formatCents, parseToCents } from "../../services/currency";
import { generateReceiptPdf } from "../../services/pdf";

interface PaymentsViewProps {
  currencySymbol: string;
  settings: AppSettings;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  currencySymbol,
  settings,
}) => {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const { showToast } = useToast();

  // Form state
  const [clientId, setClientId] = useState("");
  const [commissionId, setCommissionId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [payData, clientData, commData] = await Promise.all([
        tauriService.getPayments(),
        tauriService.getClients(),
        tauriService.getCommissions(),
      ]);
      setPayments(payData);
      setClients(clientData);
      setCommissions(commData);
      if (clientData.length > 0 && !clientId) {
        setClientId(clientData[0].id);
      }
    } catch (err) {
      console.error("Failed to load payment data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCommissionSelect = (commId: string) => {
    setCommissionId(commId);
    if (!commId) return;

    const comm = commissions.find((c) => c.id === commId);
    if (comm) {
      setClientId(comm.client_id);
      if (comm.remaining_balance_cents > 0) {
        setAmountInput((comm.remaining_balance_cents / 100).toString());
      }
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !amountInput) return;

    setIsSubmitting(true);
    try {
      const amountCents = parseToCents(amountInput);
      const input: CreatePaymentInput = {
        client_id: clientId,
        commission_id: commissionId || undefined,
        amount_cents: amountCents,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const newPayment = await tauriService.createPayment(input);
      setIsRecordModalOpen(false);
      resetForm();
      await loadData();

      const comm = commissions.find((c) => c.id === commissionId);
      const remaining = comm
        ? Math.max(0, comm.remaining_balance_cents - amountCents)
        : undefined;

      showToast({
        type: "success",
        message: `Payment of ${formatCents(amountCents, currencySymbol)} recorded!`,
        action: {
          label: "Download Receipt",
          onClick: () =>
            generateReceiptPdf(
              newPayment,
              settings,
              comm?.title,
              remaining,
              true,
            ),
        },
      });

      // Offer immediate PDF receipt download
      if (
        window.confirm(
          "Payment recorded! Would you like to download the official PDF receipt?",
        )
      ) {
        generateReceiptPdf(newPayment, settings, comm?.title, remaining, true);
      }
    } catch (err) {
      console.error("Failed to record payment:", err);
      showToast({
        type: "danger",
        message: "Failed to record payment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (
      window.confirm(
        "Delete this payment record? Commission balances will adjust.",
      )
    ) {
      try {
        await tauriService.deletePayment(id);
        showToast({
          type: "info",
          message: "Payment record deleted.",
        });
        await loadData();
      } catch (err) {
        console.error("Failed to delete payment:", err);
      }
    }
  };

  const resetForm = () => {
    setCommissionId("");
    setAmountInput("");
    setReferenceNumber("");
    setNotes("");
  };

  const filteredPayments = payments.filter((p) => {
    return (
      p.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.commission_title &&
        p.commission_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.receipt_number &&
        p.receipt_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.reference_number &&
        p.reference_number.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const totalCollectedCents = payments.reduce(
    (sum, p) => sum + p.amount_cents,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
            Payments Ledger
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Record client deposits, final balances, and export verified PDF
            receipts.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setIsRecordModalOpen(true)}
        >
          Record Payment
        </Button>
      </div>

      {/* Financial Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
            Total Collected
          </div>
          <div className="text-xl font-bold font-mono text-[var(--color-success)] mt-1 tabular-nums">
            {formatCents(totalCollectedCents, currencySymbol)}
          </div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
            Logged Transactions
          </div>
          <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1 tabular-nums">
            {payments.length}
          </div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase text-[var(--text-muted)] tracking-wider">
            Preferred Method
          </div>
          <div className="text-base font-semibold text-[var(--text-primary)] mt-1">
            Bank Transfer / GCash
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-80">
          <Search
            size={14}
            className="absolute left-3 top-2.5 text-[var(--text-muted)]"
          />
          <input
            type="text"
            placeholder="Search payments by client, reference, or receipt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          Showing{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {filteredPayments.length}
          </span>{" "}
          payments
        </div>
      </div>

      {/* Payments Table */}
      {filteredPayments.length > 0 ? (
        <Card noPadding>
          <div className="overflow-x-auto select-text">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3">Receipt #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Commission / Job</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Receipt PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[var(--surface-muted)] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-[11px] font-medium text-[var(--primary)]">
                      {p.receipt_number || p.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[var(--text-primary)]">
                      {p.client_name}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                      {p.commission_title || "Direct Freelance Services"}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[var(--text-secondary)]">
                      {p.payment_date}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)] font-medium">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums font-bold text-[var(--color-success)]">
                      +{formatCents(p.amount_cents, currencySymbol)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            generateReceiptPdf(
                              p,
                              settings,
                              p.commission_title || undefined,
                              undefined,
                              true,
                            )
                          }
                          className="p-1 rounded text-[var(--primary)] hover:text-[var(--primary-hover)] hover:bg-[var(--surface-muted)] flex items-center gap-1 text-[11px] font-medium transition-colors"
                          title="Download Official Receipt PDF"
                          aria-label={`Download receipt PDF for ${p.receipt_number || p.client_name}`}
                        >
                          <FileDown size={14} />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-red-600 hover:bg-red-500/10 transition-colors"
                          title="Delete Payment"
                          aria-label={`Delete payment ${p.receipt_number || p.id}`}
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
            icon={<CreditCard size={28} />}
            title="No payments recorded"
            description={
              searchQuery
                ? `No payments matched "${searchQuery}".`
                : "Record client payments, deposits, or milestone fees to maintain your business ledger."
            }
            actionLabel="Record Payment"
            actionIcon={<Plus size={14} />}
            onAction={() => setIsRecordModalOpen(true)}
          />
        )
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Payment"
        description="Log an upfront deposit, milestone payment, or final balance."
        maxWidth="md"
      >
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <Select
            label="Related Commission (Optional)"
            value={commissionId}
            onChange={(e) => handleCommissionSelect(e.target.value)}
          >
            <option value="">None (General Client Payment)</option>
            {commissions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.client_name} (Remaining:{" "}
                {formatCents(c.remaining_balance_cents, currencySymbol)})
              </option>
            ))}
          </Select>

          <Select
            label="Client *"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Amount (${currencySymbol}) *`}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="1000"
              required
              autoFocus
              prefixIcon={
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  {currencySymbol}
                </span>
              }
            />
            <Input
              label="Payment Date *"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Payment Method *"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="GCash">GCash</option>
              <option value="Maya">Maya</option>
              <option value="Cash">Cash</option>
              <option value="PayPal">PayPal</option>
              <option value="Other">Other</option>
            </Select>
            <Input
              label="Reference / Transaction #"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. 1002349102"
            />
          </div>

          <Textarea
            label="Payment Notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Initial 50% deposit for character concept"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsRecordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !clientId || !amountInput}
            >
              {isSubmitting ? "Saving..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
