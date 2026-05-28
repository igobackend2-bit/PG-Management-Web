import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { useToast } from '../../../shared/hooks/useToast';
import {
  fetchMonthlyReport, fetchMonthlyTrend,
  type MonthlyReport, type TrendMonth,
} from '../services/reports.service';
import './ReportsPage.scss';

const CURRENCY = (n: number) => '₹' + n.toLocaleString('en-IN');

function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

function monthOptions(): string[] { return getLastNMonths(12); }

function formatMonth(m: string) {
  return new Date(m + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function shortMonth(m: string) {
  return new Date(m + '-01').toLocaleString('en-IN', { month: 'short', year: '2-digit' });
}

export function ReportsPage() {
  const { selectedBranch } = useBranchStore();
  const toast = useToast();
  const [month,  setMonth]  = useState(() => new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [trend,  setTrend]  = useState<TrendMonth[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);

  const load = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try { setReport(await fetchMonthlyReport(selectedBranch.id, month)); }
    catch (err) {
      console.error('[Reports]', err);
      toast.error('Failed to load report. Please try again.');
    }
    finally { setLoading(false); }
  }, [selectedBranch, month]);

  const loadTrend = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingTrend(true);
    try {
      const months = getLastNMonths(6).reverse();
      setTrend(await fetchMonthlyTrend(selectedBranch.id, months));
    } catch {
      // trend is secondary — fail silently in UI
    } finally { setLoadingTrend(false); }
  }, [selectedBranch]);

  useEffect(() => { load(); },      [load]);
  useEffect(() => { loadTrend(); }, [loadTrend]);

  if (!selectedBranch) return (
    <div className="reports-page">
      <div className="empty-state"><div className="empty-icon">🏢</div><div className="empty-title">No Branch Selected</div></div>
    </div>
  );

  // Max expense amount for bar width calculation
  const maxExpAmt = report
    ? Math.max(...report.expenseByCategory.map((e) => e.amount), 1)
    : 1;

  // Max trend value for bar scaling
  const maxTrendAmt = trend.length
    ? Math.max(...trend.flatMap((t) => [t.revenue, t.expenses]), 1)
    : 1;

  return (
    <div className="reports-page">
      <div className="page-header">
        <div className="header-left"><h2>Reports & Analytics</h2><span className="branch-tag">{selectedBranch.name}</span></div>
        <button className="btn-print" onClick={() => window.print()}>🖨️ Print</button>
      </div>

      <div className="controls-bar">
        <label>Month:</label>
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {monthOptions().map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-wrap"><span className="loader" /></div>
      ) : report ? (
        <>
          {/* ── KPI Cards ─────────────────────────────────────────────────── */}
          <h3 className="section-title">P&L Summary — {formatMonth(month)}</h3>

          <div className="stats-row">
            <div className="stat-card green">
              <div className="stat-value">{CURRENCY(report.rentCollected)}</div>
              <div className="stat-label">Rent Collected</div>
              <div className="stat-sub">{report.paidTenants} of {report.activeTenants} tenants</div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-value">{CURRENCY(report.rentPending)}</div>
              <div className="stat-label">Rent Pending</div>
              <div className="stat-sub">{CURRENCY(report.rentDue)} billed total</div>
            </div>
            <div className="stat-card red">
              <div className="stat-value">{CURRENCY(report.totalExpenditure)}</div>
              <div className="stat-label">Total Expenses</div>
              <div className="stat-sub">Ops + Food</div>
            </div>
            <div className={`stat-card ${report.netPL >= 0 ? 'green' : 'red'}`}>
              <div className="stat-value">{CURRENCY(report.netPL)}</div>
              <div className="stat-label">Net {report.netPL >= 0 ? 'Profit' : 'Loss'}</div>
              <div className="stat-sub">{report.margin}% margin</div>
            </div>
          </div>

          {/* ── P&L Breakdown ─────────────────────────────────────────────── */}
          <div className="report-grid">
            <div className="breakdown-card">
              <h4>Income & Expenditure</h4>
              <table className="breakdown-table">
                <tbody>
                  <tr className="section-hdr"><td colSpan={3}>💰 Income</td></tr>
                  <tr>
                    <td>Rent Collected</td>
                    <td className="amount col-green">{CURRENCY(report.rentCollected)}</td>
                    <td className="pct">{report.rentDue > 0 ? Math.round((report.rentCollected / report.rentDue) * 100) : 0}%</td>
                  </tr>
                  <tr className="text-muted">
                    <td>Rent Due (billed)</td>
                    <td className="amount">{CURRENCY(report.rentDue)}</td>
                    <td></td>
                  </tr>
                  <tr className="sub-total">
                    <td><strong>Total Income</strong></td>
                    <td className="amount col-green"><strong>{CURRENCY(report.totalIncome)}</strong></td>
                    <td></td>
                  </tr>

                  <tr className="section-hdr"><td colSpan={3}>💸 Expenditure</td></tr>
                  <tr>
                    <td>Operational Expenses</td>
                    <td className="amount col-red">{CURRENCY(report.expenses)}</td>
                    <td className="pct">{report.rentCollected > 0 ? Math.round((report.expenses / report.rentCollected) * 100) : 0}%</td>
                  </tr>
                  <tr>
                    <td>Food & Kitchen</td>
                    <td className="amount col-red">{CURRENCY(report.foodCost)}</td>
                    <td className="pct">{report.rentCollected > 0 ? Math.round((report.foodCost / report.rentCollected) * 100) : 0}%</td>
                  </tr>
                  <tr className="sub-total">
                    <td><strong>Total Expenditure</strong></td>
                    <td className="amount col-red"><strong>{CURRENCY(report.totalExpenditure)}</strong></td>
                    <td></td>
                  </tr>

                  <tr className="pl-row">
                    <td><strong>Net Profit / Loss</strong></td>
                    <td className={`amount ${report.netPL >= 0 ? 'col-green' : 'col-red'}`}>
                      <strong>{CURRENCY(report.netPL)}</strong>
                    </td>
                    <td className={`pct ${report.netPL >= 0 ? 'col-green' : 'col-red'}`}>{report.margin}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── Expense Category Breakdown ─────────────────────────────── */}
            {report.expenseByCategory.length > 0 && (
              <div className="breakdown-card">
                <h4>Expense Breakdown by Category</h4>
                <div className="cat-breakdown">
                  {report.expenseByCategory.map(({ category, amount }) => {
                    const pct = Math.round((amount / report.totalExpenditure) * 100);
                    const barPct = Math.round((amount / maxExpAmt) * 100);
                    return (
                      <div key={category} className="cat-row">
                        <div className="cat-name">{category}</div>
                        <div className="cat-bar-wrap">
                          <div className="cat-bar" style={{ width: `${barPct}%` }} />
                        </div>
                        <div className="cat-amount">{CURRENCY(amount)}</div>
                        <div className="cat-pct">{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── 6-Month Trend ─────────────────────────────────────────────── */}
          {!loadingTrend && trend.length > 0 && (
            <div className="breakdown-card trend-section">
              <h4>6-Month Trend</h4>
              <div className="trend-table-wrap">
                <table className="breakdown-table trend-tbl">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Revenue</th>
                      <th>Expenses</th>
                      <th>Net P&L</th>
                      <th>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.map((t) => {
                      const margin = t.revenue > 0 ? Math.round((t.netPL / t.revenue) * 100) : 0;
                      return (
                        <tr key={t.month} className={t.month === month ? 'current-month-row' : ''}>
                          <td className="bold">{shortMonth(t.month)}{t.month === month ? ' ◀' : ''}</td>
                          <td>
                            <div className="trend-bar-cell">
                              <div className="trend-bar rev" style={{ width: `${Math.round((t.revenue / maxTrendAmt) * 80)}%` }} />
                              <span className="col-green">{CURRENCY(t.revenue)}</span>
                            </div>
                          </td>
                          <td>
                            <div className="trend-bar-cell">
                              <div className="trend-bar exp" style={{ width: `${Math.round((t.expenses / maxTrendAmt) * 80)}%` }} />
                              <span className="col-red">{CURRENCY(t.expenses)}</span>
                            </div>
                          </td>
                          <td className={t.netPL >= 0 ? 'col-green' : 'col-red'}>
                            {t.netPL >= 0 ? '+' : ''}{CURRENCY(t.netPL)}
                          </td>
                          <td className={margin >= 0 ? 'col-green' : 'col-red'}>{margin}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
