import { supabase } from '@/lib/supabaseClient';

export async function listContracts() {
  return supabase
    .from('contracts')
    .select(`
      id, title, type, status, value, updated_at,
      counterparty:counterparty_id ( id, name, type ),
      property:property_id ( id, name )
    `)
    .order('updated_at', { ascending: false });
}

export async function createContract(input: {
  title: string;
  type: 'NDA'|'MSA'|'SOW'|'Vendor'|'Employment'|'Lease'|'SaaS'|'Other';
  status: 'Draft'|'In Review'|'Pending Approval'|'Approved'|'Active'|'Expired'|'Terminated'|'Archived';
  risk_level: 'Low'|'Medium'|'High'|'Critical';
  counterparty_id?: string | null;
  property_id?: string | null;
  value?: number | null;
}) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not signed in');
  return supabase.from('contracts').insert([{
    ...input,
    owner_id: user.id,
  }]).select().single();
}

export async function listVersions(contract_id: string) {
  return supabase.from('contract_versions').select('*').eq('contract_id', contract_id).order('version_number', { ascending: false });
}

export async function addVersion(contract_id: string, content: string) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not signed in');
  const { data: versions } = await listVersions(contract_id);
  const next = (versions?.[0]?.version_number ?? 0) + 1;
  return supabase.from('contract_versions').insert([{
    contract_id, version_number: next, author_id: user.id, content
  }]);
}

export async function listApprovals(contract_id: string) {
  return supabase
    .from('approval_steps')
    .select(`id, status, comment, approved_at, approver:approver_id ( id, email )`)
    .eq('contract_id', contract_id);
}

export async function approveStep(step_id: string) {
  return supabase
    .from('approval_steps')
    .update({ status: 'Approved', approved_at: new Date().toISOString() })
    .eq('id', step_id);
}
