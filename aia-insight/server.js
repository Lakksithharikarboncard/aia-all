const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const OpenAI = require('openai');

const DIR = __dirname;
const PORT = process.env.PORT || 4934;

const CROF_API_KEY = process.env.CROF_API_KEY || '';
const MODEL = process.env.MODEL || 'kimi-k2.5-lightning';
const CROF_BASE_URL = process.env.CROF_BASE_URL || 'https://crof.ai/v1';

const client = new OpenAI({
  apiKey: CROF_API_KEY,
  baseURL: CROF_BASE_URL,
});

// --- Rate limit configuration (Gemini 3.1 Flash Lite) ---
const MAX_RPM = 15;        // Requests per minute
const MAX_RPD = 500;       // Requests per day
const MAX_TPM = 250000;    // Tokens per minute (rough guide)
const RPM_WINDOW_MS = 60 * 1000;
const RPD_WINDOW_MS = 24 * 60 * 60 * 1000;

// --- Rate limit state ---
let geminiQueue = [];          // pending requests queue (single-concurrency)
let geminiProcessing = false;  // lock flag
let rpmTimestamps = [];        // sliding window of request timestamps
let rpdCount = 0;              // daily request counter
let rpdWindowStart = Date.now();
let tokenUsageMinute = 0;      // tokens used in current minute window
let tokenMinuteStart = Date.now();

// --- Insight cache ---
let cachedInsights = [];
let insightsGeneratedAt = null;
let lastPayloadHash = null;    // dedup: avoid re-analyzing same data
let lastPayloadRaw = null;     // for GR-8 data quality checks
let payloadReceivedAt = null;  // for GR-8 staleness tracking
let insightExpiryHours = 24;   // GR-10: max age for insights

// System prompt (v2 - updated per PRD 2.0)
const SYSTEM_PROMPT = `You are a financial analyst for an Indian SME. Read the monthly data below and identify the 3 to 5 most important signals. Write each one as a clear, plain English insight card.

INPUT:
You get monthly records with these fields:
- inflow, outflow, net (cash movement)
- ar (money customers owe you)
- ap (bills you need to pay)
- opex (operating costs)
- txn_count, unclassified, classification_pct
Each record includes month-over-month changes (delta_abs and delta_pct).

Also provided: pre-detected anomalies (unusual spikes), patterns (trends over 3+ months), and summary stats. Use all of this to decide what matters most.

INSIGHT TYPES (pick the best fit for each insight):
- "Anomaly": A spike or drop that stands out
- "Cash Flow Risk": Something that affects your cash position or runway
- "Efficiency": Operating costs or transaction-level productivity
- "Growth Opportunity": A positive trend or untapped potential
- "Operational Velocity": How fast money moves in and out

RULES:
1. Output ONLY a valid JSON array. No markdown, no extra text.
2. No accounting jargon. Do not use DSO, DPO, AR, AP. Use "days to pay", "money owed to you", "bills to pay".
3. Every insight must cite exact numbers from the data. No generic statements.
4. Do not invent numbers. Every value you cite must exist in the input.
5. Use soft language only: "may indicate", "suggests", "worth reviewing", "could signal". Never say "caused by", "will lead to", "resulting in", "therefore", "because of".
6. Severity must be one of: "critical", "watch", "positive".
7. suggestedReview must start with: Review / Verify / Compare / Assess / Monitor / Discuss.
8. All monetary values in Indian Rupees (₹). Use Indian format (₹50 Lakhs).
9. claimedMetrics must list every metric value you cite. Keys must match the field names in periods[].

OUTPUT:
Return a JSON array of 3 to 5 insight objects:

[
  {
    "insightType": "Anomaly|Cash Flow Risk|Efficiency|Growth Opportunity|Operational Velocity",
    "severity": "critical|watch|positive",
    "source": "Overview|Receivables|Payables",
    "title": "Short headline specific to the business (max 80 chars)",
    "summary": "One line with at least one number (max 140 chars)",
    "whatWeFound": "Exact metric, comparison, and period",
    "whyItMatters": "Business impact in plain language, one sentence",
    "suggestedReview": "Start with Review/Verify/Compare/Assess/Monitor/Discuss",
    "basedOn": "Metric names and values | Period label",
    "claimedMetrics": {
      "metric_key": value
    }
  }
]`;

