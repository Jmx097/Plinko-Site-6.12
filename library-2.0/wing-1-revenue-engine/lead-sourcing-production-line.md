# Lead Sourcing Production Line

> **One-line promise:** a repeatable line from "search filter" to "enriched, campaign-ready lead" where every stage has one owner, one output, and no stage reaches into another's job.

| | |
|---|---|
| **OWNER** | You on Monday's pipeline block; agents run stages 4–5 automatically |
| **TRIGGER** | Weekly (Monday), or a P1 signal firing |
| **THE NUMBER IT MOVES** | Cost per qualified lead (down) and unique prospects touched (steady) |
| **BELT** | Amber |

This is the sanitized version of the line that runs this community's own pipeline. The shape matters more than the tools: **source → score → gate → enrich → promote**, with paid enrichment sitting *behind* the quality gate so you never pay to enrich junk.

## The System

1. **Source from a frozen search.** Build your filter once (firmographics + a buyer-activity filter like "posted in the last 30 days"), save it, and stop tinkering. Each run extracts to a **dated file** — one file per run is your audit trail.
2. **Dedup against history.** Keep a running history of every lead ID you've ever pulled. Normalize URLs before comparing (tracking tokens change between sessions; the stable ID doesn't). Today's output is net-new only.
3. **Score every lead A/B/C/D.** Three components: company-type fit (is this actually your ICP, or adjacent bleed?), title fit (owner/exec vs. mid vs. advisor), geography. Force obvious non-ICP companies to D *regardless of title* — a great title at the wrong company is still the wrong company.
4. **THE HIGH-SIGNAL GATE: only Tier A passes.** This is the rule that pays for itself. Everything downstream that costs money per row (data enrichment, email finding, verification) only ever sees Tier A. Park B and C for manual review; drop D. If a run is thin on A, consciously decide to admit B — never let it happen by default.
5. **Hand off through a watched folder.** The gate's output lands as a dated file in one fixed location; the enrichment automation watches that folder and fires on arrival. New file = new run. No webhooks, no copy-paste, fewest moving parts.
6. **Enrich in one batch.** Enrichment providers bill per row — batch every URL into one job instead of per-lead calls. Append results to a durable store (a plain spreadsheet is fine; it's your system of record for cold leads).
7. **Find + verify emails, with an accept gate.** Only load emails verified as valid/accept-all above a confidence threshold (we use score ≥ 70). Mark failures terminal so they aren't retried forever; leave transient errors blank so the next sweep retries automatically. That one status column makes the whole line idempotent and self-healing.
8. **Load into a PAUSED campaign.** Auto-load is not auto-send. Leads queue into a campaign that doesn't send until a human launches it. The gate moves from per-lead to per-campaign, but it never disappears.
9. **Promote on engagement only.** A cold lead never enters your CRM. Only when someone replies or books do they get promoted to the Contacts table. Your CRM stays small, clean, and honest (and on the free tier).

## The two rules that make it durable

**Dated files, never edits.** Every stage writes a new dated artifact. You can replay any week and see exactly what was sourced, scored, and shipped.

**One status column = reliability.** A blank status means "retry me." A terminal status means "never again." That's the entire error-handling strategy, and it has survived every transient API failure without losing a lead.

## Sourcing when the well runs dry

Saved searches hit a ceiling — the same few hundred results recycle. Two workarounds that actually work: split the search by **one seniority level at a time** (each seniority has its own result pool), and lean on time-based activity filters that refill weekly. Splitting by industry usually doesn't work (one industry code tends to carry the whole pool).

## Agents Attached

The enrichment workflow (Wing 3 Gallery: watched-folder enricher) runs stages 5–6. The loader (Gallery: idempotent campaign loader) runs stages 7–8 on a 15-minute schedule. Reply triage (Wing 3) handles stage 9.

## Copy This

The **scoring rubric**: company-type fit 0–50 (ICP keywords vs. bleed list) · title fit 6–35 (owner/exec top, mid medium, advisor low) · geography 0–15. Tiers: A ≥ 72, B ≥ 52, C ≥ 32, D below. Calibrate once against a hand-labeled batch of ~100, then freeze it.
