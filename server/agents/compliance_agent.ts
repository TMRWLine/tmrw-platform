import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[AGENT FATAL] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function evaluateNewDeal(dealId: string) {
  const { data: deal, error: dealErr } = await supabase
    .from('sponsor_deals')
    .select('*, athlete_profiles(*)')
    .eq('id', dealId)
    .single();

  if (dealErr || !deal) {
    console.error(`[AGENT ERROR] Failed to load deal ${dealId}:`, dealErr?.message);
    return;
  }

  const athlete = deal.athlete_profiles;
  let riskScore = 0.05;
  let valuationDelta = 0.0;
  let verdict: 'APPROVE' | 'FLAG_FOR_LEGAL' | 'REJECT' = 'APPROVE';
  let auditReason = 'Statutory compliance checks passed automatically.';

  if (athlete?.is_minor && !athlete?.guardian_consent_recorded) {
    riskScore = 0.95;
    verdict = 'FLAG_FOR_LEGAL';
    auditReason = 'Minor athlete lacks countersigned parental guardian consent.';
  }

  if (deal.tier_code === 'tier2') {
    valuationDelta = 4.5;
  } else if (deal.tier_code === 'tier3') {
    valuationDelta = 12.0;
  }

  if (valuationDelta > 0 && athlete?.id) {
    const baseValuation = Number(athlete.market_valuation || 15000);
    const updatedValuation = Math.round(baseValuation * (1 + valuationDelta / 100));
    
    await supabase
      .from('athlete_profiles')
      .update({ market_valuation: updatedValuation })
      .eq('id', athlete.id);
  }

  await supabase.from('compliance_audit_logs').insert({
    athlete_id: athlete?.id,
    event_type: 'AGENTIC_DEAL_AUDIT_EXECUTED',
    metadata: {
      deal_id: deal.id,
      evaluated_by: 'tmrw-autonomous-compliance-agent-v1',
      risk_score: riskScore,
      valuation_delta_pct: valuationDelta,
      verdict,
      reason: auditReason,
      timestamp: new Date().toISOString()
    }
  });

  console.log(`[AGENT AUDIT COMPLETE] Deal: ${deal.id} | Verdict: ${verdict} | Valuation Delta: +${valuationDelta}%`);
}

async function startAgentDaemon() {
  console.log('// TMRW AGENTIC COMPLIANCE DAEMON ONLINE');
  console.log('// Listening for escrow allocations...');

  setInterval(async () => {
    const { data: pendingDeals } = await supabase
      .from('sponsor_deals')
      .select('id')
      .eq('status', 'escrowed')
      .limit(5);

    if (pendingDeals && pendingDeals.length > 0) {
      for (const d of pendingDeals) {
        await evaluateNewDeal(d.id);
      }
    }
  }, 10000);
}

startAgentDaemon();