// --- Payload Transformation & Enrichment (GR-11, Tier 1/2 Detection) ---

function parseNum(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
  return 0;
}

function transformPayload(rawPayload) {
  // 1. Normalise: parse string numbers, filter future zero-padded months
  const allPeriods = rawPayload.map(r => ({
    month: r.month_label,
    display: r.month_display,
    inflow: parseNum(r.bank_inflow),
    outflow: parseNum(r.bank_outflow),
    net: parseNum(r.bank_net_flow),
    cumulative_net: parseNum(r.cumulative_net_flow),
    ar: parseNum(r.ar_receipts),
    ap: parseNum(r.ap_payments),
    opex: parseNum(r.decomp_operating_expenses),
    txn_count: parseNum(r.txn_count),
    unclassified: parseNum(r.unclassified_count),
    classification_pct: parseNum(r.category_classification_pct),
  }));

  // Remove zero-padded future months (all flow fields = 0 and txn_count = 0)
  const periods = allPeriods.filter(p => p.inflow > 0 || p.outflow > 0 || p.txn_count > 0);

  const METRICS = ['inflow', 'outflow', 'net', 'ar', 'ap', 'opex'];

  // 2. Compute month-over-month deltas
  const periodsWithDeltas = periods.map((p, i) => {
    const deltas = {};
    if (i > 0) {
      METRICS.forEach(m => {
        const prev = periods[i - 1][m];
        const curr = p[m];
        const abs_delta = curr - prev;
        const pct_delta = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : null;
        deltas[`${m}_delta_abs`] = Math.round(abs_delta);
        deltas[`${m}_delta_pct`] = pct_delta !== null ? Math.round(pct_delta * 10) / 10 : null;
      });
    }
    return { ...p, ...deltas };
  });

  // 3. Detect Tier 1 Anomalies (current month > trailing-3-month avg ± 20%)
  const anomalies = [];
  periodsWithDeltas.forEach((p, i) => {
    if (i < 2) return; // need at least 3 prior months for trailing avg
    METRICS.forEach(m => {
      const window = periodsWithDeltas.slice(Math.max(0, i - 3), i);
      const avg = window.reduce((s, w) => s + w[m], 0) / window.length;
      if (avg === 0) return;
      const deviation = ((p[m] - avg) / Math.abs(avg)) * 100;
      if (Math.abs(deviation) >= 20 && Math.abs(p[m] - avg) > 50000) {
        anomalies.push({
          type: 'anomaly',
          metric: m,
          month: p.display,
          value: p[m],
          trailing_avg: Math.round(avg),
          deviation_pct: Math.round(deviation * 10) / 10,
          direction: deviation > 0 ? 'spike' : 'drop',
        });
      }
    });
  });

  // 4. Detect Tier 2 Patterns (3+ consecutive months same direction)
  const patterns = [];
  METRICS.forEach(m => {
    let streak = 1;
    let direction = null;
    for (let i = 1; i < periodsWithDeltas.length; i++) {
      const delta = periodsWithDeltas[i][`${m}_delta_abs`];
      if (delta == null) continue;
      const dir = delta > 0 ? 'increasing' : delta < 0 ? 'decreasing' : 'flat';
      if (dir === direction) {
        streak++;
        if (streak >= 3) {
          const existing = patterns.find(p => p.metric === m && p.direction === direction);
          if (existing) {
            existing.streak = streak;
            existing.to_month = periodsWithDeltas[i].display;
            existing.to_value = periodsWithDeltas[i][m];
          } else {
            patterns.push({
              type: 'pattern',
              metric: m,
              direction,
              streak,
              from_month: periodsWithDeltas[i - streak + 1].display,
              from_value: periodsWithDeltas[i - streak + 1][m],
              to_month: periodsWithDeltas[i].display,
              to_value: periodsWithDeltas[i][m],
            });
          }
        }
      } else {
        streak = 1;
        direction = dir;
      }
    }
  });

  // 5. Summary stats
  const summary = {
    total_periods: periods.length,
    date_range: periods.length > 0 ? `${periods[0].display} – ${periods[periods.length - 1].display}` : '',
    avg_monthly_inflow: Math.round(periods.reduce((s, p) => s + p.inflow, 0) / periods.length),
    avg_monthly_outflow: Math.round(periods.reduce((s, p) => s + p.outflow, 0) / periods.length),
    total_net_flow: Math.round(periods.reduce((s, p) => s + p.net, 0)),
    anomaly_count: anomalies.length,
    pattern_count: patterns.length,
  };

  return { periods: periodsWithDeltas, anomalies, patterns, summary };
}

