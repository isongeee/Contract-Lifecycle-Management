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

## 💾 Database Functions

This section contains important SQL functions required for the application's logic. Ensure these are up-to-date in your Supabase project.

### `contract_transition`

This function handles all contract status changes and related logic, such as creating approval steps or superseding parent contracts.

**Corrected Version (fixes renewal status bug):**
```sql
-- 1) One-time schema patch (safe to re-run)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

-- 2) Function with corrected As-is renewal flow
CREATE OR REPLACE FUNCTION public.contract_transition(
  p_contract_id uuid,
  p_action text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_app_id uuid;
  v_contract_owner_id uuid;
  v_current_status_text text;
  v_step_id uuid;
  v_all_approved boolean;
  v_draft_version uuid;
  v_approver_id uuid;

  -- Renewal vars
  v_new_start_date date;
  v_new_end_date date;
  v_new_contract_id uuid;
  v_copy_cols text;
  v_new_status_text text;
  v_root_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lock row to avoid race conditions and get owner_id
  SELECT c.status::text, c.company_id, c.app_id, c.owner_id
    INTO v_current_status_text, v_company_id, v_app_id, v_contract_owner_id
  FROM public.contracts c
  WHERE c.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract % not found', p_contract_id;
  END IF;

  -- Basic org/app guard
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_user_id AND u.company_id = v_company_id AND u.app_id = v_app_id
  ) THEN
    RAISE EXCEPTION 'Not authorized for this contract';
  END IF;

  -- ========= Helper: As-is Renewal (Expired -> new [RENEWAL] + parent link + supersede old) =========
  PERFORM 1; -- no-op to reset FOUND cleanly
  IF p_action = 'RENEW_AS_IS'
     OR (p_action = 'Active' AND coalesce(p_payload->>'decision','') ILIKE 'as-is renewal')
  THEN
    -- Only allow as-is renewal from EXPIRED
    IF v_current_status_text <> 'Expired' THEN
      RAISE EXCEPTION 'As-is renewal only allowed from Expired status. Current: %', v_current_status_text;
    END IF;

    v_new_start_date := NULLIF(p_payload->>'new_start_date','')::date;
    v_new_end_date   := NULLIF(p_payload->>'new_end_date','')::date;

    IF v_new_start_date IS NULL OR v_new_end_date IS NULL OR v_new_end_date <= v_new_start_date THEN
      RAISE EXCEPTION 'Provide valid new_start_date and new_end_date';
    END IF;

    -- Find root of the chain for overlap checking
    WITH RECURSIVE up AS (
      SELECT id, parent_contract_id
      FROM public.contracts
      WHERE id = p_contract_id
      UNION ALL
      SELECT c.id, c.parent_contract_id
      FROM public.contracts c
      JOIN up ON c.id = up.parent_contract_id
    )
    SELECT id
      INTO v_root_id
    FROM up
    WHERE parent_contract_id IS NULL
    LIMIT 1;

    -- Prevent date overlap with any contract in the chain (root + descendants) using effective_date
    IF EXISTS (
      WITH RECURSIVE down AS (
        SELECT id, parent_contract_id, effective_date, end_date
        FROM public.contracts
        WHERE id = COALESCE(v_root_id, p_contract_id)
        UNION ALL
        SELECT c.id, c.parent_contract_id, c.effective_date, c.end_date
        FROM public.contracts c
        JOIN down d ON c.parent_contract_id = d.id
      )
      SELECT 1
      FROM down
      WHERE effective_date IS NOT NULL
        AND end_date     IS NOT NULL
        AND daterange(effective_date, end_date, '[]')
            && daterange(v_new_start_date, v_new_end_date, '[]')
    ) THEN
      RAISE EXCEPTION 'New term overlaps an existing term in the renewal chain.';
    END IF;

    -- Build list of columns to copy (exclude lifecycle/workflow/signature pointers and dates/title/parent)
    SELECT string_agg(quote_ident(column_name), ', ')
      INTO v_copy_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'contracts'
      AND column_name NOT IN (
        'id','title','status','effective_date','start_date','end_date','parent_contract_id',
        'created_at','updated_at',
        'review_started_at','approval_started_at','approval_completed_at',
        'sent_for_signature_at','executed_at','active_at','expired_at','archived_at',
        'signing_status','signing_status_updated_at',
        'draft_version_id','submitted_at','superseded_at',
        'executed_version_id','signature_provider','signature_envelope_id','signature_status','executed_file_url'
      );

    IF v_copy_cols IS NULL THEN
      RAISE EXCEPTION 'Could not resolve columns to copy for contracts table';
    END IF;

    -- New renewal starts in workflow, not auto-Active
    v_new_status_text := 'In Review';

    -- Insert the new contract by copying business fields, overriding status/dates/title, and linking parent
    EXECUTE format(
      'INSERT INTO public.contracts (title, parent_contract_id, %s, status, effective_date, end_date)
       SELECT ''[RENEWAL] '' || title, id, %s, $1::contract_status, $2::date, $3::date
       FROM public.contracts WHERE id = $4
       RETURNING id',
      v_copy_cols, v_copy_cols
    )
    INTO v_new_contract_id
    USING v_new_status_text, v_new_start_date, v_new_end_date, p_contract_id;

    -- Reset lifecycle/signing pointers on the new renewal & mark review started
    UPDATE public.contracts
       SET review_started_at = now(),
           approval_started_at = NULL,
           approval_completed_at = NULL,
           sent_for_signature_at = NULL,
           executed_at = NULL,
           active_at = NULL,
           expired_at = NULL,
           archived_at = NULL,
           signing_status = NULL,
           signing_status_updated_at = NULL,
           draft_version_id = NULL,
           executed_version_id = NULL,
           signature_provider = NULL,
           signature_envelope_id = NULL,
           signature_status = NULL,
           executed_file_url = NULL,
           updated_at = now()
     WHERE id = v_new_contract_id;

    -- Supersede the old EXPIRED contract and stamp timestamp
    UPDATE public.contracts
       SET status = 'Superseded'::contract_status,
           superseded_at = COALESCE(superseded_at, now()),
           updated_at = now()
     WHERE id = p_contract_id
       AND status <> 'Superseded';

    -- Audit log
    INSERT INTO public.audit_logs(
      user_id, company_id, app_id,
      related_entity_type, related_entity_id,
      change_type, old_value, new_value
    )
    VALUES (
      v_user_id, v_company_id, v_app_id,
      'contract', v_new_contract_id,
      'RENEW_AS_IS',
      json_build_object('parent_contract_id', p_contract_id, 'old_status', v_current_status_text)::text,
      json_build_object('effective_date', v_new_start_date, 'end_date', v_new_end_date)::text
    );

    RETURN; -- Renewal path complete
  END IF;
  -- ========= End Helper =========

  -- ========= Normal lifecycle transitions =========
  CASE p_action
    WHEN 'In Review' THEN
      -- Allow transition from Draft, Active, Expired (e.g., amendments)
      IF v_current_status_text NOT IN ('Draft', 'Active', 'Expired') THEN
        RAISE EXCEPTION 'Invalid transition from % to In Review', v_current_status_text;
      END IF;

      UPDATE public.contracts
      SET status = 'In Review'::contract_status,
          review_started_at = now(),
          updated_at = now(),
          approval_started_at = null,
          approval_completed_at = null,
          sent_for_signature_at = null,
          executed_at = null,
          active_at = null,
          expired_at = null,
          archived_at = null,
          signing_status = null,
          signing_status_updated_at = null,
          submitted_at = COALESCE(submitted_at, now())
      WHERE id = p_contract_id;

    WHEN 'Pending Approval' THEN
      IF v_current_status_text <> 'In Review' THEN
        RAISE EXCEPTION 'Invalid transition from % to Pending Approval', v_current_status_text;
      END IF;

      v_draft_version := NULLIF(p_payload->>'draft_version_id','')::uuid;
      IF v_draft_version IS NULL
         OR jsonb_typeof(p_payload->'approvers') <> 'array'
         OR jsonb_array_length(p_payload->'approvers') = 0 THEN
        RAISE EXCEPTION 'Provide draft_version_id and a non-empty approvers[]';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.contract_versions v
        WHERE v.id = v_draft_version AND v.contract_id = p_contract_id
      ) THEN
        RAISE EXCEPTION 'Version % does not belong to contract %', v_draft_version, p_contract_id;
      END IF;

      UPDATE public.contracts
      SET status = 'Pending Approval'::contract_status,
          approval_started_at = now(),
          draft_version_id = v_draft_version,
          updated_at = now()
      WHERE id = p_contract_id;

      DELETE FROM public.approval_steps WHERE contract_id = p_contract_id;

      FOR v_approver_id IN
        SELECT value::uuid FROM jsonb_array_elements_text(p_payload->'approvers')
      LOOP
        INSERT INTO public.approval_steps(contract_id, approver_id, status, company_id, app_id, version_id)
        VALUES (p_contract_id, v_approver_id, 'Pending', v_company_id, v_app_id, v_draft_version);
      END LOOP;

    WHEN 'APPROVE_STEP' THEN
      IF v_current_status_text <> 'Pending Approval' THEN
        RAISE EXCEPTION 'Cannot approve step when contract status is %', v_current_status_text;
      END IF;

      v_step_id := NULLIF(p_payload->>'stepId','')::uuid;
      IF v_step_id IS NULL THEN
        RAISE EXCEPTION 'Missing stepId';
      END IF;

      UPDATE public.approval_steps s
      SET status = 'Approved',
          approved_at = now()
      WHERE s.id = v_step_id
        AND s.contract_id = p_contract_id
        AND s.approver_id = v_user_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval step % not found for this user/contract', v_step_id;
      END IF;

      SELECT COALESCE(bool_and(s.status = 'Approved'), false)
        INTO v_all_approved
      FROM public.approval_steps s
      WHERE s.contract_id = p_contract_id;

      IF v_all_approved THEN
        UPDATE public.contracts
        SET status = 'Approved'::contract_status,
            approval_completed_at = now(),
            updated_at = now()
        WHERE id = p_contract_id;
      END IF;

    WHEN 'REJECT_STEP' THEN
      IF v_current_status_text <> 'Pending Approval' THEN
        RAISE EXCEPTION 'Cannot reject step when contract status is %', v_current_status_text;
      END IF;

      v_step_id := NULLIF(p_payload->>'stepId','')::uuid;
      IF v_step_id IS NULL THEN
        RAISE EXCEPTION 'Missing stepId';
      END IF;

      UPDATE public.approval_steps s
      SET status = 'Rejected'
      WHERE s.id = v_step_id
        AND s.contract_id = p_contract_id
        AND s.approver_id = v_user_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval step % not found for this user/contract', v_step_id;
      END IF;

      UPDATE public.contracts
      SET status = 'In Review'::contract_status,
          updated_at = now(),
          approval_started_at = null,
          approval_completed_at = null,
          sent_for_signature_at = null,
          executed_at = null,
          active_at = null,
          signing_status = null,
          signing_status_updated_at = null
      WHERE id = p_contract_id;

    WHEN 'Sent for Signature' THEN
      IF v_current_status_text <> 'Approved' THEN
        RAISE EXCEPTION 'Invalid transition from % to Sent for Signature', v_current_status_text;
      END IF;

      UPDATE public.contracts
      SET status = 'Sent for Signature'::contract_status,
          sent_for_signature_at = now(),
          signing_status = nullif(p_payload->>'signing_status','')::signing_status,
          signing_status_updated_at = now(),
          updated_at = now()
      WHERE id = p_contract_id;

    WHEN 'Fully Executed' THEN
      IF v_current_status_text <> 'Sent for Signature' THEN
        RAISE EXCEPTION 'Invalid transition from % to Fully Executed', v_current_status_text;
      END IF;

      UPDATE public.contracts
      SET status = 'Fully Executed'::contract_status,
          executed_at = now(),
          signing_status = null,
          signing_status_updated_at = now(),
          updated_at = now()
      WHERE id = p_contract_id;

    WHEN 'Active' THEN
      -- Normal activation (not the renewal shortcut)
      IF v_current_status_text <> 'Fully Executed' THEN
        RAISE EXCEPTION 'Invalid transition from % to Active', v_current_status_text;
      END IF;

      UPDATE public.contracts
      SET status = 'Active'::contract_status,
          active_at = now(),
          updated_at = now()
      WHERE id = p_contract_id;

    WHEN 'Expired' THEN
      IF v_current_status_text <> 'Active' THEN
        RAISE EXCEPTION 'Invalid transition from % to Expired', v_current_status_text;
      END IF;

      UPDATE public.contracts
      SET status = 'Expired'::contract_status,
          expired_at = now(),
          updated_at = now()
      WHERE id = p_contract_id;

    WHEN 'Terminated' THEN
      UPDATE public.contracts
      SET status = 'Terminated'::contract_status,
          updated_at = now()
      WHERE id = p_contract_id;

    WHEN 'Archived' THEN
      UPDATE public.contracts
      SET status = 'Archived'::contract_status,
          archived_at = now(),
          updated_at = now()
      WHERE id = p_contract_id;

    ELSE
      RAISE EXCEPTION 'Unknown action: %', p_action;
  END CASE;
END;
$$;
```

