# 🔐 NDA & Trade Secrets Protection Guide - Ongea Pesa

**Version:** 1.0  
**Last Updated:** February 2026  
**Jurisdiction:** Kenya (Primary) | International (Secondary)

---

## 📋 Table of Contents

1. [Introduction to Trade Secrets](#introduction-to-trade-secrets)
2. [What Qualifies as a Trade Secret](#what-qualifies-as-a-trade-secret)
3. [Trade Secrets for Ongea Pesa](#trade-secrets-for-ongea-pesa)
4. [Legal Framework in Kenya](#legal-framework-in-kenya)
5. [Non-Disclosure Agreements (NDAs)](#non-disclosure-agreements-ndas)
6. [Types of NDAs](#types-of-ndas)
7. [Implementing Trade Secret Protection](#implementing-trade-secret-protection)
8. [Employee and Contractor Obligations](#employee-and-contractor-obligations)
9. [Third-Party Relationships](#third-party-relationships)
10. [Enforcement and Remedies](#enforcement-and-remedies)
11. [Best Practices](#best-practices)
12. [FAQs](#faqs)

---

## 🔍 Introduction to Trade Secrets

### What is a Trade Secret?

A **trade secret** is confidential business information that provides a competitive advantage and is subject to reasonable efforts to maintain its secrecy.

**Key Characteristics:**
1. **Secret:** Not generally known or readily accessible
2. **Valuable:** Has commercial value because it's secret
3. **Protected:** Subject to reasonable steps to keep it secret

**Examples:**
- Coca-Cola formula (never patented, kept secret for 100+ years)
- Google search algorithm
- KFC's 11 herbs and spices
- Customer lists and databases
- Manufacturing processes
- Business strategies

### Trade Secrets vs Other IP

| Feature | Trade Secret | Patent | Copyright | Trademark |
|---------|--------------|--------|-----------|-----------|
| **Duration** | Indefinite (while secret) | 20 years | 50+ years | 10 years (renewable) |
| **Registration** | No | Yes | Optional | Yes |
| **Public Disclosure** | No | Yes | No | Yes |
| **Cost** | Low (internal controls) | High | Low | Medium |
| **Protection Scope** | Confidential info | Inventions | Creative works | Brands |
| **Reverse Engineering** | Not protected | Protected | N/A | N/A |

### Advantages of Trade Secrets

✅ **Benefits:**
- **No Time Limit:** Protection lasts as long as secret is maintained
- **No Registration:** No filing fees or bureaucracy
- **No Disclosure:** Information stays confidential
- **Immediate Protection:** Effective from day one
- **Broad Scope:** Protects information not eligible for patents/copyright
- **Low Cost:** Only internal security costs

### Disadvantages of Trade Secrets

❌ **Risks:**
- **No Protection Against Reverse Engineering:** If someone independently discovers or reverse engineers, no recourse
- **No Protection Against Independent Discovery:** Multiple parties can have same trade secret
- **Loss of Secrecy = Loss of Rights:** Once public, protection gone forever
- **Difficult to Enforce:** Must prove information was secret and misappropriated
- **Employee Mobility:** Risk of disclosure when employees leave

---

## 📊 What Qualifies as a Trade Secret

### Legal Test (Kenya & International)

To qualify as a trade secret, information must meet **THREE criteria:**

#### 1. **Not Generally Known or Readily Accessible**

**Test:** Is this information publicly available or easily discoverable?

✅ **Qualifies:**
- Proprietary algorithms not disclosed
- Internal business processes
- Customer data not public
- Unpublished financial models

❌ **Does NOT Qualify:**
- Information in public domain
- Information easily reverse-engineered
- Information in published patents
- Common industry knowledge

---

#### 2. **Has Commercial Value Because It's Secret**

**Test:** Does secrecy provide competitive advantage or economic benefit?

✅ **Qualifies:**
- Customer lists (if not publicly available)
- Pricing strategies
- Source code (if not open source)
- Manufacturing techniques
- Marketing strategies

❌ **Does NOT Qualify:**
- Information with no competitive value
- Obsolete information
- Information competitors already have

---

#### 3. **Subject to Reasonable Efforts to Maintain Secrecy**

**Test:** Has the owner taken steps to protect the information?

✅ **Reasonable Efforts:**
- NDAs with employees/contractors
- Access controls (passwords, encryption)
- Confidentiality policies
- Physical security (locked servers)
- Marking documents "Confidential"
- Training employees on confidentiality

❌ **Insufficient Efforts:**
- No NDAs or confidentiality agreements
- Information freely shared
- No access controls
- No employee training
- Public disclosure without restrictions

**⚠️ Critical:** If you don't take reasonable steps to protect secrecy, courts won't protect it either.

---

## 🎯 Trade Secrets for Ongea Pesa

### Identifying Trade Secrets

**Ongea Pesa's Valuable Trade Secrets:**

#### **Category 1: Technology & Algorithms** 🔴 **Critical**

| Trade Secret | Why Valuable | Protection Level |
|--------------|--------------|------------------|
| **Voice Recognition Algorithm** | Proprietary AI model for voice authentication | 🔴 Critical |
| **Fraud Detection Logic** | ML model for detecting fraudulent transactions | 🔴 Critical |
| **Encryption Keys** | Security credentials for payment processing | 🔴 Critical |
| **API Integration Methods** | Proprietary M-Pesa/bank integration techniques | 🟡 High |
| **Database Schema** | Optimized data structure for performance | 🟡 High |
| **Caching Strategies** | Performance optimization techniques | 🟢 Medium |

**Protection Measures:**
- ✅ NDAs with all developers
- ✅ Access controls (role-based permissions)
- ✅ Code obfuscation for production
- ✅ Encryption at rest and in transit
- ✅ Regular security audits

---

#### **Category 2: Business Intelligence** 🔴 **Critical**

| Trade Secret | Why Valuable | Protection Level |
|--------------|--------------|------------------|
| **Customer Database** | User data, transaction history, preferences | 🔴 Critical |
| **Pricing Models** | Fee structures, commission rates | 🔴 Critical |
| **Partner Agreements** | Terms with M-Pesa, banks, payment processors | 🔴 Critical |
| **Financial Projections** | Revenue forecasts, growth models | 🟡 High |
| **Marketing Strategies** | User acquisition tactics, conversion funnels | 🟡 High |
| **Product Roadmap** | Future features and development plans | 🟡 High |

**Protection Measures:**
- ✅ NDAs with all employees
- ✅ Restricted access (need-to-know basis)
- ✅ Encrypted storage
- ✅ Confidentiality clauses in partner contracts
- ✅ Watermarking sensitive documents

---

#### **Category 3: Operational Processes** 🟡 **High**

| Trade Secret | Why Valuable | Protection Level |
|--------------|--------------|------------------|
| **Customer Onboarding Process** | Optimized KYC/verification workflow | 🟡 High |
| **Transaction Processing Flow** | Proprietary payment routing logic | 🟡 High |
| **Quality Assurance Procedures** | Testing methodologies | 🟢 Medium |
| **Vendor Selection Criteria** | How we choose partners | 🟢 Medium |
| **Incident Response Protocols** | Security breach procedures | 🟡 High |

**Protection Measures:**
- ✅ Internal documentation marked confidential
- ✅ Training materials restricted
- ✅ Process documentation access-controlled
- ✅ NDAs with vendors

---

#### **Category 4: Financial Information** 🔴 **Critical**

| Trade Secret | Why Valuable | Protection Level |
|--------------|--------------|------------------|
| **Transaction Volumes** | Competitive intelligence | 🔴 Critical |
| **Profit Margins** | Business model insights | 🔴 Critical |
| **Cost Structures** | Operational efficiency data | 🟡 High |
| **Investor Terms** | Valuation, equity structure | 🔴 Critical |
| **Banking Relationships** | Account details, credit lines | 🔴 Critical |

**Protection Measures:**
- ✅ Restricted to C-suite and finance team
- ✅ NDAs with investors and advisors
- ✅ Encrypted financial systems
- ✅ Audit trails for access

---

### What NOT to Treat as Trade Secret

❌ **Not Suitable for Trade Secret Protection:**

1. **Information You Want to Patent**
   - Patents require public disclosure
   - Cannot be both patent and trade secret
   - **Decision:** Patent (if novel) OR trade secret (if not patentable)

2. **Marketing Materials**
   - Meant to be public
   - Use copyright instead

3. **Public-Facing Features**
   - Users can see/experience
   - Use copyright/trademark

4. **Easily Reverse-Engineered Information**
   - Competitors can discover independently
   - Weak trade secret protection

5. **Industry Standard Practices**
   - Common knowledge
   - No competitive advantage

---

## ⚖️ Legal Framework in Kenya

### Trade Secret Protection in Kenya

**Legal Status:**
- ❌ **No Dedicated Trade Secrets Statute** in Kenya
- ✅ **Protection via Common Law** (breach of confidence)
- ✅ **Contractual Protection** (NDAs, employment contracts)
- ✅ **TRIPS Agreement** (Kenya is signatory)

### Sources of Protection

#### 1. **Common Law - Breach of Confidence**

**Elements to Prove:**
1. Information has quality of confidence (secret)
2. Information imparted in circumstances importing obligation of confidence
3. Unauthorized use/disclosure of information
4. Detriment to owner

**Remedies:**
- Injunction (stop disclosure)
- Damages (compensation)
- Account of profits

**Case Law:**
- Kenyan courts recognize breach of confidence claims
- Based on English common law principles

---

#### 2. **Contract Law**

**NDAs and Confidentiality Clauses:**
- Governed by **Law of Contract Act (Cap. 23)**
- Enforceable if properly drafted
- Remedies: Breach of contract damages, injunctions

**Employment Contracts:**
- Implied duty of confidentiality during employment
- Express confidentiality clauses recommended
- Post-employment restrictions (non-compete, non-solicitation)

---

#### 3. **TRIPS Agreement**

**Agreement on Trade-Related Aspects of Intellectual Property Rights:**
- Kenya is WTO member (bound by TRIPS)
- Article 39: Protection of undisclosed information
- Requires protection against unfair commercial use

**TRIPS Requirements:**
1. Information is secret
2. Has commercial value because secret
3. Subject to reasonable steps to keep secret

**Enforcement:**
- Natural and legal persons can prevent disclosure/use
- Protection against unfair commercial practices

---

#### 4. **Criminal Law**

**Computer Misuse and Cybercrimes Act, 2018:**
- Unauthorized access to computer systems (Section 17)
- Unauthorized disclosure of passwords (Section 19)
- Penalties: Fine up to KES 5M or imprisonment up to 3 years

**Penal Code:**
- Theft of confidential information
- Fraud and misrepresentation

---

### Limitations of Trade Secret Protection in Kenya

⚠️ **Challenges:**

1. **No Statutory Framework:**
   - Reliance on common law (less predictable)
   - No clear statutory remedies

2. **Burden of Proof:**
   - Must prove information was secret
   - Must prove reasonable efforts to protect
   - Must prove misappropriation

3. **Reverse Engineering:**
   - No protection if competitor independently discovers
   - Legitimate reverse engineering allowed

4. **Employee Mobility:**
   - Difficult to prevent employees from using general skills/knowledge
   - Non-compete clauses limited in scope and duration

5. **Enforcement Costs:**
   - Litigation expensive (KES 500,000+)
   - Lengthy court process (2-4 years)

**Mitigation:**
- ✅ Strong NDAs and employment contracts
- ✅ Robust internal security measures
- ✅ Regular employee training
- ✅ Quick action against breaches

---

## 📄 Non-Disclosure Agreements (NDAs)

### What is an NDA?

A **Non-Disclosure Agreement (NDA)** is a legal contract that restricts the sharing of confidential information.

**Also Known As:**
- Confidentiality Agreement (CA)
- Confidential Disclosure Agreement (CDA)
- Proprietary Information Agreement (PIA)
- Secrecy Agreement

### Purpose of NDAs

**NDAs Serve to:**
1. **Define Confidential Information:** Clearly identify what's secret
2. **Create Legal Obligation:** Bind recipient to confidentiality
3. **Establish Permitted Uses:** Specify how information can be used
4. **Set Duration:** Define how long obligation lasts
5. **Provide Remedies:** Enable legal action for breach

### When to Use NDAs

✅ **Always Use NDA Before:**
- Hiring employees or contractors
- Engaging consultants or advisors
- Discussing partnerships or investments
- Sharing technology with vendors
- Pitching to potential investors
- Collaborating with other companies
- Allowing access to proprietary systems

**⚠️ Critical:** Get NDA signed **BEFORE** disclosing confidential information. Once disclosed without NDA, protection is lost.

---

## 🔀 Types of NDAs

### 1. **Unilateral (One-Way) NDA**

**Structure:** One party discloses, other party receives

**When to Use:**
- Hiring employees/contractors
- Engaging vendors/service providers
- Pitching to investors (sometimes)
- Sharing information with advisors

**Example Scenario:**
> Ongea Pesa (Disclosing Party) shares source code with freelance developer (Receiving Party). Developer agrees not to disclose or use code except for Ongea Pesa's project.

**Key Clauses:**
- Disclosing Party: Ongea Pesa Limited
- Receiving Party: [Developer/Vendor Name]
- Confidential Information: Defined broadly
- Obligations: Receiving Party must keep secret
- Duration: 2-5 years after disclosure

**Template:** See [templates/NDA-TEMPLATE-UNILATERAL.md](templates/NDA-TEMPLATE-UNILATERAL.md)

---

### 2. **Mutual (Two-Way) NDA**

**Structure:** Both parties disclose and receive confidential information

**When to Use:**
- Partnership discussions
- Joint ventures
- Technology collaborations
- Merger/acquisition negotiations
- Strategic alliances

**Example Scenario:**
> Ongea Pesa and a bank discuss integration partnership. Both share proprietary information (Ongea Pesa: API details; Bank: internal systems). Both agree to mutual confidentiality.

**Key Clauses:**
- Both parties are Disclosing and Receiving Parties
- Confidential Information defined for each party
- Mutual obligations
- Duration: 2-5 years

**Template:** See [templates/NDA-TEMPLATE-MUTUAL.md](templates/NDA-TEMPLATE-MUTUAL.md)

---

### 3. **Multilateral NDA**

**Structure:** Three or more parties exchange confidential information

**When to Use:**
- Consortium projects
- Multi-party collaborations
- Industry working groups

**Example Scenario:**
> Ongea Pesa, a payment processor, and a telecom provider collaborate on new service. All three share confidential information.

**Key Clauses:**
- All parties listed
- Each party's confidential information defined
- Obligations apply to all parties
- Complex disclosure matrix

**Note:** Less common; usually multiple bilateral NDAs easier

---

### 4. **Employment Confidentiality Agreement**

**Structure:** Embedded in employment contract or standalone

**When to Use:**
- All employees (mandatory)
- Contractors and consultants
- Interns and temporary staff

**Example Scenario:**
> New developer joins Ongea Pesa. Employment contract includes confidentiality clause covering all company information, code, and business data.

**Key Clauses:**
- Broad definition of confidential information
- Obligation during and after employment
- Return of materials upon termination
- Non-compete and non-solicitation (optional)

**Duration:** 
- During employment: Indefinite
- Post-employment: 2-5 years (or indefinite for trade secrets)

---

## 📝 Essential NDA Clauses

### 1. **Definition of Confidential Information**

**Purpose:** Clearly identify what's protected

**Approaches:**

**Option A: Broad Definition (Recommended for Ongea Pesa)**
```
"Confidential Information" means all information disclosed by Disclosing Party 
to Receiving Party, whether oral, written, electronic, or visual, including but 
not limited to:
  (a) Source code, object code, algorithms, and software
  (b) Business plans, strategies, and financial information
  (c) Customer data, user lists, and transaction records
  (d) Technical specifications, designs, and documentation
  (e) Trade secrets, know-how, and proprietary processes
  (f) Any information marked "Confidential" or identified as confidential
  (g) Any information that would reasonably be considered confidential
```

**Option B: Specific Definition**
```
"Confidential Information" means:
  (a) The source code for Ongea Pesa mobile application
  (b) API integration documentation for M-Pesa
  (c) Customer database and transaction records
  (d) Pricing models and fee structures
```

**⚠️ Recommendation:** Use broad definition to cover all bases

---

### 2. **Exclusions from Confidential Information**

**Standard Exclusions:**
```
Confidential Information does NOT include information that:
  (a) Is or becomes publicly available through no breach by Receiving Party
  (b) Was rightfully in Receiving Party's possession before disclosure
  (c) Is independently developed by Receiving Party without use of Confidential Information
  (d) Is rightfully received from a third party without confidentiality obligation
  (e) Is required to be disclosed by law or court order (with notice to Disclosing Party)
```

**Why Needed:** Courts won't protect information that's already public or independently developed

---

### 3. **Obligations of Receiving Party**

**Key Obligations:**
```
Receiving Party agrees to:
  (a) Keep Confidential Information strictly confidential
  (b) Not disclose to any third party without prior written consent
  (c) Not use Confidential Information except for [Permitted Purpose]
  (d) Protect with same degree of care as own confidential information (minimum reasonable care)
  (e) Limit access to employees/contractors with need to know
  (f) Ensure employees/contractors are bound by confidentiality obligations
  (g) Notify Disclosing Party immediately of any unauthorized disclosure
```

---

### 4. **Permitted Use**

**Define Allowed Uses:**
```
Receiving Party may use Confidential Information solely for the purpose of:
  [Option 1: Specific] "Developing mobile application features for Ongea Pesa"
  [Option 2: Broad] "Evaluating potential business relationship with Disclosing Party"
```

**⚠️ Important:** Narrow permitted use = stronger protection

---

### 5. **Term and Duration**

**Two Timelines:**

**A. Agreement Term:**
```
This Agreement shall commence on [Date] and continue for [2/3/5] years, 
unless earlier terminated by either party with [30/60/90] days' written notice.
```

**B. Confidentiality Obligation Duration:**
```
Receiving Party's obligations shall survive termination and continue for:
  [Option 1] [3/5] years from date of disclosure
  [Option 2] Indefinitely for information constituting trade secrets
```

**Recommended for Ongea Pesa:**
- Agreement term: 3 years (renewable)
- Confidentiality obligation: 5 years (or indefinite for trade secrets)

---

### 6. **Return or Destruction of Information**

**Upon Termination:**
```
Upon termination or at Disclosing Party's request, Receiving Party shall:
  (a) Return all Confidential Information (documents, files, copies)
  (b) Destroy all copies, notes, and derivatives
  (c) Certify in writing that all materials returned/destroyed
  (d) Exception: May retain one copy for legal compliance (kept confidential)
```

---

### 7. **Remedies**

**Legal Recourse:**
```
Receiving Party acknowledges that:
  (a) Breach may cause irreparable harm to Disclosing Party
  (b) Monetary damages may be inadequate remedy
  (c) Disclosing Party entitled to seek injunctive relief without posting bond
  (d) Disclosing Party entitled to damages, costs, and attorney fees
  (e) Remedies are cumulative (injunction + damages)
```

**Why Important:** Establishes right to emergency court orders (injunctions)

---

### 8. **Governing Law and Jurisdiction**

**For Kenya:**
```
This Agreement shall be governed by the laws of Kenya. 
The parties submit to the exclusive jurisdiction of the courts of Kenya.
```

**For International Parties:**
```
This Agreement shall be governed by the laws of Kenya. 
Disputes shall be resolved by arbitration under [NCIA/ICC] rules in Nairobi, Kenya.
```

---

### 9. **Miscellaneous Clauses**

**Standard Provisions:**
- **Entire Agreement:** NDA supersedes prior discussions
- **Amendment:** Must be in writing, signed by both parties
- **Waiver:** Failure to enforce doesn't waive rights
- **Severability:** Invalid clauses don't invalidate entire agreement
- **No License:** NDA doesn't grant IP rights
- **No Warranty:** Information provided "as is"
- **Counterparts:** Can sign separate copies (valid together)

---

## 🛡️ Implementing Trade Secret Protection

### Comprehensive Protection Program

#### **Phase 1: Identification** (Month 1)

**Action:** Identify all trade secrets

**Process:**
1. Conduct IP audit
2. Interview department heads
3. Review systems and processes
4. Categorize by sensitivity (Critical/High/Medium/Low)
5. Document in trade secret register

**Deliverable:** Trade Secret Inventory

---

#### **Phase 2: Classification** (Month 2)

**Action:** Classify and mark confidential information

**Classification Levels:**

| Level | Examples | Access | Marking |
|-------|----------|--------|---------|
| **Critical** | Encryption keys, customer data | C-suite only | "STRICTLY CONFIDENTIAL" |
| **High** | Source code, pricing models | Department heads | "CONFIDENTIAL" |
| **Medium** | Internal processes, roadmaps | Team members | "INTERNAL USE ONLY" |
| **Low** | General procedures | All employees | "PROPRIETARY" |

**Marking Requirements:**
- Header/footer on documents: "CONFIDENTIAL - ONGEA PESA"
- Watermarks on sensitive documents
- Email subject lines: "[CONFIDENTIAL]"
- File names: "CONFIDENTIAL_filename.pdf"

---

#### **Phase 3: Access Controls** (Month 2-3)

**Technical Controls:**

**1. Physical Security:**
- ✅ Locked server rooms
- ✅ Badge access to offices
- ✅ Visitor logs and escorts
- ✅ Clean desk policy
- ✅ Secure disposal (shredding)

**2. Digital Security:**
- ✅ Role-based access control (RBAC)
- ✅ Multi-factor authentication (MFA)
- ✅ Encryption at rest (AES-256)
- ✅ Encryption in transit (TLS 1.3)
- ✅ VPN for remote access
- ✅ Data loss prevention (DLP) tools
- ✅ Audit logs (who accessed what, when)

**3. Network Security:**
- ✅ Firewall and intrusion detection
- ✅ Segmented networks (dev/prod/admin)
- ✅ Regular security audits
- ✅ Penetration testing

**Access Matrix Example:**

| Information | CEO | CTO | Developers | Finance | HR | Marketing |
|-------------|-----|-----|------------|---------|----|-----------| 
| Source Code | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Customer Data | ✅ | ✅ | ✅ (limited) | ✅ | ❌ | ✅ (limited) |
| Financial Data | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Encryption Keys | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pricing Models | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |

---

#### **Phase 4: Contractual Protection** (Month 3-4)

**Action:** Implement NDAs and confidentiality agreements

**1. Employee Agreements:**
- ✅ All employees sign confidentiality agreement (day 1)
- ✅ Embedded in employment contracts
- ✅ Covers during and post-employment
- ✅ Return of materials clause
- ✅ Non-compete (if appropriate)

**2. Contractor Agreements:**
- ✅ NDA before any work begins
- ✅ Work-for-hire clause (IP assignment)
- ✅ No subcontracting without consent
- ✅ Return of materials upon completion

**3. Vendor Agreements:**
- ✅ NDA before sharing any information
- ✅ Limited access to only necessary information
- ✅ Audit rights
- ✅ Data security requirements

**4. Investor/Advisor Agreements:**
- ✅ NDA before due diligence
- ✅ Use restrictions (evaluation only)
- ✅ No disclosure to third parties
- ✅ Return of materials if deal doesn't close

---

#### **Phase 5: Policies and Procedures** (Month 4-5)

**Action:** Establish formal policies

**1. Confidentiality Policy:**
```
ONGEA PESA CONFIDENTIALITY POLICY

1. Purpose: Protect company trade secrets and confidential information

2. Scope: Applies to all employees, contractors, and third parties

3. Confidential Information Includes:
   - Source code and technical documentation
   - Customer data and transaction records
   - Business plans and financial information
   - Pricing models and partner agreements
   - Any information marked "Confidential"

4. Employee Obligations:
   - Keep confidential information secret
   - Use only for authorized business purposes
   - Do not disclose to unauthorized persons
   - Protect with reasonable security measures
   - Report suspected breaches immediately

5. Permitted Disclosures:
   - To employees with need to know
   - To authorized third parties under NDA
   - As required by law (with notice to Legal)

6. Prohibited Actions:
   - Discussing confidential matters in public
   - Using personal email/devices for confidential data
   - Sharing passwords or access credentials
   - Taking confidential materials home (without approval)
   - Disclosing to competitors or media

7. Consequences of Breach:
   - Disciplinary action (up to termination)
   - Legal action (injunction, damages)
   - Criminal prosecution (if applicable)

8. Questions: Contact legal@ongeapesa.com
```

**2. Data Security Policy:**
- Password requirements (complexity, rotation)
- Device security (encryption, remote wipe)
- Email security (encryption, DLP)
- Cloud storage (approved services only)
- BYOD policy (if applicable)

**3. Incident Response Policy:**
- Breach detection procedures
- Escalation process
- Containment measures
- Notification requirements
- Post-incident review

---

#### **Phase 6: Training and Awareness** (Ongoing)

**Action:** Educate employees on confidentiality obligations

**Training Program:**

**1. Onboarding Training (Day 1):**
- Overview of confidentiality policy
- NDA signing and explanation
- Access controls and security procedures
- Examples of confidential information
- Consequences of breach

**2. Annual Refresher Training:**
- Policy updates
- Case studies (breaches and consequences)
- Best practices
- Q&A session

**3. Role-Specific Training:**
- Developers: Code security, access controls
- Sales/Marketing: Customer data protection
- Finance: Financial data confidentiality
- HR: Employee data privacy

**4. Exit Training:**
- Return of all company materials
- Reminder of post-employment obligations
- Confirmation of confidentiality agreement
- Exit interview

**Training Materials:**
- Presentation slides
- Video tutorials
- Confidentiality handbook
- Quick reference guides
- Acknowledgment forms (signed by employees)

---

#### **Phase 7: Monitoring and Enforcement** (Ongoing)

**Action:** Monitor compliance and enforce violations

**Monitoring Measures:**
- ✅ Access logs review (quarterly)
- ✅ Data loss prevention alerts
- ✅ Employee exit interviews
- ✅ Vendor audits (annual)
- ✅ Security assessments (bi-annual)

**Enforcement Actions:**

**Minor Violations:**
- Verbal warning
- Retraining
- Increased monitoring

**Serious Violations:**
- Written warning
- Suspension
- Termination
- Legal action

**Criminal Violations:**
- Report to police
- Criminal prosecution
- Civil lawsuit

---

## 👥 Employee and Contractor Obligations

### Employment Contracts

**Essential Clauses for Ongea Pesa:**

**1. Confidentiality Clause:**
```
CONFIDENTIALITY

Employee acknowledges that during employment, Employee will have access to 
Confidential Information of Ongea Pesa, including but not limited to source code, 
customer data, business plans, and trade secrets.

Employee agrees to:
(a) Keep all Confidential Information strictly confidential
(b) Not disclose to any third party without prior written authorization
(c) Not use Confidential Information except for Ongea Pesa's business
(d) Protect Confidential Information with reasonable security measures
(e) Return all Confidential Information upon termination

This obligation shall survive termination and continue indefinitely for trade 
secrets, and for five (5) years for other Confidential Information.
```

**2. IP Assignment Clause:**
```
INTELLECTUAL PROPERTY

All works created by Employee during employment, including inventions, 
discoveries, software code, designs, and documentation, shall be works made 
for hire and the exclusive property of Ongea Pesa.

Employee hereby assigns to Ongea Pesa all right, title, and interest in such 
works, including all intellectual property rights.
```

**3. Non-Compete Clause (Optional):**
```
NON-COMPETE

For [12/24] months following termination, Employee shall not:
(a) Work for a direct competitor of Ongea Pesa in Kenya
(b) Solicit Ongea Pesa's customers or employees
(c) Use Confidential Information to compete with Ongea Pesa

This restriction is limited to [Kenya/East Africa] and to [voice payment/fintech] 
industry.
```

**⚠️ Note:** Non-compete clauses must be reasonable in scope, duration, and geography to be enforceable in Kenya.

---

### Contractor Agreements

**Key Differences from Employment:**

**Contractors:**
- ❌ Do NOT automatically assign IP (unlike employees)
- ❌ No implied duty of confidentiality
- ✅ MUST have explicit IP assignment clause
- ✅ MUST have NDA

**Essential Clauses:**

**1. Work-for-Hire and Assignment:**
```
WORK PRODUCT

All work product created by Contractor under this Agreement shall be works 
made for hire. To the extent any work product does not qualify as work made 
for hire, Contractor hereby irrevocably assigns to Ongea Pesa all right, title, 
and interest in such work product, including all intellectual property rights.
```

**2. Confidentiality:**
```
CONFIDENTIALITY

Contractor shall sign Ongea Pesa's standard Non-Disclosure Agreement before 
commencing work. Contractor shall keep all Confidential Information strictly 
confidential during and after the term of this Agreement.
```

**3. No Subcontracting:**
```
NO SUBCONTRACTING

Contractor shall not subcontract any work without Ongea Pesa's prior written 
consent. Any approved subcontractors must sign NDAs and IP assignment agreements.
```

---

### Exit Procedures

**When Employee/Contractor Leaves:**

**Checklist:**
- [ ] Conduct exit interview
- [ ] Remind of confidentiality obligations
- [ ] Collect all company property:
  - [ ] Laptop, phone, tablets
  - [ ] Access cards, keys
  - [ ] Documents, files, USB drives
  - [ ] Proprietary materials
- [ ] Disable access:
  - [ ] Email account
  - [ ] VPN access
  - [ ] Code repositories
  - [ ] Cloud storage
  - [ ] Building access
- [ ] Obtain signed acknowledgment:
  - [ ] Returned all materials
  - [ ] Understands ongoing confidentiality obligations
  - [ ] Will not use/disclose confidential information
- [ ] Provide copy of confidentiality agreement
- [ ] Document exit process

**Exit Acknowledgment Form:**
```
I, [Employee Name], acknowledge that:

1. I have returned all Ongea Pesa property and confidential materials
2. I have not retained any copies of confidential information
3. I understand my confidentiality obligations continue after employment
4. I will not use or disclose Ongea Pesa's confidential information
5. I will not solicit Ongea Pesa's customers or employees [if applicable]

Signed: _________________ Date: _________________
```

---

## 🤝 Third-Party Relationships

### Vendor and Partner NDAs

**Before Engaging Vendor:**

**Step 1: Assess Need for NDA**
- Will vendor access confidential information? → NDA required
- Only public information? → NDA optional

**Step 2: Choose NDA Type**
- Vendor only receives information? → Unilateral NDA
- Both parties share information? → Mutual NDA

**Step 3: Negotiate Terms**
- Definition of confidential information
- Permitted use (specific to engagement)
- Duration (2-5 years)
- Return/destruction obligations
- Liability and remedies

**Step 4: Execute NDA**
- Both parties sign
- Store in vendor file
- Track expiration date

**Step 5: Monitor Compliance**
- Limit access to only necessary information
- Periodic audits (if high-risk vendor)
- Renewal before expiration

---

### Investor NDAs

**Due Diligence Process:**

**Challenge:** Investors want access to sensitive information, but deal may not close

**Solution:** Strong NDA with specific terms

**Key Clauses:**

**1. Purpose Limitation:**
```
Investor may use Confidential Information solely for the purpose of evaluating 
a potential investment in Ongea Pesa. No other use is permitted.
```

**2. No Disclosure to Competitors:**
```
Investor shall not disclose Confidential Information to any party that competes 
with Ongea Pesa without prior written consent.
```

**3. Return if Deal Doesn't Close:**
```
If Investor decides not to proceed with investment, or if Ongea Pesa terminates 
discussions, Investor shall immediately return or destroy all Confidential 
Information.
```

**4. Standstill (Optional):**
```
For [6/12] months after termination of discussions, Investor shall not:
(a) Solicit Ongea Pesa's employees
(b) Compete using Confidential Information
(c) Approach Ongea Pesa's customers or partners
```

**⚠️ Tip:** For high-profile investors, consider virtual data room with access controls and watermarking

---

## ⚖️ Enforcement and Remedies

### Detecting Breaches

**Warning Signs:**

- ✅ Competitor launches similar product shortly after employee leaves
- ✅ Confidential information appears in public (media, websites)
- ✅ Unusual access patterns in logs
- ✅ Employee downloads large amounts of data before leaving
- ✅ Vendor uses information beyond permitted scope
- ✅ Former employee solicits customers

**Investigation Steps:**

1. **Gather Evidence:**
   - Access logs
   - Email records (if legal)
   - Witness statements
   - Public information (competitor websites, press releases)

2. **Assess Breach:**
   - What information was disclosed?
   - Was it truly confidential?
   - Did we take reasonable steps to protect it?
   - Who is responsible?
   - What's the damage?

3. **Consult Legal:**
   - Review NDA and employment contracts
   - Assess legal options
   - Estimate costs vs. benefits

---

### Legal Remedies

**Option 1: Cease and Desist Letter**

**When to Use:** First response, low-cost

**Process:**
1. Draft letter demanding:
   - Immediate cessation of use/disclosure
   - Return/destruction of confidential information
   - Confirmation of compliance
2. Send via email and registered mail
3. Give deadline (7-14 days)
4. Threaten legal action if non-compliance

**Cost:** KES 10,000-30,000 (legal fees)

**Success Rate:** ~50% (many comply to avoid litigation)

---

**Option 2: Injunction (Court Order)**

**When to Use:** Urgent situations, ongoing breach

**Process:**
1. File application for injunction in High Court
2. Demonstrate:
   - Prima facie case (likely to succeed)
   - Irreparable harm (damages inadequate)
   - Balance of convenience (injunction appropriate)
3. Court hearing (expedited)
4. If granted, court orders defendant to stop breach

**Types:**
- **Interim Injunction:** Temporary (until trial)
- **Permanent Injunction:** Final (after trial)

**Cost:** KES 100,000-300,000 (legal fees)

**Timeline:** 2-4 weeks (interim), 1-2 years (permanent)

---

**Option 3: Damages (Compensation)**

**When to Use:** Breach caused financial loss

**Process:**
1. File lawsuit for breach of contract/confidence
2. Prove:
   - Valid NDA or duty of confidentiality
   - Breach occurred
   - Damages suffered
3. Trial
4. If successful, court awards damages

**Types of Damages:**
- **Actual Damages:** Proven financial losses
- **Consequential Damages:** Indirect losses (lost profits)
- **Punitive Damages:** Punishment (rare in Kenya)

**Cost:** KES 300,000-1,000,000+ (legal fees)

**Timeline:** 2-4 years

**⚠️ Challenge:** Difficult to prove exact damages from trade secret theft

---

**Option 4: Account of Profits**

**When to Use:** Defendant profited from breach

**Process:**
- Instead of proving your damages, prove defendant's profits
- Court orders defendant to pay profits made from breach
- Easier than proving actual damages

**Example:**
> Former employee uses customer list to start competing business. Instead of proving lost sales, prove employee's sales using stolen list. Employee must pay those profits to Ongea Pesa.

---

**Option 5: Criminal Prosecution**

**When to Use:** Serious breaches (theft, hacking)

**Applicable Laws:**
- Computer Misuse and Cybercrimes Act (unauthorized access)
- Penal Code (theft, fraud)

**Process:**
1. Report to police
2. Police investigate
3. DPP prosecutes
4. Criminal trial

**Penalties:**
- Fine: Up to KES 5,000,000
- Imprisonment: Up to 10 years
- Or both

**⚠️ Note:** Criminal cases are slow and uncertain. Civil remedies usually more effective.

---

## ✅ Best Practices

### Trade Secret Protection Checklist

**Identification:**
- [ ] Conduct trade secret audit
- [ ] Identify all confidential information
- [ ] Categorize by sensitivity
- [ ] Document in trade secret register

**Classification:**
- [ ] Mark all confidential documents
- [ ] Use classification levels (Critical/High/Medium/Low)
- [ ] Implement marking standards

**Access Controls:**
- [ ] Role-based access control (RBAC)
- [ ] Multi-factor authentication (MFA)
- [ ] Encryption (at rest and in transit)
- [ ] Audit logs
- [ ] Physical security (locked servers)

**Contractual Protection:**
- [ ] NDAs with all employees (day 1)
- [ ] NDAs with all contractors (before work starts)
- [ ] NDAs with vendors (before sharing information)
- [ ] NDAs with investors (before due diligence)
- [ ] IP assignment clauses in all contracts

**Policies:**
- [ ] Confidentiality policy
- [ ] Data security policy
- [ ] Incident response policy
- [ ] Clean desk policy
- [ ] BYOD policy (if applicable)

**Training:**
- [ ] Onboarding training (all new hires)
- [ ] Annual refresher training
- [ ] Role-specific training
- [ ] Exit training

**Monitoring:**
- [ ] Access log reviews (quarterly)
- [ ] Security audits (bi-annual)
- [ ] Vendor audits (annual)
- [ ] Employee exit procedures

**Enforcement:**
- [ ] Breach detection procedures
- [ ] Investigation protocols
- [ ] Legal response plan
- [ ] Relationship with law firm

---

### Common Mistakes to Avoid

❌ **Mistake 1: No NDAs**
- Sharing information without NDA
- ✅ **Fix:** Always get NDA signed first

❌ **Mistake 2: Weak NDAs**
- Vague definition of confidential information
- No remedies clause
- ✅ **Fix:** Use comprehensive NDA template

❌ **Mistake 3: No Access Controls**
- Everyone has access to everything
- ✅ **Fix:** Implement role-based access

❌ **Mistake 4: No Employee Training**
- Employees don't know what's confidential
- ✅ **Fix:** Regular training programs

❌ **Mistake 5: Not Marking Documents**
- No way to prove information was confidential
- ✅ **Fix:** Mark all confidential materials

❌ **Mistake 6: Ignoring Breaches**
- Not investigating or responding
- ✅ **Fix:** Immediate action on suspected breaches

❌ **Mistake 7: Weak Exit Procedures**
- Employees leave with confidential information
- ✅ **Fix:** Comprehensive exit checklist

❌ **Mistake 8: Public Disclosure**
- Discussing confidential matters publicly
- ✅ **Fix:** Confidentiality policy and training

---

## ❓ FAQs

**Q: Do I need an NDA with every employee?**  
A: Yes. While employees have implied duty of confidentiality, explicit NDA is stronger and clearer.

**Q: How long should NDA last?**  
A: 3-5 years for general confidential information; indefinite for trade secrets.

**Q: Can I use a template NDA?**  
A: Yes, but customize for your specific needs. See templates in this documentation.

**Q: What if someone refuses to sign NDA?**  
A: Don't share confidential information. No NDA = no access.

**Q: Are NDAs enforceable in Kenya?**  
A: Yes, if properly drafted and reasonable in scope.

**Q: What's reasonable effort to protect trade secrets?**  
A: NDAs, access controls, encryption, training, marking documents, exit procedures.

**Q: Can I stop an employee from working for a competitor?**  
A: Limited. Non-compete clauses must be reasonable (scope, duration, geography). Cannot prevent employee from using general skills.

**Q: What if confidential information is reverse-engineered?**  
A: No protection. Trade secrets don't protect against independent discovery or reverse engineering.

**Q: Should I patent or keep as trade secret?**  
A: Patent if: novel, want 20-year monopoly, willing to disclose. Trade secret if: not patentable, want indefinite protection, can keep secret.

**Q: What if breach occurs?**  
A: Investigate, send cease and desist, seek injunction, sue for damages.

**Q: How do I prove information was confidential?**  
A: Show: (1) marked as confidential, (2) subject to NDA, (3) access restricted, (4) not public.

**Q: Can I share confidential information with my lawyer?**  
A: Yes, attorney-client privilege protects. But lawyer should sign NDA for extra protection.

---

## 📄 Document Control

**Document Owner:** Legal & Compliance Team  
**Review Frequency:** Quarterly  
**Next Review Date:** May 2026

---

## 🔗 Related Documents

- [00-IP-PROTECTION-MASTER-GUIDE.md](00-IP-PROTECTION-MASTER-GUIDE.md)
- [02-COPYRIGHT-PROTECTION-GUIDE.md](02-COPYRIGHT-PROTECTION-GUIDE.md)
- [06-IP-ENFORCEMENT-MONITORING.md](06-IP-ENFORCEMENT-MONITORING.md)
- [templates/NDA-TEMPLATE-MUTUAL.md](templates/NDA-TEMPLATE-MUTUAL.md)
- [templates/NDA-TEMPLATE-UNILATERAL.md](templates/NDA-TEMPLATE-UNILATERAL.md)

---

**© 2026 Ongea Pesa. All Rights Reserved.**  
**Confidential - Internal Use Only**
