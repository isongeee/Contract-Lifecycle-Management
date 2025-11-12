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
    -   **Amend Existing Contract:** This option is for making changes to the current agreement.
        1.  The `renewal_request` status is set to `in_progress`.
        2.  A **new version** of the *current* contract is automatically created.
        3.  The contract's status is reverted to `In Review`, allowing the owner to edit the new version.
        4.  The user edits the amended version and follows the standard approval workflow (`In Review` -> `Approved` -> `Active`).
        5.  When the amended contract is transitioned back to `Active`, the system automatically updates the associated `renewal_request` status to `activated`, completing the renewal process.
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

**Updated Version (Three-path renewal aware transition function):**
```sql
-- 1) One-time schema patch (safe to re-run)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

-- 2) Three-path renewal aware transition function (improved)
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
  v_new_value numeric;
  v_latest_version_id uuid;
  v_new_version_id uuid;
  v_require_reexec boolean := coalesce((p_payload->>'require_reexecution')::boolean, false);
  v_reason_code text := nullif(p_payload->>'reason_code','');
  v_title_prefix text := coalesce(nullif(p_payload->>'title_prefix',''), '[RENEWAL] ');
  v_parent_id uuid;

  -- locals
  v_action text := btrim(p_action);  -- normalize incoming action text
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Serialize transitions per-contract to avoid cross-session races
  PERFORM pg_advisory_xact_lock(hashtext(p_contract_id::text));

  -- Lock row to avoid races + fetch basic attrs
  SELECT c.status::text, c.company_id, c.app_id, c.owner_id, c.parent_contract_id
    INTO v_current_status_text, v_company_id, v_app_id, v_contract_owner_id, v_parent_id
  FROM public.contracts c
  WHERE c.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract % not found', p_contract_id;
  END IF;

  -- Org/app guard
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_user_id AND u.company_id = v_company_id AND u.app_id = v_app_id
  ) THEN
    RAISE EXCEPTION 'Not authorized for this contract';
  END IF;

  /* =========================
     RENEWAL ENTRY / DECISION
     ========================= */

  IF v_action = 'START_RENEWAL' THEN
    -- Create/ensure a renewal_request exists and is awaiting decision
    -- The user who initiates this is captured in the audit log. The renewal_owner_id is set later.
    INSERT INTO public.renewal_requests (contract_id, status, app_id, company_id, path, decision)
    VALUES (p_contract_id, 'decision_needed', v_app_id, v_company_id, NULL, NULL)
    ON CONFLICT (contract_id) DO UPDATE
      SET status = 'decision_needed', path = NULL, decision = NULL, updated_at = now();

    INSERT INTO public.audit_logs(user_id, company_id, app_id,
      related_entity_type, related_entity_id, change_type, old_value, new_value)
    VALUES (v_user_id, v_company_id, v_app_id,
      'contract', p_contract_id, 'START_RENEWAL', null, coalesce(p_payload::text,'{}'));

    RETURN;
  END IF;

  IF v_action = 'RENEW_DECIDE_TERMINATE' THEN
    UPDATE public.contracts
       SET status = 'Terminated'::contract_status,
           updated_at = now()
     WHERE id = p_contract_id;

    BEGIN
      UPDATE public.renewal_requests
         SET status = 'cancelled',
             decision = 'non_renew',
             reason_code = COALESCE(reason_code, v_reason_code),
             updated_at = now()
       WHERE contract_id = p_contract_id
         AND status IN ('queued','decision_needed','in_progress');
    EXCEPTION WHEN undefined_table THEN NULL;
            WHEN undefined_column THEN NULL;
    END;

    INSERT INTO public.audit_logs(user_id, company_id, app_id,
      related_entity_type, related_entity_id, change_type, old_value, new_value)
    VALUES (v_user_id, v_company_id, v_app_id,
      'contract', p_contract_id, 'RENEW_DECIDE_TERMINATE', null,
      json_build_object('reason_code', v_reason_code)::text);

    RETURN;
  END IF;

  /* =========================
     PATH A: RENEW AS-IS
     ========================= */
  IF v_action = 'RENEW_AS_IS' THEN
    -- Only allow from Active or Expired
    IF v_current_status_text NOT IN ('Active', 'Expired') THEN
      RAISE EXCEPTION 'As-is renewal only allowed from Active or Expired. Current: %', v_current_status_text;
    END IF;

    v_new_start_date := NULLIF(p_payload->>'new_start_date','')::date;
    v_new_end_date   := NULLIF(p_payload->>'new_end_date','')::date;
    v_new_value      := NULLIF(p_payload->>'new_value','')::numeric;

    IF v_new_start_date IS NULL OR v_new_end_date IS NULL OR v_new_end_date <= v_new_start_date OR v_new_value IS NULL THEN
      RAISE EXCEPTION 'Provide valid new_start_date, new_end_date, and new_value';
    END IF;

    -- Find root for overlap check
    WITH RECURSIVE up AS (
      SELECT id, parent_contract_id, effective_date, end_date
      FROM public.contracts
      WHERE id = p_contract_id
      UNION ALL
      SELECT c.id, c.parent_contract_id, c.effective_date, c.end_date
      FROM public.contracts c
      JOIN up ON c.id = up.parent_contract_id
    )
    SELECT id
      INTO v_root_id
    FROM up
    WHERE parent_contract_id IS NULL
    LIMIT 1;

    -- Prevent date overlap within the chain
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

    -- Columns to copy (deterministic order)
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
      INTO v_copy_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'contracts'
      AND column_name NOT IN (
        'id','title','status','effective_date','start_date','end_date','parent_contract_id','value',
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

    -- Create the renewal contract
    v_new_status_text := CASE WHEN v_require_reexec THEN 'Sent for Signature' ELSE 'Active' END;

    -- BUGFIX: correct argument order for %L literal and %s lists
    EXECUTE format(
      'INSERT INTO public.contracts (title, parent_contract_id, %s, status, effective_date, end_date, value, sent_for_signature_at, active_at, executed_at)
       SELECT %L || title, id, %s, $1::contract_status, $2::date, $3::date, $4::numeric,
              CASE WHEN $1::text = ''Sent for Signature'' THEN now() ELSE NULL END,
              CASE WHEN $1::text = ''Active'' THEN now() ELSE NULL END,
              CASE WHEN $1::text = ''Active'' THEN now() ELSE NULL END
       FROM public.contracts WHERE id = $5
       RETURNING id',
      v_copy_cols,            -- %s (column list)
      v_title_prefix,         -- %L (literal prefix)
      v_copy_cols             -- %s (select list)
    )
    INTO v_new_contract_id
    USING v_new_status_text, v_new_start_date, v_new_end_date, v_new_value, p_contract_id;

    -- Copy latest version to new contract (as v1)
    SELECT id
      INTO v_latest_version_id
    FROM public.contract_versions
    WHERE contract_id = p_contract_id
    ORDER BY version_number DESC
    LIMIT 1;

    IF v_latest_version_id IS NOT NULL THEN
      INSERT INTO public.contract_versions (
        contract_id, version_number, author_id, content, file_name,
        value, effective_date, end_date, renewal_date, frequency,
        seasonal_months, property_id, company_id, app_id
      )
      SELECT
        v_new_contract_id, 1, v_user_id, cv.content, cv.file_name,
        v_new_value, v_new_start_date, v_new_end_date, v_new_end_date, cv.frequency,
        cv.seasonal_months, cv.property_id, cv.company_id, cv.app_id
      FROM public.contract_versions cv
      WHERE cv.id = v_latest_version_id
      RETURNING id INTO v_new_version_id;

      -- Attach as executed version (instant path) or draft (re-exec path)
      IF NOT v_require_reexec THEN
        UPDATE public.contracts
           SET executed_version_id = v_new_version_id
         WHERE id = v_new_contract_id;
      ELSE
        UPDATE public.contracts
           SET draft_version_id = v_new_version_id
         WHERE id = v_new_contract_id;
      END IF;
    END IF;

    -- If instant activation, supersede parent now; if re-exec, defer to 'Active' handler
    IF NOT v_require_reexec THEN
      UPDATE public.contracts
         SET status = 'Superseded'::contract_status,
             superseded_at = COALESCE(superseded_at, now()),
             updated_at = now()
       WHERE id = p_contract_id
         AND status <> 'Superseded';
      -- Complete renewal request if any
      BEGIN
        UPDATE public.renewal_requests
           SET status = 'activated', path = COALESCE(path,'as_is'), decision = 'proceed', updated_at = now()
         WHERE contract_id = p_contract_id
           AND status IN ('queued','decision_needed','in_progress');
      EXCEPTION WHEN undefined_table THEN NULL;
              WHEN undefined_column THEN NULL;
      END;
    ELSE
      -- Mark request in progress (waiting on signatures)
      BEGIN
        UPDATE public.renewal_requests
           SET status = 'in_progress', path = COALESCE(path,'as_is'), decision = 'proceed', updated_at = now()
         WHERE contract_id = p_contract_id
           AND status IN ('queued','decision_needed');
      EXCEPTION WHEN undefined_table THEN NULL;
              WHEN undefined_column THEN NULL;
      END;
    END IF;

    INSERT INTO public.audit_logs(user_id, company_id, app_id,
      related_entity_type, related_entity_id, change_type, old_value, new_value)
    VALUES (v_user_id, v_company_id, v_app_id,
      'contract', v_new_contract_id, 'RENEW_AS_IS',
      json_build_object('parent_contract_id', p_contract_id, 'old_status', v_current_status_text)::text,
      json_build_object('effective_date', v_new_start_date, 'end_date', v_new_end_date, 'require_reexecution', v_require_reexec)::text);

    RETURN;
  END IF;

  /* =========================
     PATH B: AMEND (minor changes)
     ========================= */
  IF v_action = 'RENEW_AMEND_START' THEN
    -- Allow from Active or Expired (amend-to-renew)
    IF v_current_status_text NOT IN ('Active','Expired') THEN
      RAISE EXCEPTION 'Amendment renewal only allowed from Active or Expired. Current: %', v_current_status_text;
    END IF;

    -- Create a new draft version by copying latest version with incremented version_number
    SELECT id
      INTO v_latest_version_id
    FROM public.contract_versions
    WHERE contract_id = p_contract_id
    ORDER BY version_number DESC
    LIMIT 1;

    IF v_latest_version_id IS NULL THEN
      -- Start at version 1 if none exists
      v_new_version_id := NULL;
      INSERT INTO public.contract_versions (
        contract_id, version_number, author_id, content, file_name,
        value, effective_date, end_date, renewal_date, frequency,
        seasonal_months, property_id, company_id, app_id
      )
      SELECT
        p_contract_id, 1, v_user_id, NULL, NULL,
        NULL, NULL, NULL, NULL, NULL,
        NULL, NULL, v_company_id, v_app_id
      RETURNING id INTO v_new_version_id;
    ELSE
      INSERT INTO public.contract_versions (
        contract_id, version_number, author_id, content, file_name,
        value, effective_date, end_date, renewal_date, frequency,
        seasonal_months, property_id, company_id, app_id
      )
      SELECT
        cv.contract_id,
        (SELECT COALESCE(MAX(version_number),0)+1 FROM public.contract_versions WHERE contract_id = p_contract_id),
        v_user_id, cv.content, cv.file_name,
        cv.value, cv.effective_date, cv.end_date, cv.renewal_date, cv.frequency,
        cv.seasonal_months, cv.property_id, cv.company_id, cv.app_id
      FROM public.contract_versions cv
      WHERE cv.id = v_latest_version_id
      RETURNING id INTO v_new_version_id;
    END IF;

    UPDATE public.contracts
       SET status = 'In Review'::contract_status,
           review_started_at = now(),
           approval_started_at = null,
           approval_completed_at = null,
           sent_for_signature_at = null,
           executed_at = null,
           active_at = null,
           expired_at = null,
           archived_at = null,
           signing_status = null,
           signing_status_updated_at = null,
           draft_version_id = v_new_version_id,
           updated_at = now()
     WHERE id = p_contract_id;

    BEGIN
      UPDATE public.renewal_requests
         SET status = 'in_progress', path = 'amend', decision = 'proceed', updated_at = now()
       WHERE contract_id = p_contract_id
         AND status IN ('queued','decision_needed');
    EXCEPTION WHEN undefined_table THEN NULL;
            WHEN undefined_column THEN NULL;
    END;

    INSERT INTO public.audit_logs(user_id, company_id, app_id,
      related_entity_type, related_entity_id, change_type, old_value, new_value)
    VALUES (v_user_id, v_company_id, v_app_id,
      'contract', p_contract_id, 'RENEW_AMEND_START', null, coalesce(p_payload::text,'{}'));

    RETURN;
  END IF;

  /* =========================
     PATH C: RENEGOTIATE (new contract)
     ========================= */
  IF v_action = 'RENEW_RENEGOTIATE_START' THEN
    -- Allow from Active or Expired
    IF v_current_status_text NOT IN ('Active','Expired') THEN
      RAISE EXCEPTION 'Renegotiation only allowed from Active or Expired. Current: %', v_current_status_text;
    END IF;

    -- Columns to copy (deterministic order)
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
      INTO v_copy_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'contracts'
      AND column_name NOT IN (
        'id','title','status','effective_date','start_date','end_date','parent_contract_id','value',
        'created_at','updated_at',
        'review_started_at','approval_started_at','approval_completed_at',
        'sent_for_signature_at','executed_at','active_at','expired_at','archived_at',
        'signing_status','signing_status_updated_at',
        'draft_version_id','submitted_at','superseded_at',
        'executed_version_id','signature_provider','signature_envelope_id','signature_status','executed_file_url'
      );

    -- Create a new Draft child contract
    -- BUGFIX: correct argument order for %L literal and %s lists
    EXECUTE format(
      'INSERT INTO public.contracts (title, parent_contract_id, %s, status)
       SELECT %L || title, id, %s, ''Draft''::contract_status
       FROM public.contracts WHERE id = $1
       RETURNING id',
      v_copy_cols,            -- %s (column list)
      v_title_prefix,         -- %L (literal prefix)
      v_copy_cols             -- %s (select list)
    )
    INTO v_new_contract_id
    USING p_contract_id;

    -- Prefill version 1 from latest version (as draft)
    SELECT id
      INTO v_latest_version_id
    FROM public.contract_versions
    WHERE contract_id = p_contract_id
    ORDER BY version_number DESC
    LIMIT 1;

    IF v_latest_version_id IS NOT NULL THEN
      INSERT INTO public.contract_versions (
        contract_id, version_number, author_id, content, file_name,
        value, effective_date, end_date, renewal_date, frequency,
        seasonal_months, property_id, company_id, app_id
      )
      SELECT
        v_new_contract_id, 1, v_user_id, cv.content, cv.file_name,
        cv.value, NULL, NULL, NULL, cv.frequency,
        cv.seasonal_months, cv.property_id, cv.company_id, cv.app_id
      FROM public.contract_versions cv
      WHERE cv.id = v_latest_version_id
      RETURNING id INTO v_new_version_id;

      UPDATE public.contracts
         SET draft_version_id = v_new_version_id
       WHERE id = v_new_contract_id;
    END IF;

    BEGIN
      UPDATE public.renewal_requests
         SET status = 'in_progress', path = 'renegotiate', decision = 'proceed', updated_at = now()
       WHERE contract_id = p_contract_id
         AND status IN ('queued','decision_needed');
    EXCEPTION WHEN undefined_table THEN NULL;
            WHEN undefined_column THEN NULL;
    END;

    INSERT INTO public.audit_logs(user_id, company_id, app_id,
      related_entity_type, related_entity_id, change_type, old_value, new_value)
    VALUES (v_user_id, v_company_id, v_app_id,
      'contract', v_new_contract_id, 'RENEW_RENEGOTIATE_START',
      json_build_object('parent_contract_id', p_contract_id)::text, coalesce(p_payload::text,'{}'));

    RETURN;
  END IF;

  /* =========================
     NORMAL LIFECYCLE (unchanged core with a small hook at 'Active')
     ========================= */
  CASE v_action
    WHEN 'In Review' THEN
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

      -- Clear existing steps
      DELETE FROM public.approval_steps WHERE contract_id = p_contract_id;

      -- Insert unique approvers, scoped to app/company (hardening)
      FOR v_approver_id IN
        SELECT DISTINCT value::uuid
        FROM jsonb_array_elements_text(p_payload->'approvers')
      LOOP
        IF EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = v_approver_id
            AND u.company_id = v_company_id
            AND u.app_id = v_app_id
        ) THEN
          INSERT INTO public.approval_steps(contract_id, approver_id, status, company_id, app_id, version_id)
          VALUES (p_contract_id, v_approver_id, 'Pending', v_company_id, v_app_id, v_draft_version);
        ELSE
          RAISE EXCEPTION 'Approver % not in same app/company', v_approver_id;
        END IF;
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
        AND s.approver_id = v_user_id
        AND s.status = 'Pending';  -- harden against double approvals

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval step % not found for this user/contract or not Pending', v_step_id;
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
        AND s.approver_id = v_user_id
        AND s.status = 'Pending';  -- prevent late rejections

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval step % not found for this user/contract or not Pending', v_step_id;
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
      IF v_current_status_text <> 'Fully Executed' THEN
        RAISE EXCEPTION 'Invalid transition from % to Active', v_current_status_text;
      END IF;

      UPDATE public.contracts
      SET status = 'Active'::contract_status,
          active_at = now(),
          updated_at = now()
      WHERE id = p_contract_id;

      -- If this contract has a parent (As-Is with re-exec OR Renegotiate), supersede parent and complete its request
      PERFORM 1;
      SELECT parent_contract_id INTO v_parent_id FROM public.contracts WHERE id = p_contract_id;
      IF v_parent_id IS NOT NULL THEN
        UPDATE public.contracts
           SET status = 'Superseded'::contract_status,
               superseded_at = COALESCE(superseded_at, now()),
               updated_at = now()
         WHERE id = v_parent_id
           AND status <> 'Superseded';

        BEGIN
          UPDATE public.renewal_requests
             SET status = 'activated', updated_at = now()
           WHERE contract_id = v_parent_id
             AND status IN ('queued','decision_needed','in_progress');
        EXCEPTION WHEN undefined_table THEN NULL;
                WHEN undefined_column THEN NULL;
        END;
      ELSE
        -- Amendment path finishes on same contract
        BEGIN
          UPDATE public.renewal_requests
             SET status = 'activated', updated_at = now()
           WHERE contract_id = p_contract_id
             AND status IN ('in_progress');
        EXCEPTION WHEN undefined_table THEN NULL;
                WHEN undefined_column THEN NULL;
        END;
      END IF;

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
      RAISE EXCEPTION 'Unknown action: %', v_action;
  END CASE;
END;
$$;
```

## 💾 Database Schema Migrations

This section contains important SQL migrations required to keep your database schema up-to-date with the application's logic.

### Add `decision_needed` to `renewal_status` Enum

The application has been updated to use a new `decision_needed` status for renewal requests. The following SQL command must be run in your Supabase SQL Editor to update the `renewal_status` enum type. Failure to do so will result in errors when initiating a contract renewal.

```sql
-- Migration: Add 'decision_needed' to renewal_status enum
-- This migration is required to support the three-path renewal workflow.
-- It adds the new status that a renewal request enters when it's first created.
ALTER TYPE public.renewal_status ADD VALUE 'decision_needed';
```

### Add `updated_at` to `renewal_requests` Table

The application's logic for handling renewals requires tracking when a renewal request was last updated. The following SQL command must be run in your Supabase SQL Editor to add the necessary `updated_at` column and fix errors related to contract transitions.

```sql
-- Migration: Add updated_at to renewal_requests table
-- This is required by the contract_transition function to track updates.
ALTER TABLE public.renewal_requests
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
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