## Scheduled Jobs

To ensure the system stays up-to-date automatically, certain backend functions are designed to be run on a schedule (e.g., using Supabase's cron job scheduler).

### `update-expired-contracts`

This job runs daily to automatically transition contracts from `Active` to `Expired`.

-   **Frequency:** Recommended to run once per day (e.g., at midnight UTC using the cron expression `0 0 * * *`).
-   **Action:** Queries for all contracts where `status = 'Active'` and the `end_date` is in the past.
-   **Result:** Updates the status of found contracts to `Expired` and sets the `expired_at` timestamp.

### `send-renewal-reminders`

This job runs daily to automatically create notifications for users about contracts that are nearing their expiration date, based on each user's personal notification settings.

-   **Frequency:** Recommended to run once per day (e.g., at 1 AM UTC using the cron expression `0 1 * * *`).
-   **Action:**
    1.  Fetches all user notification settings from the `user_notification_settings` table.
    2.  For each user, it identifies which active contracts are expiring on the specific days they've configured for reminders (e.g., 90, 60, 30 days before).
    3.  Checks if the user has enabled in-app notifications for renewals in their preferences.
-   **Result:** Inserts records into the `notifications` table for each user and matching contract. These notifications then appear in the user's in-app notification panel in real-time.

---
This README provides a high-level overview of the application's functionality, architecture, and core processes as of the current version.