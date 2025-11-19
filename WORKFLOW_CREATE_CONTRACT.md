# New Contract Creation Workflow

This document outlines the end-to-end workflow for creating a new contract within the Enterprise CLM application.

## 1. Initiation

The workflow can be triggered from two entry points:
*   **Contracts Repository:** Clicking the "Create new Contract" button on the main contracts list.
*   **Template Library:** Clicking "Use this template" on a specific template detail page.

**Component:** `CreateContractWorkflow.tsx` is mounted via `AppContext` state (`isCreatingContract`).

## 2. The Wizard Process

The creation process is guided by a 4-step wizard.

### Step 1: Upload Documents (Optional)
*   **User Action:** Can upload an existing PDF, DOCX, or other file representing the contract (e.g., third-party paper).
*   **System Behavior:** Stores the file object in local state temporarily.

### Step 2: Contract Information
*   **User Action:** Enters core metadata:
    *   Title
    *   Counterparty (selected from existing list)
    *   Type (NDA, MSA, SOW, etc.)
    *   Owner (defaults to current user)
    *   Effective & End Dates
    *   Frequency (Monthly, Quarterly, Annually, Seasonal)
    *   Notice Period & Risk Level
*   **AI Feature:** Users can click "Draft with AI". This calls `draftInitialContract` in `geminiService.ts`, which uses the Gemini API to generate a contract draft based on the entered metadata.

### Step 3: Property & Cost Allocation
*   **User Action:** Defines how the contract value is allocated across the organization's properties.
*   **Allocation Types:**
    *   **Single:** Assigned to one specific property.
    *   **Multi-property:** Split across selected properties.
    *   **Portfolio-wide:** Not tied to specific properties (corporate overhead).
*   **Financials:** Users enter the Total Contract Value.
*   **Seasonal Logic:** If Frequency is "Seasonal", the user selects active months, and allocations are broken down by month.

### Step 4: Summary
*   **User Action:** Reviews all entered data.
*   **System Behavior:** Displays a read-only summary view.

## 3. Finalization & Backend Processing

When "Create Contract" is clicked, `handleFinalizeCreate` in `AppContext.tsx` executes the following transactional logic via the Supabase client:

1.  **Insert Contract Record:** Creates a row in the `contracts` table with status `Draft`.
2.  **File Upload:** If a file was uploaded, it is stored in the `contract_documents` storage bucket under `{companyId}/{contractId}/`.
3.  **Create Initial Version:** A record is inserted into `contract_versions` containing:
    *   Version Number: 1
    *   Content: Either the AI-drafted text, user-entered text, or a placeholder.
    *   File Path: Reference to the uploaded file (if any).
    *   Snapshot of financial terms.
4.  **Link Version:** The `contracts` record is updated to set `draft_version_id` to the new version's ID.
5.  **Save Allocations:** Records are inserted into `contract_property_allocations` linking the contract to specific properties and values.

## 4. Post-Creation

1.  **State Update:** The application re-fetches the contract list to include the new entry.
2.  **UI Reset:** The modal closes, and the form state is reset.
3.  **User Feedback:** A success alert is displayed.
