import React, { useState, useEffect } from "react";
import { Receipt, Plus, Search, Trash2, Tag } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  ExpenseItem,
  ExpenseCategoryItem,
  ProjectItem,
  CreateExpenseInput,
} from "../../types/entities";
import { tauriService } from "../../services/tauri";
import { formatCents, parseToCents } from "../../services/currency";

interface ExpensesViewProps {
  currencySymbol: string;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ currencySymbol }) => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);

  // Form state
  const [categoryId, setCategoryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [notes, setNotes] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [expData, catData, projData] = await Promise.all([
        tauriService.getExpenses(),
        tauriService.getExpenseCategories(),
        tauriService.getProjects(),
      ]);
      setExpenses(expData);
      setCategories(catData);
      setProjects(projData);
      if (catData.length > 0 && !categoryId) {
        setCategoryId(catData[0].id);
      }
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !description.trim() || !amountInput) return;

    setIsSubmitting(true);
    try {
      const amountCents = parseToCents(amountInput);
      const input: CreateExpenseInput = {
        project_id: projectId.trim() || undefined,
        category_id: categoryId,
        amount_cents: amountCents,
        date,
        description: description.trim(),
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      };

      await tauriService.createExpense(input);
      setIsAddModalOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Failed to add expense:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const cat = await tauriService.createExpenseCategory(newCategoryName.trim());
      setCategories([...categories, cat]);
      setCategoryId(cat.id);
      setNewCategoryName("");
      setIsNewCategoryModalOpen(false);
    } catch (err) {
      console.error("Failed to add category:", err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm("Delete this expense record?")) {
      try {
        await tauriService.deleteExpense(id);
        await loadData();
      } catch (err) {
        console.error("Failed to delete expense:", err);
      }
    }
  };

  const resetForm = () => {
    setDescription("");
    setAmountInput("");
    setNotes("");
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenseCents = expenses.reduce((sum, e) => sum + e.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
            Business Expenses
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Log equipment, software subscriptions, studio costs, and deductibles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Tag size={13} />}
            onClick={() => setIsNewCategoryModalOpen(true)}
          >
            New Category
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E0D5] rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase text-[#78716C]">
            Total Expenses
          </div>
          <div className="text-xl font-bold font-mono text-[#B45309] mt-1 tabular-nums">
            {formatCents(totalExpenseCents, currencySymbol)}
          </div>
        </div>
        <div className="bg-white border border-[#E5E0D5] rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase text-[#78716C]">
            Logged Entries
          </div>
          <div className="text-xl font-bold font-mono text-[#1C1917] mt-1 tabular-nums">
            {expenses.length}
          </div>
        </div>
        <div className="bg-white border border-[#E5E0D5] rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase text-[#78716C]">
            Active Categories
          </div>
          <div className="text-xl font-bold font-mono text-[#1C1917] mt-1 tabular-nums">
            {categories.length}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-[#8C867A]" />
            <input
              type="text"
              placeholder="Search by description or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md border border-[#E5E0D5] bg-white text-xs text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-[#78716C]">
          Showing <span className="font-semibold text-[#1C1917]">{filteredExpenses.length}</span> expenses
        </div>
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length > 0 ? (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E0D5] bg-[#FAF8F5] text-[#57534E] font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE8DE]">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-[#57534E]">
                      {exp.date}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[#1C1917]">
                      {exp.description}
                      {exp.notes && (
                        <div className="text-[11px] font-normal text-[#78716C] line-clamp-1">
                          {exp.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-[#F4F1EA] text-[#57534E] font-medium border border-[#E5E0D5]">
                        {exp.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#57534E]">
                      {exp.payment_method}
                    </td>
                    <td className="px-4 py-3.5 text-[#78716C]">
                      {exp.project_name || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums font-bold text-[#B45309]">
                      -{formatCents(exp.amount_cents, currencySymbol)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 rounded text-[#8C867A] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                        title="Delete Expense"
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
            icon={<Receipt size={28} />}
            title="No expenses recorded"
            description={
              searchQuery
                ? `No expenses matched "${searchQuery}".`
                : "Keep track of deductible business expenses by category and project attribution."
            }
            actionLabel="Add Expense"
            actionIcon={<Plus size={14} />}
            onAction={() => setIsAddModalOpen(true)}
          />
        )
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Business Expense"
        description="Log an operating expense, subscription, or equipment purchase."
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <Input
            label="Expense Description *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Adobe Creative Cloud Monthly"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={`Amount (${currencySymbol}) *`}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="1500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date *"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wider mb-1.5">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-md border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="PayPal">PayPal</option>
                <option value="Other">Other</option>
              </select>
            </div>
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
              <option value="">None (General Business Expense)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Notes / Receipt Details"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Tax deductible annual invoice #19203"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !categoryId || !description.trim() || !amountInput}
            >
              {isSubmitting ? "Saving..." : "Record Expense"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Category Modal */}
      <Modal
        isOpen={isNewCategoryModalOpen}
        onClose={() => setIsNewCategoryModalOpen(false)}
        title="Add Expense Category"
        description="Create a custom category to classify your freelance expenses."
      >
        <form onSubmit={handleAddCustomCategory} className="space-y-4">
          <Input
            label="Category Name *"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Freelance Subcontractors"
            required
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsNewCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!newCategoryName.trim()}
            >
              Add Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
