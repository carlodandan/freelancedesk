import { describe, it, expect } from "vitest";
import { calculateNetProfit } from "../../../services/currency";
import { ExpenseItem } from "../../../types/entities";

describe("Expenses Business Logic & Calculations", () => {
  const sampleExpenses: ExpenseItem[] = [
    {
      id: "exp-1",
      category_id: "cat-software",
      category_name: "Software & Subscriptions",
      amount_cents: 150000, // ₱1,500.00
      date: "2026-09-01",
      payment_method: "Bank Transfer",
      description: "Creative Cloud License",
      created_at: "2026-09-01T10:00:00Z",
    },
    {
      id: "exp-2",
      category_id: "cat-hardware",
      category_name: "Hardware & Equipment",
      amount_cents: 850000, // ₱8,500.00
      date: "2026-09-05",
      payment_method: "Credit Card",
      description: "Drawing Tablet Pen Replacement",
      project_id: "proj-123",
      project_name: "Brand Redesign",
      created_at: "2026-09-05T14:00:00Z",
    },
    {
      id: "exp-3",
      category_id: "cat-software",
      category_name: "Software & Subscriptions",
      amount_cents: 50000, // ₱500.00
      date: "2026-09-12",
      payment_method: "GCash",
      description: "Domain Renewal",
      created_at: "2026-09-12T09:00:00Z",
    },
    {
      id: "exp-4",
      category_id: "cat-office",
      category_name: "Office & Workspace",
      amount_cents: 200000, // ₱2,000.00
      date: "2026-08-25",
      payment_method: "Cash",
      description: "Desk Ergonomic Chair Cushion",
      created_at: "2026-08-25T11:00:00Z",
    },
  ];

  it("calculates total expense summation accurately in minor units", () => {
    const total = sampleExpenses.reduce(
      (sum, exp) => sum + exp.amount_cents,
      0,
    );
    expect(total).toBe(1250000); // ₱12,500.00
  });

  it("filters expenses by category", () => {
    const softwareExpenses = sampleExpenses.filter(
      (e) => e.category_id === "cat-software",
    );
    expect(softwareExpenses).toHaveLength(2);

    const totalSoftware = softwareExpenses.reduce(
      (s, e) => s + e.amount_cents,
      0,
    );
    expect(totalSoftware).toBe(200000); // ₱2,000.00
  });

  it("filters expenses by date range", () => {
    const septemberExpenses = sampleExpenses.filter(
      (e) => e.date >= "2026-09-01" && e.date <= "2026-09-30",
    );
    expect(septemberExpenses).toHaveLength(3);

    const totalSeptember = septemberExpenses.reduce(
      (s, e) => s + e.amount_cents,
      0,
    );
    expect(totalSeptember).toBe(1050000); // ₱10,500.00
  });

  it("filters expenses by associated project", () => {
    const projectExpenses = sampleExpenses.filter(
      (e) => e.project_id === "proj-123",
    );
    expect(projectExpenses).toHaveLength(1);
    expect(projectExpenses[0].project_name).toBe("Brand Redesign");
    expect(projectExpenses[0].amount_cents).toBe(850000);
  });

  it("verifies Income - Expenses = Net Profit calculation", () => {
    const totalIncome = 3500000; // ₱35,000.00
    const totalExpenses = 1250000; // ₱12,500.00
    const netProfit = calculateNetProfit(totalIncome, totalExpenses);

    expect(netProfit).toBe(2250000); // ₱22,500.00
  });
});
