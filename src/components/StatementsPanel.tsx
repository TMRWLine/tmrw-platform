import { useMemo, useState } from 'react';
import { FileText, Download, Receipt, Calendar } from 'lucide-react';
import { formatCurrency } from '../api';
import type { CollabSplitTelemetry } from '../types';

/** Sponsorship deals settle 70/15/15 (athlete / club / platform) of the Ex-GST amount. */
const SPONSORSHIP_SPLIT = { athletePct: 70, sharePct: 15, shareLabel: 'Club Share', platformPct: 15 };

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

interface StatementRow {
  month: string;
  grossExGst: number;
  gst: number;
  totalIncGst: number;
  clubShare: number;
  platformShare: number;
  netPayout: number;
}

export function StatementsPanel({
  grossExGst,
  currency,
  athleteName,
  startDate,
  endDate,
  collabSplit,
}: {
  grossExGst: number;
  currency: string;
  athleteName: string;
  startDate: string | null;
  endDate: string | null;
  /** Merchandise earnings settle on the Collab Drops split instead of the sponsorship split. */
  collabSplit?: CollabSplitTelemetry;
}) {
  const split = collabSplit
    ? {
        athletePct: collabSplit.athletePayoutPct,
        sharePct: collabSplit.communityFundPct,
        shareLabel: 'Community Fund',
        platformPct: collabSplit.platformFeePct,
      }
    : SPONSORSHIP_SPLIT;
  const shareRowLabel = `${split.shareLabel} (${split.sharePct}%)`;
  const platformRowLabel = `Platform Share (${split.platformPct}%)`;
  const netRowLabel = `Net Athlete Payout (${split.athletePct}%)`;

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const statements = useMemo<StatementRow[]>(() => {
    const gst = Math.round(grossExGst * 0.1);
    const totalIncGst = grossExGst + gst;
    const grossCents = Math.round(grossExGst * 100);
    const athleteCents = Math.round((grossCents * split.athletePct) / 100);
    const shareCents = Math.round((grossCents * split.sharePct) / 100);
    const clubShare = shareCents / 100;
    const platformShare = (grossCents - athleteCents - shareCents) / 100;
    const netPayout = athleteCents / 100;

    const months: StatementRow[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
        grossExGst: i === 0 ? grossExGst : 0,
        gst: i === 0 ? gst : 0,
        totalIncGst: i === 0 ? totalIncGst : 0,
        clubShare: i === 0 ? clubShare : 0,
        platformShare: i === 0 ? platformShare : 0,
        netPayout: i === 0 ? netPayout : 0,
      });
    }
    return months;
  }, [grossExGst, split.athletePct, split.sharePct]);

  const selected = statements.find((s) => s.month === selectedMonth) ?? statements[0];

  function downloadCSV() {
    if (!selected) return;
    const headers = ['Field', 'Amount'];
    const rows = [
      ['Month', selected.month],
      ['Gross Earnings (Ex. GST)', String(selected.grossExGst)],
      ['GST (10%)', String(selected.gst)],
      ['Total (Inc. GST)', String(selected.totalIncGst)],
      [shareRowLabel, String(selected.clubShare)],
      [platformRowLabel, String(selected.platformShare)],
      [netRowLabel, String(selected.netPayout)],
    ];
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RCTI_${selectedMonth?.replace(/\s/g, '_') ?? 'statement'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    if (!selected) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const safeName = escapeHtml(athleteName);
    const safeMonth = escapeHtml(selected.month);
    const safeTerm = `${escapeHtml(startDate ?? '—')} to ${escapeHtml(endDate ?? '—')}`;
    const html = `<!DOCTYPE html><html><head><title>RCTI - ${safeMonth}</title>
<style>
body{font-family:Inter,sans-serif;padding:40px;color:#000;max-width:600px;margin:auto;background:#FBFBF9}
h1{font-size:20px;font-weight:800} table{width:100%;border-collapse:collapse;margin-top:20px}
td,th{padding:10px;border-bottom:1px solid #D0D0CE;text-align:left}
th{background:#F5F5F3;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:0.06em} .total{font-weight:800}
</style></head><body>
<h1>Recipient Created Tax Invoice</h1>
<p><strong>Athlete:</strong> ${safeName}<br>
<strong>Period:</strong> ${safeMonth}<br>
<strong>Agreement Term:</strong> ${safeTerm}</p>
<table>
<tr><th>Field</th><th>Amount (${escapeHtml(currency)})</th></tr>
<tr><td>Gross Earnings (Ex. GST)</td><td>A$${Math.round(selected.grossExGst)}</td></tr>
<tr><td>GST (10%)</td><td>A$${Math.round(selected.gst)}</td></tr>
<tr class="total"><td>Total (Inc. GST)</td><td>A$${Math.round(selected.totalIncGst)}</td></tr>
<tr><td>${shareRowLabel}</td><td>−A$${Math.round(selected.clubShare)}</td></tr>
<tr><td>${platformRowLabel}</td><td>−A$${Math.round(selected.platformShare)}</td></tr>
<tr class="total"><td>${netRowLabel}</td><td>A$${Math.round(selected.netPayout)}</td></tr>
</table>
<p style="margin-top:30px;font-size:12px;color:#64748b">
This RCTI is issued by tmrw/. on behalf of the athlete under ATO reciprocal agreement.
GST is reported by the recipient. Generated ${new Date().toLocaleString()}.</p>
</body></html>`;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  return (
    <div className="ledger-section">
      <div className="ledger-head">
        <Receipt size={16} />
        <h3>Statements &amp; Invoices (RCTI)</h3>
      </div>
      <p className="ledger-desc">
        Monthly Recipient Created Tax Invoices showing gross earnings, GST, the {split.shareLabel.toLowerCase()} and platform
        shares, and the net athlete payout. Download as PDF or CSV for accounting.
      </p>

      <div className="stmt-month-list">
        <Calendar size={14} style={{ opacity: 0.5, marginRight: 4 }} />
        {statements.map((s) => (
          <button
            key={s.month}
            className={`stmt-month-chip ${(selected?.month ?? '') === s.month ? 'active' : ''}`}
            onClick={() => setSelectedMonth(s.month)}
          >
            {s.month}
          </button>
        ))}
      </div>

      {selected && (
        <div className="stmt-detail">
          <div className="stmt-detail-head">
            <FileText size={16} />
            <span>RCTI — {selected.month}</span>
          </div>
          <div className="ledger-breakdown">
            <div className="ledger-row">
              <div className="ledger-row-label">Gross Earnings (Ex. GST)</div>
              <div className="ledger-row-value gross">{formatCurrency(selected.grossExGst, currency)}</div>
            </div>
            <div className="ledger-row">
              <div className="ledger-row-label">GST (10%)</div>
              <div className="ledger-row-value">{formatCurrency(selected.gst, currency)}</div>
            </div>
            <div className="ledger-divider" />
            <div className="ledger-row">
              <div className="ledger-row-label">Total (Inc. GST)</div>
              <div className="ledger-row-value gross">{formatCurrency(selected.totalIncGst, currency)}</div>
            </div>
            <div className="ledger-row">
              <div className="ledger-row-label">{shareRowLabel}</div>
              <div className="ledger-row-value">−{formatCurrency(selected.clubShare, currency)}</div>
            </div>
            <div className="ledger-row">
              <div className="ledger-row-label">{platformRowLabel}</div>
              <div className="ledger-row-value commission">−{formatCurrency(selected.platformShare, currency)}</div>
            </div>
            <div className="ledger-divider" />
            <div className="ledger-row">
              <div className="ledger-row-label">{netRowLabel}</div>
              <div className="ledger-row-value net">{formatCurrency(selected.netPayout, currency)}</div>
            </div>
          </div>
          <div className="stmt-actions">
            <button className="btn btn-sm" onClick={downloadPDF}>
              <Download size={13} /> Download PDF
            </button>
            <button className="btn btn-sm" onClick={downloadCSV}>
              <Download size={13} /> Download CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
