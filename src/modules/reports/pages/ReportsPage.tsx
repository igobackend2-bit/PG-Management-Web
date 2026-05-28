import React, { useCallback, useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branchStore';
import { fetchMonthlyReport, type MonthlyReport } from '../services/reports.service';
import './ReportsPage.scss';

const CURRENCY = (n: number) => '₹' + n.toLocaleString('en-IN');

function monthOptions(): string[] {
  const opts: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push(d.toISOString().slice(0, 7));
  }
  return opts;
}

function formatMonth(m: string) {
  return new Date(m + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

export function ReportsPage() {
  const { selectedBranch } = useBranchStore();
  const [month, setMonth]   = useState(() => new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try { setReport(await fetchMonthlyReport(selectedBranch.id, month)); }
    catch (err) { console.error('[Reports]', err); }
    finally { setLoading(false); }
  }, [selectedBranch, month]);

  useEffect(() => { load(); }, [load]);

  if (!selectedBranch) return (
    <div className="reports-page">
      <div className="empty-state"><div className="empty-icon">🏢</div><div className="empty-title">No Branch Selected</div></div>
    </div>
  );

  return (
    <div className="reports-page">
      <div className="page-header">
        <div className="header-left"><h2>Reports & Analytics</h2><span className="branch-tag">{selectedBranch.name}</span></div>
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
          <h3 className="section-title">P&L Summary — {formatMonth(month)}</h3>

          <div className="stats-row">
            <div className="stat-card green">
              <div className="stat-value">{CURRENCY(report.rentCollected)}</div>
              <div className="stat-label">Rent Collected</div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-value">{CURRENCY(report.rentPending)}</div>
              <div className="stat-label">Rent Pending</div>
            </div>
            <div className="stat-card red">
              <div className="stat-value">{CURRENCY(report.totalExpenditure)}</div>
              <div className="stat-label">Total Expenses</div>
            </div>
            <div className={`stat-card ${report.netPL >= 0 ? 'green' : 'red'}`}>
              <div className="stat-value">{CURRENCY(report.netPL)}</div>
              <div className="stat-label">Net {report.netPL >= 0 ? 'Profit' : 'Loss'}</div>
            </div>
          </div>

          <div className="breakdown-card">
            <h4>Income & Expenditure Breakdown</h4>
            <table className="breakdown-table">
              <tbody>
                <tr className="section-hdr"><td colSpan={2}>💰 Income</td></tr>
                <tr>
                  <td>Rent Collected</td>
                  <td className="amount col-green">{CURRENCY(report.rentCollected)}</td>
                </tr>
                <tr>
                  <td className="text-muted">Rent Due (billed)</td>
                  <td className="amount text-muted">{CURRENCY(report.rentDue)}</td>
                </tr>
                <tr className="sub-total">
                  <td><strong>Total Income</strong></td>
                  <td className="amount col-green"><strong>{CURRENCY(report.totalIncome)}</strong></td>
                </tr>

                <tr className="section-hdr"><td colSpan={2}>💸 Expenditure</td></tr>
                <tr>
                  <td>Operational Expenses</td>
                  <td className="amount col-red">{CURRENCY(report.expenses)}</td>
                </tr>
                <tr>
                  <td>Food & Kitchen</td>
                  <td className="amount col-red">{CURRENCY(report.foodCost)}</td>
                </tr>
                <tr className="sub-total">
                  <td><strong>Total Expenditure</strong></td>
                  <td className="amount col-red"><strong>{CURRENCY(report.totalExpenditure)}</strong></td>
                </tr>

                <tr className="pl-row">
                  <td><strong>Net Profit / Loss</strong></td>
                  <td className={`amount ${report.netPL >= 0 ? 'col-green' : 'col-red'}`}>
                    <strong>{CURRENCY(report.netPL)}</strong>
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Profit Margin</td>
                  <td className={`amount ${report.margin >= 0 ? 'col-green' : 'col-red'}`}>{report.margin}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