// --- Validation Functions (GR-3, GR-5, GR-7, GR-13) ---

const HARD_CAUSALITY_PHRASES = [
  'caused by', 'will lead to', 'resulting in', 'therefore',
  'because of', 'due to this', 'this means that'
];
const ALLOWED_SEVERITIES = new Set(['critical', 'watch', 'positive']);
const ALLOWED_INSIGHT_TYPES = new Set(['anomaly', 'cash flow risk', 'efficiency', 'growth opportunity', 'operational velocity']);
const ALLOWED_CTA_VERBS = ['review', 'verify', 'compare', 'assess', 'monitor', 'discuss'];
const REQUIRED_FIELDS = ['insightType', 'severity', 'source', 'title', 'summary', 'whatWeFound', 'whyItMatters', 'suggestedReview', 'basedOn', 'claimedMetrics'];

function validateSchema(insight) {
  for (const field of REQUIRED_FIELDS) {
    if (!insight[field] || (typeof insight[field] === 'string' && insight[field].trim() === '')) {
      return { valid: false, reason: `Missing required field: ${field}` };
    }
  }
  if (typeof insight.claimedMetrics !== 'object' || Array.isArray(insight.claimedMetrics)) {
    return { valid: false, reason: 'claimedMetrics must be an object' };
  }
  return { valid: true };
}

function validateSeverity(insight) {
  if (!ALLOWED_SEVERITIES.has(insight.severity?.toLowerCase())) {
    return { valid: false, reason: `Invalid severity: ${insight.severity}` };
  }
  insight.severity = insight.severity.toLowerCase(); // normalise
  return { valid: true };
}

function validateInsightType(insight) {
  if (!ALLOWED_INSIGHT_TYPES.has(insight.insightType?.toLowerCase())) {
    return { valid: false, reason: `Invalid insightType: ${insight.insightType}. Must be one of: Anomaly, Cash Flow Risk, Efficiency, Growth Opportunity, Operational Velocity` };
  }
  insight.insightType = insight.insightType.toLowerCase(); // normalise
  return { valid: true };
}

function validateCausality(insight) {
  const fields = ['whyItMatters', 'whatWeFound', 'summary', 'suggestedReview'];
  for (const field of fields) {
    const text = (insight[field] || '').toLowerCase();
    for (const phrase of HARD_CAUSALITY_PHRASES) {
      if (text.includes(phrase)) {
        return { valid: false, reason: `GR-3 violation: hard causality "${phrase}" in ${field}` };
      }
    }
  }
  return { valid: true };
}

function validateCTAs(insight) {
  const review = (insight.suggestedReview || '').trim().toLowerCase();
  const startsWithAllowed = ALLOWED_CTA_VERBS.some(v => review.startsWith(v));
  if (!startsWithAllowed) {
    return { valid: false, reason: `GR-7 violation: suggestedReview must start with ${ALLOWED_CTA_VERBS.join('/')}` };
  }
  return { valid: true };
}

