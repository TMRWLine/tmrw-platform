import { useMemo, useState } from 'react';
import { FileText, Download, Receipt, Calendar } from 'lucide-react';
import { formatCurrency } from '../api';
import { sponsorshipLedger, type RctiLine } from '../lib/commercialLedger.js';

interface StatementRow {
  month: string;
  grossExGst: number;
  gst: number;
  totalIncGst: number;
  commission: number;
  netPayout: number;
  clubPayout: number;
  rctiLines: RctiLine[];
}

export function StatementsPanel({
  grossExGst,
  currency,
  athleteName,
  startDate,
  endDate,
  athleteAbn,
  athleteGstRegistered = false,
  payees = {},
}: {
  grossExGst: number;
  currency: string;
  athleteName: string;
  startDate: string | null;
  endDate: string | null;
  athleteAbn?: string;
  athleteGstRegistered?: boolean;
  payees?: Parameters<typeof sponsorshipLedger>[1];
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const statements = useMemo<StatementRow[]>(() => {
    const ledger = sponsorshipLedger(Math.round(grossExGst * 100), { ...payees, athlete: payees.athlete ?? { abn: athleteAbn, gstRegistered: athleteGstRegistered } });
    const gst = ledger.gstCents / 100;
    const totalIncGst = ledger.totalPayableCents / 100;
    const commission = ledger.ops15Cents / 100;
    const netPayout = ledger.rctiLines[0].grossCents / 100;
    const clubPayout = ledger.club15Cents / 100;

    const months: StatementRow[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
        grossExGst: i === 0 ? grossExGst : 0,
        gst: i === 0 ? gst : 0,
        totalIncGst: i === 0 ? totalIncGst : 0,
        commission: i === 0 ? commission : 0,
        netPayout: i === 0 ? netPayout : 0,
        clubPayout: i === 0 ? clubPayout : 0,
        rctiLines: i === 0 ? ledger.rctiLines : sponsorshipLedger(0).rctiLines,
      });
    }
    return months;
  }, [grossExGst, athleteAbn, athleteGstRegistered, payees]);

  const selected = statements.find((s) => s.month === selectedMonth) ?? statements[0];

  function downloadCSV() {
    if (!selected) return;
    const headers = ['Field', 'Amount'];
    const rows = [
      ['Month', selected.month],
      ['Gross Earnings (Ex. GST)', String(selected.grossExGst)],
      ['GST (10%)', String(selected.gst)],
      ['Total (Inc. GST)', String(selected.totalIncGst)],
      ['Platform Operations (15%)', String(selected.commission)],
      ['Grassroots Club (15%)', String(selected.clubPayout)],
      ['Athlete ABN', athleteAbn || 'Not supplied'],
      ['GST Registered', String(athleteGstRegistered)],
      ['Net Athlete Payout', String(selected.netPayout)],
      ...selected.rctiLines.flatMap((line) => [
        [`${line.role} gross`, (line.grossCents / 100).toFixed(2)],
        [`${line.role} GST`, (line.gstCents / 100).toFixed(2)],
        [`${line.role} net`, (line.netCents / 100).toFixed(2)],
        [`${line.role} ABN / GST registered`, `${line.abn || 'Not supplied'} / ${line.gstRegistered}`],
      ]),
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
    const html = `<!DOCTYPE html><html><head><title>RCTI - ${selected.month}</title>
<style>
body{font-family:Inter,sans-serif;padding:40px;color:#080808;max-width:600px;margin:auto;background:#F7F7F6}
h1{font-size:20px;font-weight:800} table{width:100%;border-collapse:collapse;margin-top:20px}
td,th{padding:10px;border-bottom:1px solid #F7F7F6;text-align:left}
th{background:#F7F7F6;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:0.06em} .total{font-weight:800}
</style></head><body>
<h1>Recipient Created Tax Invoice</h1>
<p><strong>Athlete:</strong> ${athleteName}<br>
<strong>Period:</strong> ${selected.month}<br>
<strong>Agreement Term:</strong> ${startDate ?? '·'} to ${endDate ?? '·'}</p>
<table>
<tr><th>Field</th><th>Amount (${currency})</th></tr>
<tr><td>Gross Earnings (Ex. GST)</td><td>A$${selected.grossExGst.toFixed(2)}</td></tr>
<tr><td>GST (10%)</td><td>A$${selected.gst.toFixed(2)}</td></tr>
<tr class="total"><td>Total (Inc. GST)</td><td>A$${selected.totalIncGst.toFixed(2)}</td></tr>
<tr><td>Platform Operations (15%)</td><td>A$${selected.commission.toFixed(2)}</td></tr>
<tr><td>Grassroots Club (15%)</td><td>A$${selected.clubPayout.toFixed(2)}</td></tr>
<tr><td>Athlete ABN / GST registered</td><td>${athleteAbn || 'Not supplied'} / ${athleteGstRegistered ? 'Yes' : 'No'}</td></tr>
<tr class="total"><td>Net Athlete Payout</td><td>A$${selected.netPayout.toFixed(2)}</td></tr>
${selected.rctiLines.map((line) => `<tr><td>${line.role} · gross / GST / net</td><td>${(line.grossCents / 100).toFixed(2)} / ${(line.gstCents / 100).toFixed(2)} / ${(line.netCents / 100).toFixed(2)}</td></tr>`).join('')}
</table>
<p style="margin-top:30px;font-size:12px;color:#080808">
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
        Monthly Recipient Created Tax Invoices showing gross earnings, GST, platform commission,
        and net payout. Download as PDF or CSV for accounting.
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
            <span>RCTI · {selected.month}</span>
          </div>
          <div className="ledger-breakdown">
            <div className="ledger-row">
              <div className="ledger-row-label">Gross Earnings (Ex. GST)</div>
              <div className="ledger-row-value gross">{formatCurrency(selected.grossExGst, currency, 2)}</div>
            </div>
            <div className="ledger-row">
              <div className="ledger-row-label">GST (10%)</div>
              <div className="ledger-row-value">{formatCurrency(selected.gst, currency, 2)}</div>
            </div>
            <div className="ledger-divider" />
            <div className="ledger-row">
              <div className="ledger-row-label">Total (Inc. GST)</div>
              <div className="ledger-row-value gross">{formatCurrency(selected.totalIncGst, currency, 2)}</div>
            </div>
            <div className="ledger-row">
              <div className="ledger-row-label">Platform Operations (15%)</div>
              <div className="ledger-row-value commission">−{formatCurrency(selected.commission, currency, 2)}</div>
            </div>
            <div className="ledger-row">
              <div className="ledger-row-label">Grassroots Club (15%)</div>
              <div className="ledger-row-value">{formatCurrency(selected.clubPayout, currency, 2)}</div>
            </div>
            <div className="ledger-divider" />
            <div className="ledger-row">
              <div className="ledger-row-label">Net Athlete Payout</div>
              <div className="ledger-row-value net">{formatCurrency(selected.netPayout, currency, 2)}</div>
            </div>
          </div>
          <div className="ledger-breakdown">
            {selected.rctiLines.map((line) => (
              <div className="ledger-row" key={line.role}>
                <div className="ledger-row-label">
                  {line.role} · ABN {line.abn || 'not supplied'} · GST registered: {line.gstRegistered ? 'yes' : 'no'}
                </div>
                <div className="ledger-row-value">
                  Gross {formatCurrency(line.grossCents / 100, currency, 2)} · GST {formatCurrency(line.gstCents / 100, currency, 2)} · Net {formatCurrency(line.netCents / 100, currency, 2)}
                </div>
              </div>
            ))}
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
