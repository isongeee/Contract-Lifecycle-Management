# Enterprise Contract Lifecycle Management (CLM)

A comprehensive, enterprise-grade Contract Lifecycle Management (CLM) system built with React, Tailwind CSS, and powered by the Gemini API for intelligent document analysis and drafting. This application provides a robust platform for managing the entire lifecycle of contracts, from creation and negotiation to renewal and termination.

## ✨ Key Features

- **Centralized Dashboard:** Get an at-a-glance overview of your contract portfolio, including active value, high-risk agreements, and pending action items.
- **Contract Repository:** A filterable and searchable central database for all organizational contracts.
- **Lifecycle Management:** Track contracts through every stage: `Draft`, `In Review`, `Pending Approval`, `Active`, `Expired`, `Superseded`, and more.
- **Renewal Hub:** Proactively manage upcoming renewals with a dedicated queue, calendar, and overview dashboard.
- **Approval Workflows:** Define and manage multi-step approval processes for new contracts and amendments.
- **E-Signature Tracking:** Monitor the signing status of contracts sent for execution.
- **Gemini AI Integration:**
    - **Risk Analysis:** Automatically summarize potential risks in contract documents.
    - **Clause Extraction:** Identify and extract key clauses for quick review.
    - **Performance Summary:** Generate summaries of KPIs and obligations.
    - **Drafting Assistance:** Generate renewal drafts based on previous versions and user prompts.
- **Entity Management:** Maintain separate repositories for counterparties (vendors, customers) and properties.
- **Template Library:** Create new contracts quickly using pre-approved templates.
- **Role-Based Access Control (RBAC):** Granular permissions system to control user access and actions.
- **Multi-Tenancy:** Supports multiple organizations, each with its own users, roles, and data.

## 🛠️ Tech Stack

-   **Frontend:** React, TypeScript, Tailwind CSS
-   **Backend & Database:** Supabase (PostgreSQL, Authentication, Edge Functions)
-   **AI Integration:** Google Gemini API via `@google/genai`

## 🗄️ Database Schema Overview

The application is powered by a Supabase backend with a relational schema designed to support complex CLM workflows.

-   `contracts`: The central table holding all core contract information, including status, value, dates, and relationships. It includes a `parent_contract_id` to link renewal contracts to their predecessors.
-   `contract_versions`: Stores the complete text and metadata for each version of a contract, enabling a full audit trail.
-   `renewal_requests`: A dedicated table to manage the renewal process for a contract, tracking its status (`queued`, `in_progress`, `activated`) and the chosen decision (`renew_as_is`, `amendment`, `new_contract`, `terminate`).
-   `approval_steps`: Tracks the multi-step approval workflow for each contract version.
-   `companies`, `users`, `roles`: Manages multi-tenancy, user authentication, and permissions.
-   `counterparties`, `properties`: Stores information about the external entities and physical locations associated with contracts.

## 🚀 Key Workflows

### Contract Creation & Approval

1.  A user initiates a new contract, either from a template or through a guided workflow.
2.  The contract is created in `Draft` status.
3.  The owner submits it for review, moving it to `In Review`. At this stage, new versions can be created to incorporate redlines.
4.  Once finalized, the owner requests approval, selecting one or more approvers. The contract moves to `Pending Approval`.
5.  Approvers are notified and can approve or reject the contract. If rejected, it returns to `In Review`.
6.  Once all approvals are gathered, the status becomes `Approved`.
7.  The contract can then be `Sent for Signature` and finally marked as `Fully Executed`.
8.  On its effective date, it becomes `Active`.

### Renewal Process

This workflow ensures a clear and auditable trail for all contract renewals.

1.  **Initiation:** When an `Active` contract nears its end date (e.g., within 90 days), a `renewal_request` record is automatically created with a status of `queued`.
2.  **Decision:** The contract owner is prompted to make a decision via the "Renewal Decision Support" modal. The options are:
    -   **Renew As-Is:** The contract's end date and value are updated according to predefined terms. The renewal is marked as `activated`.
    -   **Amend Existing Contract:** The contract status is reverted to `In Review` to allow for the creation of an amended version.
    -   **Terminate Contract:** The contract is moved to the `Terminated` status.
    -   **Renegotiate (New Contract):** This triggers a specific, robust workflow:
        -   A **brand new contract** is created in `Draft` status.
        -   The new draft is pre-populated with data from the original contract (e.g., counterparty, terms). Its title is prefixed with `[RENEWAL]`.
        -   The new contract is linked to the original via the `parent_contract_id` field.
        -   The user is redirected to this new draft to begin the standard negotiation and approval lifecycle.
3.  **Activation & Superseding:** When the newly created renewal contract becomes `Active`, a trigger automatically updates the original parent contract's status to `Superseded`. This maintains a clean contract history, clearly showing which agreement has replaced the old one.

---
This README provides a high-level overview of the application's functionality, architecture, and core processes as of the current version.
