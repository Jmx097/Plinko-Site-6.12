# The CRM Base

> **One-line promise:** a five-table CRM that stays small, honest, and free — because cold leads never get in.

| | |
|---|---|
| **OWNER** | You own the schema; agents write the rows |
| **TRIGGER** | A reply or a booking (the ONLY events that create a contact) |
| **THE NUMBER IT MOVES** | MQL→SQL conversion, and pipeline value you can actually defend |
| **BELT** | Amber |

Most operators stuff every scraped lead into their CRM, blow past the free tier in a month, and end up with a database where 95% of "contacts" never said a word to them. This base inverts that: **the durable store for cold leads is a plain spreadsheet; the CRM is for the engaged.** The CRM stays under free-tier caps indefinitely and every record in it represents a real conversation.

## The five tables

| Table | What lives there | Written by |
|---|---|---|
| **Contacts** | Engaged people only (replied or booked) | The promotion automation, on engagement |
| **Deals** | Pipeline records from discovery onward | Attribution automation creates; you advance stages |
| **Replies** | Every inbound, classified, one row each | Triage agent |
| **Escalations** | Decisions waiting on you, with timestamps | Any agent that hits its approval gate |
| **Learning Log** | Your agree/disagree grades on agent calls | You, during the Friday review |

(A sixth dimension table — Clients — joins everything by client ID the day you run this for someone other than yourself. Add it on day one even with a single seed row; retrofitting attribution is miserable.)

## The System

1. **Promote on engagement only.** The single rule that keeps the base clean. Reply or booking → automation upserts the contact with source, campaign, persona, signal code, and reply class. No reply → they stay in the spreadsheet store.
2. **Upsert, never insert.** Merge on email; fall back to LinkedIn URL for LinkedIn-only contacts. Never fabricate an email to fill the field — a null email with a real LinkedIn URL is an honest record; a guessed email poisons your merge key forever.
3. **Run one Lead Status field with frozen values:** `Queued → Touched → Replied → Booked → Closed-Won / Closed-Lost`, plus `Unsubscribed` and `DNC` as terminal states. Every automation and every report reads this one field. Resist adding "Warm."
4. **Stamp provenance on every contact:** source (which system/version created it), campaign, sending domain, signal code if a signal triggered the touch. This is what makes "which signals actually book meetings?" a 10-second query at quarter end instead of an archaeology dig.
5. **Let Deals carry the money, with frozen stage weights.** Discovery 20% · Proposal 50% · Negotiation 75%. Pipeline value = sum of weighted active deals. Freeze the weights on day one (Scoreboard discipline) so pipeline value means the same thing in week 12 as week 1.
6. **Record reply state on the contact:** last reply class, one-line summary, timestamp. Your reply sweep works entirely from these three fields — no inbox spelunking.
7. **Keep MQL and SQL definitions in writing:** MQL = contact who replied positive or booked. SQL = deal at Proposal or later after a discovery call. When someone asks about your funnel, you point at definitions, not vibes.

## Agents Attached

The promotion/attribution workflow (Wing 3 Gallery) owns writes to Contacts and Deals creation. The triage agent owns Replies. Nothing auto-writes to Clients, and no agent advances a Deal stage — stage moves are human judgments.

## Copy This

The **duplicable base template** (Airtable or Notion): the five tables above with the exact fields — Contacts (`email, first, last, company, title, linkedin_url, country, list_tier, source, lead_status, motion, persona, signal_code, campaign, source_domain, last_reply_class, last_reply_summary, last_reply_at, client_id`), Deals (`contact, stage, contract_value, mrr_component, created, closed`), Replies, Escalations, Learning Log as defined on the Reply Spine page. Duplicate it, add your seed client row, wire the two automations, done.
