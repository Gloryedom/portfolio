# Meridian Invoice Pre-Check Agent

An AI-powered n8n workflow that automatically reads incoming contractor/vendor invoices, classifies every line item, matches it against a project's budget, flags anything that would go over budget, and updates the tracker — before a human approves payment.

Built as a demo for a real estate development & construction automation project (based on a real client brief requesting AI "employee" agents for operations, contractor follow-up, permits, underwriting, and more). This is the first of several planned agents.

## The Problem

Contractor invoices arrive by email in inconsistent formats, with no standard wording for line items. Checking each one against a project budget — and confirming the billed work was actually completed — is a fully manual process that doesn't scale and is easy to get wrong.

## What This Agent Does

1. **Watches an inbox** for incoming emails with attachments.
2. **Extracts text** from the invoice PDF.
3. **Classifies every line item** into a fixed set of budget categories (Electrical, Framing, Plumbing, Permits, etc.) using an LLM — regardless of how the contractor phrased it (e.g. "Rough-in wiring, panel install" → `Electrical`).
4. **Matches each line item** against the correct project's budget, using fuzzy matching so slightly different project name wording doesn't break the match.
5. **Checks spend against budget** and routes each line item to an "Over Budget" or "On Track" path.
6. **Notifies the owner** with a summary, so approval decisions are made with the right numbers in front of them.
7. **Updates the budget tracker** (Google Sheets) once confirmed, so the next invoice checks against accurate, up-to-date spend.

The owner always makes the final approval call — this agent removes the manual cross-checking, not the judgment.

## Tech Stack

- **[n8n](https://n8n.io)** — workflow orchestration
- **OpenAI API** — invoice data extraction and line-item classification
- **Gmail** — trigger (incoming invoices) and notifications
- **Google Sheets** — budget tracking and live status (`On Track` / `Over Budget` via formula)

## Workflow Overview

```
Gmail Trigger (has:attachment)
        │
        ▼
Gmail node (fetch full message + download attachment)
        │
        ▼
Extract from File (PDF → raw text)
        │
        ▼
OpenAI node (extract + classify into fixed budget categories, return JSON)
        │
        ▼
Code node (parse JSON response)
        │
        ▼
Split Out (one item per invoice line item)
        │
        ▼
Google Sheets — Get Row(s) (pull full budget sheet)
        │
        ▼
Code node (fuzzy-match project + category, calculate new total spend)
        │
        ▼
Switch node (Over Budget / On Track / No Budget Match Found)
        │
   ┌────┴────┐
   ▼         ▼
Gmail       Gmail
(urgent)    (routine)
   │         │
   ▼         ▼
Google Sheets — Update Row (write new spend total back to budget tracker)
```

## Budget Sheet Structure

| Project Reference | Line Item | Budgeted Amount | Amount Spent So Far | Status |
|---|---|---|---|---|
| 123 Maple St - Duplex Build | Electrical | 18000 | 8200 | On Track |
| 123 Maple St - Duplex Build | Framing | 5000 | 5300 | Over Budget |

- `Budgeted Amount` is entered manually, once, when a project starts.
- `Amount Spent So Far` is updated automatically by the agent as invoices are processed.
- `Status` is a live formula: `=IF(D2>C2,"Over Budget","On Track")` — no manual input needed.

Fixed line-item categories used for classification: `Framing, Electrical, Plumbing, Permits, Roofing, Foundation, HVAC, Drywall, Flooring, Painting, Landscaping, Site Prep, Labor - General, Materials - General, Other`

## Setup

1. Import `invoice-pre-check-agent.json` into your n8n instance.
2. Connect your Gmail and Google Sheets credentials.
3. Connect your OpenAI (or other LLM) credentials.
4. Create a budget tracker Google Sheet matching the structure above.
5. Update the Gmail Trigger filter (`has:attachment`) to match your real invoice emails more precisely if needed (e.g. `has:attachment invoice`).
6. Test with a sample invoice before going live.

## Status

Working demo, tested end-to-end with sample invoices across multiple projects. Known refinement in progress: matching on project + line item together when updating the budget sheet, to support multiple concurrent projects reliably.

## Roadmap

This is Phase 1 of a larger multi-agent system. Planned next:
- Contractor & Vendor Follow-up Agent
- Permit / Municipality Tracking Agent
- Project Status Nudge Agent
- Email Triage Agent
- Underwriting Support Agent
- VA Task Flagging Agent


This is a portfolio/demo project built to explore AI-agent automation for real estate and construction operations. Invoice and budget data used for testing is fictional.
