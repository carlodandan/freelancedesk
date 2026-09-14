import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  PieChart,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { FinancialReportData } from "../../types/entities";
import { tauriService } from "../../services/tauri";
import { formatCents } from "../../services/currency";

interface ReportsViewProps {
  currencySymbol: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currencySymbol }) => {
  const [reportData, setReportData] = useState<FinancialReportData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await tauriService.getFinancialReports();
      setReportData(data);
    } catch (err) {
      console.error("Failed to load reports:", err);
      setLoadError("Financial reports could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const exportCsv = () => {
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Month,Income,Expenses,Net Profit\n";

    for (const pt of reportData.monthly_breakdown) {
      const inc = (pt.income_cents / 100).toFixed(2);
      const exp = (pt.expense_cents / 100).toFixed(2);
      const prof = (pt.profit_cents / 100).toFixed(2);
      csvContent += `${pt.month},${inc},${exp},${prof}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `FreelanceDesk_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalIncome = reportData ? reportData.total_income_cents : 0;
  const totalExpenses = reportData ? reportData.total_expenses_cents : 0;
  const netProfit = reportData ? reportData.net_profit_cents : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
            Financial Reports
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Clear monthly performance, category expenses, and profit ledger.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={14} />}
          onClick={exportCsv}
          disabled={!reportData || reportData.monthly_breakdown.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#8C867A] bg-white border border-[#E5E0D5] rounded-lg">
          Loading financial performance ledger...
        </div>
      ) : loadError ? (
        <div className="p-12 text-center text-xs text-[#78716C] bg-white border border-[#E5E0D5] rounded-lg">
          <p>{loadError}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* 3 Core High-Level Ledger Summaries */}
          <div className="grid grid-cols-3 gap-5">
            <div className="bg-white border border-[#E5E0D5] rounded-lg p-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#78716C]">
                <span>Total Income</span>
                <TrendingUp size={16} className="text-[#166534]" />
              </div>
              <div className="mt-3 text-2xl font-bold font-mono text-[#166534] tabular-nums">
                +{formatCents(totalIncome, currencySymbol)}
              </div>
              <div className="mt-1 text-[11px] text-[#78716C]">
                All logged client payments
              </div>
            </div>

            <div className="bg-white border border-[#E5E0D5] rounded-lg p-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#78716C]">
                <span>Total Expenses</span>
                <TrendingDown size={16} className="text-[#B45309]" />
              </div>
              <div className="mt-3 text-2xl font-bold font-mono text-[#B45309] tabular-nums">
                -{formatCents(totalExpenses, currencySymbol)}
              </div>
              <div className="mt-1 text-[11px] text-[#78716C]">
                Equipment, tools & operations
              </div>
            </div>

            <div className="bg-white border border-[#E5E0D5] rounded-lg p-5">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#78716C]">
                <span>Net Profit</span>
                <DollarSign size={16} className="text-[#854D0E]" />
              </div>
              <div
                className={`mt-3 text-2xl font-bold font-mono tabular-nums ${
                  netProfit >= 0 ? "text-[#1C1917]" : "text-[#DC2626]"
                }`}
              >
                {formatCents(netProfit, currencySymbol)}
              </div>
              <div className="mt-1 text-[11px] text-[#78716C]">
                Income minus operating expenses
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <Card
            header={
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-[#854D0E]" />
                <span>Monthly Income & Profit Breakdown</span>
              </div>
            }
            noPadding
          >
            {reportData && reportData.monthly_breakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E0D5] bg-[#FAF8F5] text-[#57534E] font-semibold uppercase tracking-wider">
                      <th className="px-5 py-3">Month</th>
                      <th className="px-4 py-3 text-right">Income</th>
                      <th className="px-4 py-3 text-right">Expenses</th>
                      <th className="px-5 py-3 text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE8DE]">
                    {reportData.monthly_breakdown.map((m) => (
                      <tr
                        key={m.month}
                        className="hover:bg-[#FAF8F5] transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono font-medium text-[#1C1917]">
                          {m.month}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[#166534] font-medium">
                          +{formatCents(m.income_cents, currencySymbol)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[#B45309]">
                          -{formatCents(m.expense_cents, currencySymbol)}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-mono tabular-nums font-bold ${
                            m.profit_cents >= 0
                              ? "text-[#1C1917]"
                              : "text-[#DC2626]"
                          }`}
                        >
                          {formatCents(m.profit_cents, currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#8C867A]">
                No monthly financial data recorded yet.
              </div>
            )}
          </Card>

          {/* Two Column: Category Breakdown & Top Clients */}
          <div className="grid grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-[#854D0E]" />
                  <span>Expenses by Category</span>
                </div>
              }
              noPadding
            >
              {reportData && reportData.category_breakdown.length > 0 ? (
                <div className="divide-y divide-[#ECE8DE]">
                  {reportData.category_breakdown.map((c) => (
                    <div
                      key={c.category_name}
                      className="p-3.5 flex items-center justify-between text-xs hover:bg-[#FAF8F5]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1C1917]">
                          {c.category_name}
                        </span>
                        <span className="text-[11px] text-[#78716C]">
                          ({c.percentage}%)
                        </span>
                      </div>
                      <div className="font-mono tabular-nums font-medium text-[#B45309]">
                        {formatCents(c.total_cents, currencySymbol)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#8C867A]">
                  No expenses recorded by category.
                </div>
              )}
            </Card>

            {/* Top Clients by Revenue */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#166534]" />
                  <span>Top Clients by Income</span>
                </div>
              }
              noPadding
            >
              {reportData && reportData.client_breakdown.length > 0 ? (
                <div className="divide-y divide-[#ECE8DE]">
                  {reportData.client_breakdown.map((cl, idx) => (
                    <div
                      key={cl.client_name}
                      className="p-3.5 flex items-center justify-between text-xs hover:bg-[#FAF8F5]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#8C867A] w-5">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-[#1C1917]">
                          {cl.client_name}
                        </span>
                      </div>
                      <div className="font-mono tabular-nums font-bold text-[#166534]">
                        {formatCents(cl.total_cents, currencySymbol)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#8C867A]">
                  No client revenue recorded yet.
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