function factCheckInsight(insight, enrichedPayload) {
  const TOLERANCE = 0.05; // 5% rounding tolerance
  const claimed = insight.claimedMetrics;

  // Build a flat lookup map from all period fields
  const lookup = {};
  enrichedPayload.periods.forEach(p => {
    Object.entries(p).forEach(([k, v]) => {
      if (typeof v === 'number') {
        if (!lookup[k]) lookup[k] = [];
        lookup[k].push(v);
      }
    });
  });
  // Also add anomaly/pattern summary fields
  enrichedPayload.anomalies.forEach(a => {
    const key = `${a.metric}_anomaly_value`;
    lookup[key] = [a.value];
  });

  for (const [key, claimedVal] of Object.entries(claimed)) {
    const numericClaimed = parseFloat(String(claimedVal).replace(/,/g, ''));
    if (isNaN(numericClaimed)) continue; // skip non-numeric claimed values

    const candidates = lookup[key];
    if (!candidates) {
      // Key doesn't exist in payload — potential hallucination
      return { valid: false, reason: `GR-13: claimed metric key "${key}" not found in input payload` };
    }

    const matched = candidates.some(v => {
      if (v === 0 && numericClaimed === 0) return true;
      return Math.abs((v - numericClaimed) / (Math.abs(v) || 1)) <= TOLERANCE;
    });

    if (!matched) {
      return { valid: false, reason: `GR-13: claimed ${key}=${claimedVal} does not match any input value (found: ${candidates.join(', ')})` };
    }
  }
  return { valid: true };
}

function validateMateriality(insight, enrichedPayload) {
  // Simulated materiality: if all claimed metric values are below ₹50k, suppress
  const claimed = insight.claimedMetrics;
  const values = Object.values(claimed)
    .map(v => Math.abs(parseFloat(String(v).replace(/,/g, ''))))
    .filter(v => !isNaN(v) && v > 0);

  if (values.length === 0) return { valid: true }; // non-monetary insight, allow

  const maxClaimed = Math.max(...values);
  if (maxClaimed < 50000) {
    return { valid: false, reason: `Materiality: max claimed metric value ₹${maxClaimed.toLocaleString('en-IN')} below threshold` };
  }
  return { valid: true };
}

function checkHistorySufficiency(enrichedPayload) {
  const count = enrichedPayload.periods.length;
  if (count < 1) return { sufficient: false, reason: 'No data periods available.' };
  if (count < 3) return { sufficient: true, warning: `Only ${count} periods — Tier 2 pattern insights unavailable.` };
  return { sufficient: true };
}

