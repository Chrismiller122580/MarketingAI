#!/usr/bin/env node
/**
 * Meta Marketing API — App Review test call runner
 *
 * Marketing API Access Tier requires ≥500 Marketing API calls with ≥85% success
 * from THIS app. Page/Instagram publish calls do NOT count.
 *
 * Prerequisites:
 * 1. Meta app has Marketing API product added
 * 2. ads_read (and ads_management if you need write tests) added to the app
 * 3. Token with ads_read — System User token (recommended) or user OAuth token
 * 4. Test ad account in Business Manager (or your own ad account)
 * 5. Token generated FROM this same App ID (calls from other apps won't count)
 *
 * Usage:
 *   META_ADS_ACCESS_TOKEN=EAA... META_AD_ACCOUNT_ID=act_123 npm run meta:ads-test
 *   META_ADS_ACCESS_TOKEN=EAA... npm run meta:ads-test -- --target 500
 *
 * Dashboard may take up to 24h to reflect counts after running.
 */

const GRAPH = "https://graph.facebook.com/v19.0";
const token = process.env.META_ADS_ACCESS_TOKEN;
const accountIdArg = process.env.META_AD_ACCOUNT_ID?.replace(/^act_/, "");

const args = process.argv.slice(2);
const targetIdx = args.indexOf("--target");
const targetCalls = targetIdx >= 0 ? Number(args[targetIdx + 1]) : 520;
const dryRun = args.includes("--dry-run");

if (!token) {
  console.error("Missing META_ADS_ACCESS_TOKEN");
  process.exit(1);
}

if (!Number.isFinite(targetCalls) || targetCalls < 1) {
  console.error("Invalid --target value");
  process.exit(1);
}

const stats = { total: 0, ok: 0, fail: 0, endpoints: {} };

async function graphGet(path, params = {}) {
  const url = new URL(`${GRAPH}${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }

  const label = path.split("?")[0];
  stats.total += 1;
  stats.endpoints[label] = (stats.endpoints[label] ?? 0) + 1;

  if (dryRun) {
    stats.ok += 1;
    return { dryRun: true };
  }

  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));

  if (!res.ok || body.error) {
    stats.fail += 1;
    const msg = body.error?.message ?? res.statusText;
    throw new Error(`${label}: ${msg}`);
  }

  stats.ok += 1;
  return body;
}

async function resolveAdAccountId() {
  if (accountIdArg) return accountIdArg;

  const data = await graphGet("/me/adaccounts", {
    fields: "id,name,account_status",
    limit: 25,
  });
  const accounts = data.data ?? [];
  if (accounts.length === 0) {
    throw new Error(
      "No ad accounts on token. Set META_AD_ACCOUNT_ID or grant ads_read on a test ad account.",
    );
  }

  const active = accounts.find((a) => a.account_status === 1) ?? accounts[0];
  const id = String(active.id).replace(/^act_/, "");
  console.log(`Using ad account: act_${id} (${active.name ?? "unnamed"})`);
  return id;
}

/** Read-only endpoints that count toward Marketing API testing. */
function buildReadEndpoints(actId) {
  const base = `/act_${actId}`;
  return [
    () => graphGet(`${base}`, { fields: "id,name,account_status,currency,timezone_name" }),
    () => graphGet(`${base}/campaigns`, { fields: "id,name,status,objective", limit: 25 }),
    () => graphGet(`${base}/adsets`, { fields: "id,name,status,daily_budget", limit: 25 }),
    () => graphGet(`${base}/ads`, { fields: "id,name,status", limit: 25 }),
    () => graphGet(`${base}/adcreatives`, { fields: "id,name", limit: 25 }),
    () =>
      graphGet(`${base}/insights`, {
        fields: "impressions,clicks,spend,reach",
        date_preset: "last_7d",
        level: "account",
      }),
    () => graphGet("/me/adaccounts", { fields: "id,name", limit: 10 }),
  ];
}

function printStats() {
  const rate = stats.total ? ((stats.ok / stats.total) * 100).toFixed(1) : "0";
  console.log(`\n--- Summary ---`);
  console.log(`Calls: ${stats.total} | OK: ${stats.ok} | Fail: ${stats.fail} | Success: ${rate}%`);
  console.log(`By endpoint:`);
  for (const [ep, n] of Object.entries(stats.endpoints).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}x ${ep}`);
  }
}

async function main() {
  console.log(`Target: ${targetCalls} Marketing API read calls${dryRun ? " (dry run)" : ""}`);
  const actId = await resolveAdAccountId();
  const endpoints = buildReadEndpoints(actId);

  let round = 0;
  while (stats.total < targetCalls) {
    round += 1;
    for (const call of endpoints) {
      if (stats.total >= targetCalls) break;
      try {
        await call();
        if (stats.total % 50 === 0) {
          printStats();
        }
      } catch (err) {
        console.error(`[${stats.total}] ${err.message}`);
        if (stats.fail > stats.total * 0.15) {
          console.error("Error rate exceeded 15%. Stopping — fix token/permissions first.");
          printStats();
          process.exit(1);
        }
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    if (round > 200) break;
  }

  printStats();

  if (stats.ok < 500) {
    console.log("\nNeed at least 500 successful calls. Re-run after fixing errors.");
    process.exit(1);
  }

  if (stats.ok / stats.total < 0.85) {
    console.log("\nSuccess rate below 85%. Fix failing endpoints before App Review.");
    process.exit(1);
  }

  console.log("\nDone. Check Meta Developer → App Review → Testing in ~24h for updated counts.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});