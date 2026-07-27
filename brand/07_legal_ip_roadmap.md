# 07 · Legal, IP & Compliance Roadmap (Kenya)

> I'm not a lawyer; this is an organized action map based on current public sources. Engage a Kenyan IP/fintech advocate (e.g., via Law Society of Kenya referral, or firms like CM Advocates, KDS, MMS, TripleOKLaw) before filing anything binding.

## Phase 0 — Corporate foundation (Week 1–2)

- [ ] Confirm/incorporate the operating company (Private Limited via eCitizen BRS). Decide: does "Ongea Pesa Ltd" exist as its own entity, or does Nairobi Space of AI Tools own the product? Investors will want a clean single entity holding all IP.
- [ ] **IP assignment agreements**: every contributor (including James personally, and any dev/contractor) signs IP assignment to the company. Without this, everything else is decoration.
- [ ] KRA PIN, bank account in company name.
- [ ] Founder shirts/merch: brand use flows from the company once TM is filed.

## Phase 1 — Copyright (Week 1 — cheapest, fastest shield)

Copyright in Kenya exists automatically on creation, but **registration = evidence**.

- [ ] Register the software with **KECOBO** via the National Rights Registry (nrr.copyright.go.ke): corporate account → Literary Works → Software → upload documentation PDF + screenshots. **KES 1,000 per work, certificate ~7 days.**
- [ ] Register separately as works: (1) the app/codebase, (2) the brand bible & marketing copy, (3) key video scripts, (4) the sound logo once produced.

## Phase 2 — Trademark (Week 1–4, runs in parallel)

- [ ] **TM27 preliminary search** at KIPI (~KES 1,000, 1–7 days) for "ONGEA PESA" word mark + logo.
- [ ] **TM2 application** (~KES 4,000 first class local). File in at least: Class 36 (financial services), Class 9 (software), Class 42 (SaaS). Subsequent classes ~KES 3,000.
- [ ] Timeline: examination → 60-day journal opposition window → registration; typically 8–18 months. Protection runs from filing date.
- [ ] Also register domains + socials uniformly (ongeapesa.co.ke/.com; handles @ongeapesa everywhere) — do this TODAY, it costs nothing.
- [ ] Later: Madrid Protocol / ARIPO filing for regional expansion (budget item, not urgent).

## Phase 3 — Patent (realistic view)

- Kenya's Industrial Property Act excludes business methods and programs-for-computers *as such*. Pure "send money by voice" is likely unpatentable and is anyway prior art (see M-Pesa IVR, academic USSD-voice frameworks).
- **Patentable angle, if any:** a specific novel *technical* method — e.g., your particular voice-biometric + liveness + step-up transaction pipeline over unreliable networks. Discuss a **utility model certificate** (lower bar, 10 years) with a patent agent as the pragmatic route.
- **Honest priority:** speed + data + brand + community are the real moat. Budget patent effort accordingly (after trademark and licensing, not before).

## Phase 4 — Data protection / ODPC (Week 2–6 — REQUIRED before biometric launch)

- [ ] Register with **ODPC** as data controller (mandatory above KES 5M turnover/10 staff — register anyway; certificate valid 24 months; issued ~14 days).
- [ ] **Biometric data = sensitive personal data** under the DPA 2019. Requirements: explicit consent, a **Data Protection Impact Assessment (DPIA) before launch of voice/face biometrics**, security safeguards, retention policy. ODPC has draft guidance specifically on biometric processing — have counsel align the DPIA with it.
- [ ] Publish privacy policy (EN/SW, and an *audio version* — on-brand and genuinely accessible).
- [ ] Appoint a DPO contact (can be outsourced initially).

## Phase 5 — CBK licensing path (Month 1–9)

Current model rides on partners' rails (IndexPay, NCBA, Daraja). Map where Ongea Pesa itself touches funds:

- [ ] Legal opinion: does the current architecture make Ongea Pesa a **PSP/e-money issuer** or an **agent/tech provider** of licensed partners? (The internal wallet_balance ledger suggests PSP territory.)
- [ ] If PSP: CBK authorization under NPS Act 2011. Core capital: KES 5M (electronic retail PSP) up to KES 20M (e-money issuer). Application: business plan, AML/CFT + KYC policies, IT security framework, board fit-and-proper, SLAs with partners. Timeline 4–9 months.
- [ ] Engage the **CBK Fintech Office early and voluntarily** — regulators reward proactivity.
- [ ] AML: registration of reporting obligations with FRC (Financial Reporting Centre); transaction-monitoring rules already partially exist in the n8n stack — document them.

## Phase 6 — Contracts library (Month 1–3)

- [ ] Terms of Service + acceptable use (audio version too)
- [ ] Influencer/ambassador agreement (deliverables, FTC-style disclosure, image rights)
- [ ] Talent release forms EN/SW (doc 05 shoots)
- [ ] Partnership MOU template (KSB/KUB/inABLE pilots — include data-sharing annex)
- [ ] Deepfake-bounty T&Cs (before the doc 02 stunt)
- [ ] Employment/contractor templates with IP assignment + confidentiality

## Budget snapshot (government fees only, excl. counsel)

| Item | Cost | When |
|---|---|---|
| KECOBO copyright ×4 works | ~KES 4,000 | Week 1 |
| KIPI TM27 search | ~KES 1,000 | Week 1 |
| KIPI TM2, 3 classes | ~KES 10,000 | Week 2–4 |
| ODPC registration | ~KES 4,000–25,000 (tiered) | Week 2–6 |
| CBK application + capital | KES 5M–20M capital held | Month 3+ |
| Utility model/patent agent | quote-based | Month 6+ |