// --- GR-2: Generic Advice Detection ---
const GENERIC_PATTERNS = [
  /\b(monitor|track|watch|keep an eye on)\b.+\b(expenses|cash flow|revenue|spending)\b/i,
  /\b(it'?s important to|you should|make sure to)\b/i,
  /\b(consider reviewing|consider monitoring)\b(?!\s+the\s+(₹|\d+))/i,
];

function validateGeneric(insight) {
  const fields = ['title', 'summary', 'whatWeFound', 'whyItMatters'];
  for (const field of fields) {
    const text = insight[field] || '';
    for (const pattern of GENERIC_PATTERNS) {
      if (pattern.test(text)) {
        // Check if the text also contains a specific number — if so, it might still be fine
        const hasNumber = /[₹]\s*[\d,]+/.test(text) || /\d+%/.test(text);
        if (!hasNumber) {
          return { valid: false, reason: `GR-2 violation: generic advice pattern in ${field}: "${text.slice(0, 60)}..."` };
        }
      }
    }
  }
  return { valid: true };
}

// --- GR-6: Duplicate Detection ---
function findDuplicates(insights) {
  const unique = [];
  const duplicates = [];
  const seen = new Set();

  for (const ins of insights) {
    // Create a normalized signature from title + claimed metrics
    const metrics = Object.keys(ins.claimedMetrics || {}).sort().join(',');
    const norm = (ins.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    const sig = `${norm}|${metrics}`;

    if (seen.has(sig)) {
      duplicates.push(ins);
    } else {
      seen.add(sig);
      unique.push(ins);
    }
  }

  return { unique, duplicates };
}

// --- GR-8: Data Quality Gate ---
function checkDataFreshness(rawPayload) {
  // Check if payload has a data timestamp or period info
  const periods = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
  const hasData = periods.length > 0 && periods.some(p => {
    const hasValues = Object.values(p).some(v => {
      const num = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : typeof v === 'number' ? v : 0;
      return num > 0;
    });
    return hasValues;
  });

  if (!hasData) {
    return { valid: false, state: 'stale', reason: 'Dashboard data is not fully up to date yet.' };
  }

  // Check if latest period has zero values across all metrics (future padding)
  const latest = periods[periods.length - 1];
  if (latest) {
    const flowFields = ['bank_inflow', 'bank_outflow', 'bank_net_flow', 'txn_count'];
    const allZero = flowFields.every(f => {
      const v = typeof latest[f] === 'string' ? parseFloat(latest[f].replace(/,/g, '')) : (latest[f] || 0);
      return v === 0;
    });
    if (allZero) {
      return { valid: true, state: 'partial_period', warning: 'Latest period appears incomplete.' };
    }
  }

  return { valid: true, state: 'ready' };
}

// --- GR-9: Closed Period Check ---
function checkPeriodCompleteness(enrichedPayload) {
  const periods = enrichedPayload.periods;
  if (periods.length === 0) return { isPartial: false, label: '' };

  const latest = periods[periods.length - 1];
  // If the latest period has zero txn_count or near-zero values, it's partial
  if (latest.txn_count === 0 && latest.inflow === 0) {
    return { isPartial: true, label: `Based on partial data through ${latest.display}` };
  }
  return { isPartial: false, label: '' };
}

// --- GR-10: Insight Expiry ---
function areInsightsExpired() {
  if (!insightsGeneratedAt) return false; // No insights yet, not "expired"
  const generated = new Date(insightsGeneratedAt).getTime();
  const now = Date.now();
  const ageHours = (now - generated) / (1000 * 60 * 60);
  return ageHours > insightExpiryHours;
}

function parseAndValidateInsights(text, enrichedPayload) {
  const parsed = parseInsights(text); // existing JSON parsing function
  if (!parsed) return [];

  const valid = [];
  const suppressed = [];

  parsed.forEach((insight, idx) => {
    const checks = [
      validateSchema(insight),
      validateInsightType(insight),
      validateSeverity(insight),
      validateGeneric(insight),             // GR-2
      validateCausality(insight),           // GR-3
      validateCTAs(insight),                // GR-7
      factCheckInsight(insight, enrichedPayload), // GR-1 / GR-11
      validateMateriality(insight, enrichedPayload), // GR-4
    ];
    const failed = checks.find(c => !c.valid);
    if (failed) {
      suppressed.push({ index: idx, title: insight.title || 'untitled', reason: failed.reason });
    } else {
      valid.push(insight);
    }
  });

  if (suppressed.length > 0) {
    console.warn(`Suppressed ${suppressed.length} insights:`);
    suppressed.forEach(s => console.warn(`  [${s.index}] "${s.title}" → ${s.reason}`));
  }

  // GR-6: Deduplicate
  const { unique, duplicates } = findDuplicates(valid);
  if (duplicates.length > 0) {
    console.warn(`GR-6: Removed ${duplicates.length} duplicate insight(s)`);
  }

  // Sort: critical → watch → positive
  const ORDER = { critical: 0, watch: 1, positive: 2 };
  unique.sort((a, b) => (ORDER[a.severity] ?? 99) - (ORDER[b.severity] ?? 99));

  return unique;
}

function parseInsights(text) {
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    // Handle case where response is wrapped in { insights: [...] }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (Array.isArray(parsed.insights)) {
        return parsed.insights;
      }
      // If it's a single object with expected fields, wrap it in an array
      if (parsed.insightType || parsed.title) {
        return [parsed];
      }
    }
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', e);
    console.error('Raw response:', cleaned);
    return null;
  }
}

// --- Rate limiter helpers ---

function hashPayload(payload) {
  return crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');
}

