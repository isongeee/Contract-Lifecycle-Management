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
  v_end_date date;

  -- locals
  v_action text := btrim(p_action);  -- normalize incoming action text
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Serialize transitions per-contract to avoid cross-session races
  PERFORM pg_advisory_xact_lock(hashtext(p_contract_id::text));

  -- Lock row to avoid races + fetch basic attrs
  SELECT c.status::text, c.company_id, c.app_id, c.owner_id, c.parent_contract_id, c.end_date
    INTO v_current_status_text, v_company_id, v_app_id, v_contract_owner_id, v_parent_id, v_end_date
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
         AND status IN ('decision_needed','in_progress');
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
           AND status IN ('decision_needed','in_progress');
      EXCEPTION WHEN undefined_table THEN NULL;
              WHEN undefined_column THEN NULL;
      END;
    ELSE
      -- Mark request in progress (waiting on signatures)
      BEGIN
        UPDATE public.renewal_requests
           SET status = 'in_progress', path = COALESCE(path,'as_is'), decision = 'proceed', updated_at = now()
         WHERE contract_id = p_contract_id
           AND status IN ('decision_needed');
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
         AND status IN ('decision_needed');
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
         AND status IN ('decision_needed');
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
      
      -- Check if the contract is already past its end date.
      IF v_end_date < current_date THEN
        -- If end date is in the past, expire it immediately instead of activating.
        UPDATE public.contracts
        SET status = 'Expired'::contract_status,
            expired_at = now(),
            updated_at = now()
        WHERE id = p_contract_id;
      ELSE
        -- Otherwise, proceed with activation.
        UPDATE public.contracts
        SET status = 'Active'::contract_status,
            active_at = now(),
            updated_at = now()
        WHERE id = p_contract_id;

        -- If this contract has a parent (As-Is with re-exec OR Renegotiate), supersede parent and complete its request
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
               AND status IN ('decision_needed','in_progress');
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
