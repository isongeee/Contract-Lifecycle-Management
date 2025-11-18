```json
[
  {
    "schemaname": "cron",
    "tablename": "job",
    "policyname": "cron_job_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(username = CURRENT_USER)",
    "with_check": null
  },
  {
    "schemaname": "cron",
    "tablename": "job_run_details",
    "policyname": "cron_job_run_details_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(username = CURRENT_USER)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "comments",
    "policyname": "Users can delete their own comments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(author_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "comments",
    "policyname": "Users can insert comments on versions within their own company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((author_id = auth.uid()) AND (EXISTS ( SELECT 1\n   FROM users u\n  WHERE ((u.id = auth.uid()) AND (u.company_id = comments.company_id)))))"
  },
  {
    "schemaname": "public",
    "tablename": "comments",
    "policyname": "Users can update their own comments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(author_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "comments",
    "policyname": "Users can view comments within their own company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM users u\n  WHERE ((u.id = auth.uid()) AND (u.company_id = comments.company_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "contract_templates",
    "policyname": "Allow admin users to manage company templates",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "((company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid()))) AND (( SELECT r.name\n   FROM (roles r\n     JOIN users u ON ((r.id = u.role_id)))\n  WHERE (u.id = auth.uid())) = 'Admin'::text))",
    "with_check": "(company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "contract_templates",
    "policyname": "Allow authenticated users to read company templates",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "contracts",
    "policyname": "Allow users to delete contracts in their own company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(company_id = get_my_company_id())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "contracts",
    "policyname": "Allow users to insert contracts into their own company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(company_id = get_my_company_id())"
  },
  {
    "schemaname": "public",
    "tablename": "contracts",
    "policyname": "Allow users to update contracts in their own company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(company_id = get_my_company_id())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "contracts",
    "policyname": "Allow users to view contracts in their company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(company_id = get_my_company_id())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Users can insert notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Users can update their own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = user_id)",
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Users can view their own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "renewal_feedback",
    "policyname": "Allow read access to users in the same company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(company_id IN ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "renewal_feedback",
    "policyname": "Allow users to delete their own feedback",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "renewal_feedback",
    "policyname": "Allow users to insert their own feedback",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(user_id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "renewal_feedback",
    "policyname": "Allow users to update their own feedback",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "policyname": "Allow users to delete their own custom reports",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "((owner_id = auth.uid()) AND (is_prebuilt = false))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "policyname": "Allow users to insert their own reports",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid()))) AND (owner_id = auth.uid()))"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "policyname": "Allow users to update their own reports",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(owner_id = auth.uid())",
    "with_check": "(owner_id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "reports",
    "policyname": "Allow users to view reports in their company",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(company_id = ( SELECT users.company_id\n   FROM users\n  WHERE (users.id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_notification_settings",
    "policyname": "Users can update their own settings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_notification_settings",
    "policyname": "Users can view their own settings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow company members to delete files",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'contract-documents'::text) AND ((storage.foldername(name))[1] = ( SELECT (users.company_id)::text AS company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow company members to update files",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'contract-documents'::text) AND ((storage.foldername(name))[1] = ( SELECT (users.company_id)::text AS company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow company members to upload files",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'contract-documents'::text) AND ((storage.foldername(name))[1] = ( SELECT (users.company_id)::text AS company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow company members to view files",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((bucket_id = 'contract-documents'::text) AND ((storage.foldername(name))[1] = ( SELECT (users.company_id)::text AS company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow deletes for own company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'contract-documents'::text) AND ((storage.foldername(name))[1] = ( SELECT (users.company_id)::text AS company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow updates for own company",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'contract-documents'::text) AND ((storage.foldername(name))[1] = ( SELECT (users.company_id)::text AS company_id\n   FROM users\n  WHERE (users.id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Avatar Update Policy",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'avatars'::text) AND (auth.uid() = ((storage.foldername(name))[2])::uuid))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Avatar Upload Policy",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'avatars'::text) AND (auth.uid() = ((storage.foldername(name))[2])::uuid))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Public Read Access",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'avatars'::text)",
    "with_check": null
  }
]
```