function checkRateLimits() {
  const now = Date.now();

  // RPD check – reset daily window
  if (now - rpdWindowStart > RPD_WINDOW_MS) {
    rpdCount = 0;
    rpdWindowStart = now;
  }
  if (rpdCount >= MAX_RPD) {
    return { allowed: false, reason: 'Daily request limit reached. Try again tomorrow.' };
  }

  // RPM check – sliding window
  rpmTimestamps = rpmTimestamps.filter(ts => now - ts < RPM_WINDOW_MS);
  if (rpmTimestamps.length >= MAX_RPM) {
    const oldestInWindow = rpmTimestamps[0];
    const retryAfterSec = Math.ceil((oldestInWindow + RPM_WINDOW_MS - now) / 1000);
    return { allowed: false, reason: `Too many requests. Retry in ${retryAfterSec}s.` };
  }

  // TPM rough check – count prompt + estimated response tokens
  if (now - tokenMinuteStart > RPM_WINDOW_MS) {
    tokenUsageMinute = 0;
    tokenMinuteStart = now;
  }

  return { allowed: true };
}

function recordRateLimitUsage(promptLength) {
  rpmTimestamps.push(Date.now());
  rpdCount++;
  // Rough token estimate: ~1 token per 4 chars for English text
  const estimatedTokens = Math.ceil(promptLength / 4);
  tokenUsageMinute += estimatedTokens;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processQueue() {
  if (geminiProcessing || geminiQueue.length === 0) return;

  geminiProcessing = true;

  while (geminiQueue.length > 0) {
    const item = geminiQueue[0];

    // Wait if RPM window is full
    const now = Date.now();
    rpmTimestamps = rpmTimestamps.filter(ts => now - ts < RPM_WINDOW_MS);
    if (rpmTimestamps.length >= MAX_RPM) {
      const oldestInWindow = rpmTimestamps[0];
      const waitTime = oldestInWindow + RPM_WINDOW_MS - now;
      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await sleep(waitTime + 100);
        continue;
      }
    }

    // Retry logic with exponential backoff for 429s
    let attempts = 0;
    const maxRetries = 3;
    let success = false;

    while (attempts < maxRetries && !success) {
      try {
        recordRateLimitUsage(item.prompt.length);
        const rawText = await callGeminiRaw(item.prompt);
        const validatedInsights = parseAndValidateInsights(rawText, item.enrichedPayload);

        geminiQueue.shift(); // remove processed item

        if (validatedInsights && validatedInsights.length > 0) {
          cachedInsights = validatedInsights;
          insightsGeneratedAt = new Date().toISOString();
          lastPayloadHash = item.payloadHash;
          console.log(`Generated ${validatedInsights.length} insights (attempt ${attempts + 1})`);
          item.resolve({ success: true, count: validatedInsights.length });
        } else {
          console.error('Gemini returned no valid insights after validation');
          item.resolve({ success: false, error: 'Failed to parse AI response or all insights suppressed' });
        }
        success = true;
      } catch (err) {
        attempts++;

        // Check if it's a rate limit error
        if (err.message && (err.message.includes('429') || err.message.includes('RATE_LIMIT'))) {
          if (attempts < maxRetries) {
            const backoff = Math.min(1000 * Math.pow(2, attempts), 30000);
            console.warn(`429 rate limited. Retry ${attempts}/${maxRetries} in ${backoff}ms`);
            await sleep(backoff);
          } else {
            geminiQueue.shift();
            item.resolve({ success: false, error: 'Rate limit exceeded after retries. Please try again later.' });
            success = true; // consumed, not retried further
          }
        } else {
          // Non-retryable error
          geminiQueue.shift();
          item.resolve({ success: false, error: err.message });
          success = true;
        }
      }
    }
  }

  geminiProcessing = false;
}

async function callGeminiRaw(prompt) {
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
    });

    // Log raw AI output
    console.log('=== RAW CROF.AI OUTPUT ===');
    console.log(JSON.stringify(response, null, 2));
    console.log('=== END RAW OUTPUT ===');

    // Handle both string and object responses
    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    // If content is already an object, stringify it; if it's a string, return it
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    return text;
  } catch (err) {
    console.error('Crof.ai API error:', err.message);
    throw err;
  }
}

