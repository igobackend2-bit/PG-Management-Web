import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../shared/hooks/useToast';
import { fetchCeoStats, fetchMonthlyTrend, type CeoStats, type MonthTrend } from '../services/ceo.service';
import './CeoDashboardPage.scss';

const CURRENCY = (n: number) => '₹' + n.toLocaleString('en-IN');

function getLastNMonths(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(d.toISOString().slice(0, 7));
  }
  return result;
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[Number(mo) - 1]} ${y}`;
}

// ─── CeoDashboardPage ─────────────────────────────────────────────────────────
export function CeoDashboardPage() {
  const toast = useToast();

  const todayMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(todayMonth);
  const [stats, setStats] = useState<CeoStats | null>(null);
  const [trend, setTrend]  = useState<MonthTrend[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const months = getLastNMonths(6);
      const [s, t] = await Promise.all([
        fetchCeoStats(month),
        fetchMonthlyTrend(months),
      ]);
      setStats(s);
      setTrend(t);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load CEO data.');
    } finally { setLoading(false); }
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build bar chart scale
  const trendMax = trend.length > 0
    ? Math.max(...trend.map(t => Math.max(t.revenue, t.expenses)), 1)
    : 1;

  return (
    <div className="ceo-page">
      <div className="page-header">
        <div className="header-left">
          <h2>CEO Dashboard</h2>
          <span className="header-sub">All Branches — Total Analytics</span>
        </div>
        <div className="header-right">
          <input
            type="month"
            value={month}
            max={todayMonth}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button className="btn-add" onClick={loadData} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="loading-wrap"><span className="loader" /></div>
      ) : !stats ? null : (
        <>
          {/* ── Top KPI Row ───────────────────────────────────────────────── */}
          <div className="ceo-kpi-row">
            <div className="kpi-card green">
              <div className="kpi-icon">₹</div>
              <div className="kpi-body">
                <div className="kpi-value">{CURRENCY(stats.totalRevenue)}</div>
                <div className="kpi-label">Total Revenue</div>
                <div className="kpi-sub">{monthLabel(month)}</div>
              </div>
            </div>
            <div className="kpi-card red">
              <div className="kpi-icon">📉</div>
              <div className="kpi-body">
                <div className="kpi-value">{CURRENCY(stats.totalExpenses)}</div>
                <div className="kpi-label">Total Expenses</div>
                <div className="kpi-sub">{monthLabel(month)}</div>
              </div>
            </div>
            <div className="kpi-card blue">
              <div className="kpi-icon">💰</div>
              <div className="kpi-body">
                <div className={`kpi-value ${stats.totalNetProfit >= 0 ? 'profit' : 'loss'}`}>
                  {stats.totalNetProfit >= 0 ? '+' : ''}{CURRENCY(stats.totalNetProfit)}
                </div>
                <div className="kpi-label">Net Profit / Loss</div>
                <div className="kpi-sub">{monthLabel(month)}</div>
              </div>
            </div>
            <div className="kpi-card purple">
              <div className="kpi-icon">👤</div>
              <div className="kpi-body">
                <div className="kpi-value">{stats.totalTenants}</div>
                <div className="kpi-label">Total Tenants</div>
                <div className="kpi-sub">Currently Active</div>
              </div>
            </div>
            <div className="kpi-card yellow">
              <div className="kpi-icon">🛏</div>
              <div className="kpi-body">
                <div className="kpi-value">{stats.avgOccupancyPct}%</div>
                <div className="kpi-label">Avg Occupancy</div>
                <div className="kpi-sub">{stats.totalOccupied}/{stats.totalBeds} beds</div>
              </div>
            </div>
            <div className="kpi-card orange">
              <div className="kpi-icon">🎫</div>
              <div className="kpi-body">
                <div className="kpi-value">{stats.openTickets}</div>
                <div className="kpi-label">Open Tickets</div>
                <div className="kpi-sub">Across all branches</div>
              </div>
            </div>
          </div>

          {/* ── Monthly Trend Chart ───────────────────────────────────────── */}
          {trend.length > 0 && (
            <div className="ceo-section">
              <h3 className="section-title">📈 Revenue vs Expenses (Last 6 Months)</h3>
              <div className="trend-chart">
                {trend.map((t) => (
                  <div key={t.month} className="trend-col">
                    <div className="trend-bars">
                      <div
                        className="trend-bar revenue"
                        style={{ height: `${Math.round((t.revenue / trendMax) * 140)}px` }}
                        title={`Revenue: ${CURRENCY(t.revenue)}`}
                      />
                      <div
                        className="trend-bar expense"
                        style={{ height: `${Math.round((t.expenses / trendMax) * 140)}px` }}
                        title={`Expenses: ${CURRENCY(t.expenses)}`}
                      />
                    </div>
                    <div className="trend-label">{monthLabel(t.month).split(' ')[0]}</div>
                    <div className="trend-value">{CURRENCY(t.revenue)}</div>
                  </div>
                ))}
                <div className="trend-legend">
                  <span className="legend-dot revenue" /> Revenue
                  <span className="legend-dot expense" /> Expenses
                </div>
              </div>
            </div>
          )}

          {/* ── Branch Breakdown Table ────────────────────────────────────── */}
          <div className="ceo-section">
            <h3 className="section-title">🏢 Branch-wise Breakdown — {monthLabel(month)}</h3>
            {stats.branches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <div className="empty-title">No Branches Found</div>
                <p>Create branches first to see analytics here.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Tenants</th>
                      <th>Occupancy</th>
                      <th>Rent Collected</th>
                      <th>Rent Due</th>
                      <th>Expenses</th>
                      <th>Net Revenue</th>
                      <th>Open Tickets</th>
                      <th>Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.branches.map((b) => (
                      <tr key={b.branchId}>
                        <td className="bold">{b.branchName}</td>
                        <td>{b.totalTenants}</td>
                        <td>
                          <div className="occ-cell">
                            <div className="occ-bar-wrap">
                              <div className="occ-bar" style={{ width: `${b.occupancyPct}%` }} />
                            </div>
                            <span className={b.occupancyPct >= 80 ? 'col-green' : b.occupancyPct >= 50 ? 'col-yellow' : 'col-red'}>
                              {b.occupancyPct}%
                            </span>
                          </div>
                        </td>
                        <td className="col-green bold">{CURRENCY(b.rentCollected)}</td>
                        <td className="muted">{CURRENCY(b.rentDue)}</td>
                        <td className="col-red">{CURRENCY(b.totalExpenses)}</td>
                        <td className={`bold ${b.netRevenue >= 0 ? 'col-green' : 'col-red'}`}>
                          {b.netRevenue >= 0 ? '+' : ''}{CURRENCY(b.netRevenue)}
                        </td>
                        <td>
                          {b.openTickets > 0
                            ? <span className="badge red">{b.openTickets}</span>
                            : <span className="badge green">0</span>}
                        </td>
                        <td className="muted">{b.staffCount}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td><strong>TOTAL</strong></td>
                      <td><strong>{stats.totalTenants}</strong></td>
                      <td><strong>{stats.avgOccupancyPct}%</strong></td>
                      <td className="col-green bold">{CURRENCY(stats.totalRevenue)}</td>
                      <td>—</td>
                      <td className="col-red bold">{CURRENCY(stats.totalExpenses)}</td>
                      <td className={`bold ${stats.totalNetProfit >= 0 ? 'col-green' : 'col-red'}`}>
                        {stats.totalNetProfit >= 0 ? '+' : ''}{CURRENCY(stats.totalNetProfit)}
                      </td>
                      <td><strong>{stats.openTickets}</strong></td>
                      <td>—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── Branch Cards ──────────────────────────────────────────────── */}
          <div className="ceo-section">
            <h3 className="section-title">🏆 Branch Performance Cards</h3>
            <div className="branch-cards">
              {stats.branches.map((b) => (
                <div key={b.branchId} className="branch-perf-card">
                  <div className="bpc-header">
                    <span className="bpc-name">{b.branchName}</span>
                    <span className={`bpc-profit ${b.netRevenue >= 0 ? 'positive' : 'negative'}`}>
                      {b.netRevenue >= 0 ? '▲' : '▼'} {CURRENCY(Math.abs(b.netRevenue))}
                    </span>
                  </div>
                  <div className="bpc-stats">
                    <div className="bpc-stat">
                      <span className="bpc-stat-val">{b.occupancyPct}%</span>
                      <span className="bpc-stat-lbl">Occupancy</span>
                    </div>
                    <div className="bpc-stat">
                      <span className="bpc-stat-val">{CURRENCY(b.rentCollected)}</span>
                      <span className="bpc-stat-lbl">Collected</span>
                    </div>
                    <div className="bpc-stat">
                      <span className="bpc-stat-val">{CURRENCY(b.totalExpenses)}</span>
                      <span className="bpc-stat-lbl">Expenses</span>
                    </div>
                  </div>
                  <div className="bpc-occ-bar">
                    <div className="bpc-occ-fill" style={{ width: `${b.occupancyPct}%` }} />
                  </div>
                  <div className="bpc-footer">
                    <span>{b.totalTenants} tenants</span>
                    <span>{b.openTickets > 0 ? `⚠️ ${b.openTickets} tickets` : '✅ No open tickets'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
