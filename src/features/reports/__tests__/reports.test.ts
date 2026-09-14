import { describe, it, expect } from "vitest";

interface Transaction {
  date: string;
  amount_cents: number;
  type: "income" | "expense";
  client_id?: string;
  category_id?: string;
}

describe("Reports Business Logic & Boundary Conditions", () => {
  const transactions: Transaction[] = [
    // August 31 (End of August)
    {
      date: "2026-08-31",
      amount_cents: 100000,
      type: "income",
      client_id: "client-a",
    },
    {
      date: "2026-08-31",
      amount_cents: 20000,
      type: "expense",
      category_id: "cat-software",
    },

    // September 1 (Start of September)
    {
      date: "2026-09-01",
      amount_cents: 250000,
      type: "income",
      client_id: "client-b",
    },
    {
      date: "2026-09-01",
      amount_cents: 50000,
      type: "expense",
      category_id: "cat-office",
    },

    // Mid September
    {
      date: "2026-09-15",
      amount_cents: 300000,
      type: "income",
      client_id: "client-a",
    },
    {
      date: "2026-09-15",
      amount_cents: 75000,
      type: "expense",
      category_id: "cat-software",
    },

    // September 30 (End of September)
    {
      date: "2026-09-30",
      amount_cents: 150000,
      type: "income",
      client_id: "client-b",
    },
    {
      date: "2026-09-30",
      amount_cents: 10000,
      type: "expense",
      category_id: "cat-supplies",
    },

    // October 1 (Start of October)
    {
      date: "2026-10-01",
      amount_cents: 400000,
      type: "income",
      client_id: "client-c",
    },
    {
      date: "2026-10-01",
      amount_cents: 60000,
      type: "expense",
      category_id: "cat-hardware",
    },
  ];

  const filterByMonth = (monthKey: string) => {
    return transactions.filter((t) => t.date.startsWith(monthKey));
  };

  it("strictly isolates August records (boundary check: August 31 included, Sept 1 excluded)", () => {
    const aug = filterByMonth("2026-08");
    expect(aug).toHaveLength(2);

    const augIncome = aug
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount_cents, 0);
    const augExpense = aug
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount_cents, 0);

    expect(augIncome).toBe(100000); // ₱1,000.00
    expect(augExpense).toBe(20000); // ₱200.00
    expect(augIncome - augExpense).toBe(80000); // Net ₱800.00
  });

  it("strictly isolates September records (boundary check: Sept 1 & Sept 30 included, Aug 31 & Oct 1 excluded)", () => {
    const sept = filterByMonth("2026-09");
    expect(sept).toHaveLength(6);

    const septIncome = sept
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount_cents, 0);
    const septExpense = sept
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount_cents, 0);

    // Income: 250k + 300k + 150k = 700k
    expect(septIncome).toBe(700000);
    // Expense: 50k + 75k + 10k = 135k
    expect(septExpense).toBe(135000);
    // Net: 700k - 135k = 565k
    expect(septIncome - septExpense).toBe(565000);
  });

  it("strictly isolates October records (boundary check: Oct 1 included, Sept 30 excluded)", () => {
    const oct = filterByMonth("2026-10");
    expect(oct).toHaveLength(2);

    const octIncome = oct
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount_cents, 0);
    const octExpense = oct
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount_cents, 0);

    expect(octIncome).toBe(400000);
    expect(octExpense).toBe(60000);
    expect(octIncome - octExpense).toBe(340000);
  });

  it("aggregates September income by client accurately", () => {
    const sept = filterByMonth("2026-09");
    const septIncome = sept.filter((t) => t.type === "income");

    const clientAIncome = septIncome
      .filter((t) => t.client_id === "client-a")
      .reduce((s, t) => s + t.amount_cents, 0);

    const clientBIncome = septIncome
      .filter((t) => t.client_id === "client-b")
      .reduce((s, t) => s + t.amount_cents, 0);

    expect(clientAIncome).toBe(300000); // ₱3,000.00
    expect(clientBIncome).toBe(400000); // ₱2,500 + ₱1,500 = ₱4,000.00
    expect(clientAIncome + clientBIncome).toBe(700000);
  });

  it("aggregates September expenses by category accurately", () => {
    const sept = filterByMonth("2026-09");
    const septExpenses = sept.filter((t) => t.type === "expense");

    const softwareExpenses = septExpenses
      .filter((t) => t.category_id === "cat-software")
      .reduce((s, t) => s + t.amount_cents, 0);

    expect(softwareExpenses).toBe(75000); // ₱750.00
  });

  it("supports custom date ranges without leaking boundary days", () => {
    const startDate = "2026-09-01";
    const endDate = "2026-09-15";

    const inRange = transactions.filter(
      (t) => t.date >= startDate && t.date <= endDate,
    );

    // Should include Sept 1 and Sept 15 only (4 transactions: 2 on Sept 1, 2 on Sept 15)
    expect(inRange).toHaveLength(4);
    const totalIncome = inRange
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount_cents, 0);
    expect(totalIncome).toBe(550000); // 250k + 300k
  });
});