async function generateInsights(payload) {
  // Store raw payload for GR-8 data quality checks
  lastPayloadRaw = payload;
  payloadReceivedAt = Date.now();

  // GR-8: Check data freshness
  const freshness = checkDataFreshness(payload);
  if (!freshness.valid) {
    return { success: false, error: freshness.reason, state: 'stale' };
  }

  // Step 1: Transform payload (GR-11 History Gate, Tier 1/2 Detection)
  const enrichedPayload = transformPayload(payload);
  console.log(`Enriched payload: ${enrichedPayload.periods.length} periods, ${enrichedPayload.anomalies.length} anomalies, ${enrichedPayload.patterns.length} patterns`);

  // Step 2: GR-11 History Sufficiency Gate (GR-13 in PRD)
  const historyCheck = checkHistorySufficiency(enrichedPayload);
  if (!historyCheck.sufficient) {
    return { success: false, error: historyCheck.reason, state: 'insufficient_history' };
  }
  if (historyCheck.warning) {
    console.warn('GR-11 warning:', historyCheck.warning);
  }

  // GR-9: Check period completeness
  const periodCheck = checkPeriodCompleteness(enrichedPayload);
  if (periodCheck.isPartial) {
    console.warn('GR-9:', periodCheck.label);
  }

  // Step 3: Dedup on enriched payload
  const payloadHash = hashPayload(enrichedPayload);
  if (payloadHash === lastPayloadHash && cachedInsights.length > 0) {
    console.log('Duplicate enriched payload, returning cached insights');
    return { success: true, count: cachedInsights.length, cached: true };
  }

  // Step 4: Rate limit check
  const limitCheck = checkRateLimits();
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.reason };
  }

  // Step 5: Build prompt with enriched payload
  let prompt = SYSTEM_PROMPT + '\n\nDATA INPUT (enriched):\n' + JSON.stringify(enrichedPayload, null, 2);
  if (periodCheck.isPartial) {
    prompt += `\n\nNOTE: ${periodCheck.label}`;
  }

  // Step 6: Queue and process
  return new Promise((resolve) => {
    geminiQueue.push({ prompt, payloadHash, enrichedPayload, resolve });
    processQueue();
  });
}

const server = http.createServer(async (req, res) => {
  // Handle proxy path if the reverse proxy doesn't strip it
  let urlPath = req.url.split('?')[0].replace(/^\/proxy\/\d+/, '');
  if (urlPath === '' || urlPath === '/') urlPath = '/index.html';

  // API: GET insights
  if (urlPath === '/api/insights' && req.method === 'GET') {
    let feedState = 'ready';
    let stateMessage = '';

    // GR-8: Check data staleness
    if (payloadReceivedAt) {
      const hoursSincePayload = (Date.now() - payloadReceivedAt) / (1000 * 60 * 60);
      if (hoursSincePayload > 24) {
        feedState = 'stale';
        stateMessage = 'Insights paused: dashboard data is not fully up to date yet.';
      }
    }

    // GR-10: Check insight expiry
    if (feedState === 'ready' && areInsightsExpired()) {
      feedState = 'stale';
      stateMessage = 'Insights have expired. Please refresh data.';
    }

    // GR-9: Check period completeness for the tagline
    let partialLabel = '';
    if (cachedInsights.length > 0 && lastPayloadRaw) {
      // Partial period check is applied during generation
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify({
      insights: cachedInsights,
      generatedAt: insightsGeneratedAt,
      state: feedState,
      stateMessage: stateMessage,
    }));
  }

  // API: POST financial data → Gemini → insights
  if (urlPath === '/api/generate-insights' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        console.log('Received payload with', Array.isArray(payload) ? payload.length : 'object', 'entries');

        res.writeHead(200, { 'Content-Type': 'application/json' });

        try {
          const result = await generateInsights(payload);
          res.end(JSON.stringify(result));
        } catch (aiError) {
          console.error('Gemini API error:', aiError);
          res.end(JSON.stringify({ success: false, error: aiError.message }));
        }
      } catch (e) {
        console.error('Error parsing POST body:', e);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // API: POST feedback on an insight
  if (urlPath === '/api/feedback' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('Feedback received:', JSON.stringify(data));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Static file serving
  let filePath = DIR + urlPath;
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  const contentType = contentTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Serving on http://0.0.0.0:' + PORT);
});

process.on('SIGHUP', () => {}); // Ignore SIGHUP

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
