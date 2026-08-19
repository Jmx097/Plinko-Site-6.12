import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
async function source(path) { return readFile(new URL(path, root), 'utf8'); }

test('shared CRM integration is server-only and writes require signed actor assertions', async () => {
  const integration = await source('lib/crm-api.mjs');
  assert.match(integration, /import 'server-only'/);
  assert.match(integration, /CRM_API_BASE_URL/);
  assert.match(integration, /CRM_API_TOKEN/);
  assert.match(integration, /CRM_ACTOR_SIGNING_SECRET/);
  assert.match(integration, /crmActorSigningHeaders/);
  assert.doesNotMatch(integration, /NEXT_PUBLIC_CRM|x-crm-actor-email/);
});

test('legacy admin CRM routes redirect into the shared workspace', async () => {
  for (const path of ['app/admin/crm/page.jsx', 'app/admin/crm/workspace/page.jsx']) {
    assert.match(await source(path), /redirect\('\/crm'\)/);
  }
});

test('CRM presents an Espo-style operator shell with account-first detail work', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  assert.match(client, /\['My Work', 'Accounts', 'Contacts', 'Leads', 'Opportunities', 'Tasks', 'Calendar', 'Calls', 'Meetings', 'Emails', 'Email Templates', 'Documents', 'Knowledge Base', 'Campaigns', 'Target Lists', 'Activities', 'Reports', 'Dashboards', 'Administration'\]/);
  assert.match(client, /Search accounts/);
  assert.match(client, /This week/);
  assert.match(client, /Next action/);
  assert.match(client, /\['Overview', 'Activity', 'People', 'Tasks', 'Campaigns', 'Opportunities', 'Details'\]/);
  assert.match(client, /ActivityComposer/);
  assert.match(client, /Add note/);
  assert.match(client, /Create task/);
  assert.match(client, /Complete/);
  assert.match(client, /Account details/);
  assert.match(client, /Source evidence/);
  assert.match(client, /Back to account home/);
  assert.match(client, /New account/);
  assert.match(client, /Campaign memberships/);
  assert.match(client, /Opportunity views mirror account qualification context/);
  assert.doesNotMatch(client, /Governed workflow|Governance gate|crm-governance-banner/);
  assert.doesNotMatch(client, /person\.id|person\.contact_id|account\.id/);
});

test('CRM shell keeps module, record, tab, and directory search state in browser URLs', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const styles = await source('app/globals.css');
  assert.match(client, /function routeFromLocation\(\)/);
  assert.match(client, /window\.history\[mode === 'replace' \? 'replaceState' : 'pushState'\]/);
  assert.match(client, /window\.addEventListener\('popstate', applyRoute\)/);
  assert.match(client, /params\.set\('record', selected\.key\)/);
  assert.match(client, /params\.set\('tab', tab\)/);
  assert.match(client, /writeRoute\(\{ module: 'Accounts', search: next \}, 'replace'\)/);
  assert.match(client, /writeRoute\(\{ module: 'Campaigns', search: next \}, 'replace'\)/);
  assert.match(client, /Global search/);
  assert.match(client, /Search every CRM record/);
  assert.match(client, /\+ Create/);
  assert.match(client, /Notifications/);
  assert.match(client, /Open user menu/);
  assert.match(styles, /\.crm-global-search/);
  assert.match(styles, /\.crm-topbar-actions/);
  assert.match(styles, /@media \(max-width:560px\).*\.crm-global-search/s);
});

test('workspace API exposes opaque handles and resolves account/task IDs only on the server', async () => {
  const route = await source('app/api/crm/workspace/route.js');
  const broker = await source('lib/crm-workspace.mjs');
  const integration = await source('lib/crm-api.mjs');
  assert.match(route, /HANDLE_PATTERN/);
  assert.match(route, /requiredHandle\(payload, 'accountKey', 'account'\)/);
  assert.match(route, /case 'create_account': return \{ displayName:/);
  assert.match(route, /crmWorkspaceAction\('create_account', \{ source: 'manual', display_name: payload\.displayName, external_reference: payload\.reference \}/);
  assert.match(route, /hasCrmRecordHandle\('account', item\.id, accountKey/);
  // A task handle is scoped to the selected account, not merely signed by kind.
  assert.match(route, /hasCrmRecordHandle\('task', `\$\{account\.id\}:\$\{item\.id\}`, payload\.taskKey/);
  assert.match(route, /MAX_DIRECTORY_PAGES = 20/);
  assert.match(route, /seenCursors/);
  assert.match(route, /content: \{ body: safe\(draft\.content\?\.body, ''\) \}/);
  assert.doesNotMatch(route, /external_reference \|\| account\.externalReference/);
  assert.match(broker, /account_workspace: \{ method: 'GET', path: \(p\) => `\/crm\/accounts\/\$\{encodeURIComponent\(p\.account_id\)\}\/workspace` \}/);
  assert.match(broker, /create_note: \{ method: 'POST'.*\/notes/s);
  assert.match(broker, /create_task: \{ method: 'POST'.*\/tasks/s);
  assert.match(broker, /complete_task: \{ method: 'POST'.*\/complete/s);
  assert.match(integration, /createHmac/);
  assert.match(integration, /timingSafeEqual/);
});

test('campaign lifecycle decisions use backend values while keeping human approval controls', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');
  const broker = await source('lib/crm-workspace.mjs');

  assert.match(route, /DECISIONS = new Set\(\['approved', 'rejected'\]\)/);
  assert.match(client, /Approve contact/);
  assert.match(client, /Reject contact/);
  assert.match(client, /contact_approval', \{ accountKey, contactKey: person\.key, decision: 'approved'/);
  assert.match(client, /contact_approval', \{ accountKey, contactKey: person\.key, decision: 'rejected'/);
  assert.match(client, /Approve account/);
  assert.match(client, /Account status decision/);
  assert.match(client, /draft_approval'.*decision: 'approved'/);
  assert.match(client, /attempt_approval'.*decision: 'rejected'/);
  assert.doesNotMatch(client, /decision: 'approve'/);
  assert.doesNotMatch(client, /decision: 'reject'/);
  assert.match(broker, /contact_approval: \{ method: 'POST'.*\/approval/s);
  assert.doesNotMatch(broker, /send|dial|provider.*send/i);
});

test('contact and account review actions stay scoped to opaque browser handles', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');

  assert.match(route, /requiredHandle\(payload, 'contactKey', 'contact'\)/);
  assert.match(route, /hasCrmRecordHandle\('contact', item\.id, payload\.contactKey, config\)/);
  assert.match(route, /create_account_approval', \{ account_id: account\.id, gate: 'intake', decision: payload\.decision \}/);
  assert.doesNotMatch(client, /person\.id|person\.contact_id|account\.id/);
  assert.doesNotMatch(client, /command\('(send|dispatch|export|dial|schedule|enrich|mailbox_sync)/i);
});

test('Contacts directory and record show account linkage, suppression, activities, and approved campaign context without a send path', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');

  assert.match(client, /const CONTACT_TABS = \['Overview', 'Activities', 'Campaign memberships'\]/);
  assert.match(client, /Search contacts/);
  assert.match(client, /Consent \/ suppression/);
  assert.match(client, /open\('contact', person\.key\)/);
  assert.match(client, /function ContactRecord\(/);
  assert.match(client, /Account approval does not approve this contact or authorize outreach/);
  assert.match(client, /No external delivery or provider-dispatch capability/);
  assert.match(client, /Approved campaign memberships/);
  assert.match(route, /directory === 'contacts'/);
  assert.match(route, /async function contactDirectory/);
  assert.match(route, /async function contactWorkspace/);
  assert.match(route, /case 'contact_workspace': return \{ contactKey: requiredHandle\(payload, 'contactKey', 'contact'\) \}/);
  assert.match(route, /\['approved', 'active'\]\.includes\(campaign\.status\)/);
  assert.doesNotMatch(client, /command\('(send|dispatch|export|dial|schedule|enrich|linkedin_automation)/i);
});

test('Leads mirror authoritative account records with source, qualification, associations, and fail-closed hand-off states', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');

  assert.match(client, /const LEAD_TABS = \['Overview', 'Qualification', 'Associations', 'Activities', 'Handoff'\]/);
  assert.match(client, /<h1>Leads<\/h1>/);
  assert.match(client, /Search leads/);
  assert.match(client, /function LeadRecord\(/);
  assert.match(client, /Research approval required before person intake/);
  assert.match(client, /Lead status does not authorize research, contact, drafting, or manual outreach/);
  assert.match(client, /terminally suppressed and cannot be handed off/);
  assert.match(client, /open\('lead', account\.key\)/);
  assert.match(client, /kind === 'lead' \? 'Leads'/);
  assert.match(route, /source: safe\(account\.source, 'Source not recorded'\)/);
  assert.match(route, /qualification: account\.account_approval \|\| account\.status \|\| null/);
  assert.match(route, /account: \{ key: handle\('account', accountId, config\)/);
  assert.doesNotMatch(client, /command\('(send|dispatch|export|dial|schedule|enrich|linkedin_automation)/i);
});

test('Opportunities mirror account pipeline context without fabricating financial or customer-commitment data', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');

  assert.match(client, /const OPPORTUNITY_TABS = \['Overview', 'Associations', 'Activity', 'Pipeline context'\]/);
  assert.match(client, /<h1>Opportunities<\/h1>/);
  assert.match(client, /Search opportunities/);
  assert.match(client, /function OpportunitiesModule\(/);
  assert.match(client, /function OpportunityRecord\(/);
  assert.match(client, /open\('opportunity', account\.key\)/);
  assert.match(client, /module === 'Opportunities' \? 'opportunity'/);
  assert.match(client, /kind === 'opportunity' \? 'Opportunities'/);
  assert.match(client, /Amount<\/dt><dd>Not recorded/);
  assert.match(client, /Probability<\/dt><dd>Not recorded/);
  assert.match(client, /Close date<\/dt><dd>Not recorded/);
  assert.match(client, /does not create a deal, forecast, customer commitment, or financial metric/);
  assert.match(client, /Activity timeline/);
  assert.doesNotMatch(client, /command\('(send|dispatch|export|dial|schedule|enrich|linkedin_automation)/i);
});

test('Tasks have an account-linked directory and record while Calls and Meetings fail closed without a service contract', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');

  assert.match(client, /'Tasks', 'Calendar', 'Calls', 'Meetings'/);
  assert.match(client, /function TasksModule\(/);
  assert.match(client, /function TaskRecord\(/);
  assert.match(client, /function UnavailableActivityModule\(/);
  assert.match(client, /open\('task', task\.key\)/);
  assert.match(client, /command\('complete_task', \{ accountKey: task\.accountKey, taskKey: task\.key \}\)/);
  assert.match(client, /Editing or reassignment is unavailable until the CRM service exposes an authoritative command/);
  assert.match(client, /does not fabricate call or meeting records, invitees, assignees, dates, completion state, or timeline entries/);
  assert.match(client, /kind === 'task' \? 'task_workspace'/);
  assert.match(client, /selectedRef\.current\?\.key === commandSelection\.key/);
  assert.match(route, /case 'task_workspace': return \{ taskKey: requiredHandle\(payload, 'taskKey', 'task'\) \}/);
  assert.match(route, /async function taskDirectory/);
  assert.match(route, /async function taskWorkspace/);
  assert.match(route, /directory === 'tasks'/);
  assert.match(route, /hasCrmRecordHandle\('task', `\$\{account\.id\}:\$\{item\.id\}`, taskKey, config\)/);
  assert.doesNotMatch(client, /command\('(send|dispatch|export|dial|schedule|enrich|linkedin_automation)/i);
});

test('Calendar renders only permitted account tasks in day, week, month, and agenda views', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const styles = await source('app/globals.css');

  assert.match(client, /if \(module === 'Calendar'\) return <CalendarModule/);
  assert.match(client, /function CalendarModule\(/);
  assert.match(client, /\['day', 'week', 'month', 'agenda'\]/);
  assert.match(client, /Loading permitted calendar records/);
  assert.match(client, /Previous<\/button>/);
  assert.match(client, /Today<\/button>/);
  assert.match(client, /Next<\/button>/);
  assert.match(client, /open\('task', task\.key\)/);
  assert.match(client, /command\('create_task', \{ accountKey: form\.get\('accountKey'\), title: form\.get\('title'\), dueAt \}\)/);
  assert.match(client, /does not invite, transmit, or schedule an external call or meeting/);
  assert.match(client, /No call records, scheduling, logs, invitees, or transmission contract is available/);
  assert.match(client, /No meeting records, scheduling, invitations, or external transmission contract is available/);
  assert.doesNotMatch(client, /command\('(send|dispatch|export|dial|schedule|enrich|linkedin_automation)/i);
  assert.match(styles, /\.crm-calendar-grid/);
  assert.match(styles, /\.crm-calendar-agenda/);
  assert.match(styles, /\.crm-calendar-unavailable/);
});

test('Emails and Email Templates expose authenticated email-campaign draft revisions without mailbox or delivery actions', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');
  const styles = await source('app/globals.css');

  assert.match(client, /'Emails', 'Email Templates', 'Documents', 'Knowledge Base', 'Campaigns'/);
  assert.match(client, /const EMAIL_TABS = \['Overview', 'Preview', 'Relationships', 'Audit context'\]/);
  assert.match(client, /function EmailsModule\(/);
  assert.match(client, /function EmailTemplatesModule\(/);
  assert.match(client, /function EmailRecord\(/);
  assert.match(client, /function EmailTemplateRecord\(/);
  assert.match(client, /open\('email', email\.key\)/);
  assert.match(client, /open\('template', template\.key\)/);
  assert.match(client, /mailbox synchronization, sending, and external dispatch are unavailable/);
  assert.match(client, /No template publishing, editing, or external dispatch capability/);
  assert.match(client, /Preview preserves the persisted draft revision only/);
  assert.match(route, /directory === 'emails' \|\| directory === 'templates'/);
  assert.match(route, /async function emailDirectory/);
  assert.match(route, /async function templateDirectory/);
  assert.match(route, /async function emailWorkspace/);
  assert.match(route, /async function templateWorkspace/);
  assert.match(route, /campaign\.channel === 'email'/);
  assert.match(route, /case 'email_workspace': return \{ emailKey: requiredHandle\(payload, 'emailKey', 'email'\) \}/);
  assert.match(route, /case 'template_workspace': return \{ templateKey: requiredHandle\(payload, 'templateKey', 'template'\) \}/);
  assert.match(route, /HANDLE_KINDS = \['account', 'campaign', 'contact', 'membership', 'draft', 'attempt', 'task', 'email', 'template'\]/);
  assert.doesNotMatch(client, /command\('(send|dispatch|export|dial|schedule|enrich|mailbox_sync)/i);
  assert.match(styles, /\.crm-email-preview/);
  assert.match(styles, /\.crm-template-snippet/);
});

test('Documents and Knowledge Base fail closed without an authenticated tenant-scoped content contract', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const styles = await source('app/globals.css');

  assert.match(client, /'Documents', 'Knowledge Base', 'Campaigns'/);
  assert.match(client, /documents: 'Documents', 'knowledge-base': 'Knowledge Base'/);
  assert.match(client, /function DocumentsModule\(/);
  assert.match(client, /function KnowledgeBaseModule\(/);
  assert.match(client, /function DocumentUnavailableModule\(/);
  assert.match(client, /Search \{noun\}/);
  assert.match(client, /isKnowledgeBase \? 'Categories' : 'Folders'/);
  assert.match(client, /\$\{classification\} and lists/);
  assert.match(client, /Record details and relationships/);
  assert.match(client, /Authorized upload \/ link metadata/);
  assert.match(client, /No file content, external URL, or metadata is fetched or exposed without a server-authorized opaque record handle/);
  assert.match(client, /tenant-scoped document authorization is not configured/);
  assert.doesNotMatch(client, /command\('(upload|link_document|create_document|create_article|export)/i);
  assert.match(styles, /\.crm-document-grid/);
  assert.match(styles, /\.crm-document-controls/);
});

test('Reports and Dashboards derive read-only operational states with freshness, provenance, and no export contract', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');

  assert.match(client, /reports: 'Reports', dashboards: 'Dashboards'/);
  assert.match(client, /if \(module === 'Reports'\) return <ReportsModule/);
  assert.match(client, /if \(module === 'Dashboards'\) return <DashboardsModule/);
  assert.match(client, /function operationalReports\(/);
  assert.match(client, /function ReportsModule\(/);
  assert.match(client, /function DashboardsModule\(/);
  assert.match(client, /Report library/);
  assert.match(client, /Filters and run/);
  assert.match(client, />Run report</);
  assert.match(client, /Export unavailable/);
  assert.match(client, /No authorized export contract is available/);
  assert.match(client, /Source freshness/);
  assert.match(client, /Authenticated account and campaign directories/);
  assert.match(client, /Value Intended/);
  assert.match(client, /Value Practiced/);
  assert.match(client, /not a forecast or performance claim/);
  assert.match(client, /does not infer conversion, revenue, delivery outcome, ownership, or customer impact/);
  assert.doesNotMatch(client, /command\('(export|create_report|update_report|delete_report)/i);
});

test('Administration exposes users, teams, roles/ACL, entity configuration, and settings as fail-closed authenticated views', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');
  const styles = await source('app/globals.css');

  assert.match(client, /'Dashboards', 'Administration'/);
  assert.match(client, /administration: 'Administration'/);
  assert.match(client, /if \(module === 'Administration'\) return <AdministrationModule \/>/);
  assert.match(client, /function AdministrationModule\(/);
  for (const section of ['Users', 'Teams', 'Roles & ACL', 'Entity Configuration', 'Settings']) assert.match(client, new RegExp(section));
  assert.match(client, /Access-control and configuration changes remain fail closed/);
  assert.match(client, /Impact preview/);
  assert.match(client, /explicit, attributable confirmation/);
  assert.match(client, /immutable audit evidence/);
  assert.match(client, /no mutation is attempted from this screen/);
  assert.match(client, /Review and apply change/);
  assert.match(styles, /\.crm-admin-controls/);
  assert.doesNotMatch(route, /create_user|update_user|delete_user|create_team|update_team|delete_team|update_role|update_acl|update_settings|update_entity_config/);
});

test('Campaigns and Target Lists provide a server-gated manual workbench', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');

  assert.match(client, /'Campaigns', 'Target Lists', 'Activities'/);
  assert.match(client, /function TargetListDirectory\(/);
  assert.match(client, /const CAMPAIGN_TABS = \['Overview', 'Target list', 'Draft queue', 'Manual attempts', 'Activity'\]/);
  assert.match(client, /function TargetList\(/);
  assert.match(client, /function DraftQueue\(/);
  assert.match(client, /function ManualAttemptQueue\(/);
  assert.match(client, /Add to target list/);
  assert.match(client, /Create draft revision/);
  assert.match(client, /Plan manual attempt/);
  assert.match(client, /Record manual outcome/);
  assert.match(client, /No automated send, export, enrichment, or provider dispatch is available/);
  assert.match(client, /Do not contact is terminal/);
  assert.match(client, /command\('manual_execution', \{ campaignKey, attemptKey: attempt\.key, outcomeNote: note \}\)/);
  assert.match(route, /function assertNotSuppressed\(member\)/);
  assert.match(route, /assertNotSuppressed\(contact\)/);
  assert.match(route, /assertNotSuppressed\(draftWithMember\.item\)/);
  assert.match(route, /assertNotSuppressed\(attemptWithMember\.item\)/);
  assert.match(route, /hasCrmRecordHandle\('draft', item\.id, payload\.draftKey, config\)/);
  assert.match(route, /hasCrmRecordHandle\('attempt', attempt\.id, payload\.attemptKey, config\)/);
  assert.doesNotMatch(client, /command\('(send|dispatch|export|dial|schedule|enrich|linkedin_automation)/i);
});

test('legacy account API cannot bypass the shared actor-aware broker', async () => {
  const route = await source('app/api/admin/crm/accounts/[accountId]/route.js');
  assert.match(route, /status: 410/);
  assert.doesNotMatch(route, /CRM_API_TOKEN|NEXT_PUBLIC_CRM/);
});

test('CRM uses shared Espo-style list and record interaction primitives', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const styles = await source('app/globals.css');

  for (const primitive of ['LoadingState', 'ErrorState', 'SavedViews', 'ListToolbar', 'Pagination', 'RecordActionMenu', 'ConfirmButton']) {
    assert.match(client, new RegExp(`function ${primitive}\\(`));
  }
  assert.match(client, /SavedViews views=\{\['All accounts', 'Needs review', 'No next action', 'Recently active'\]\}/);
  assert.match(client, /Bulk lifecycle changes are unavailable/);
  assert.match(client, /Lifecycle actions unavailable/);
  assert.match(client, /Approve this account\?/);
  assert.match(client, /Contact, draft, and manual-attempt approval remain separate/);
  assert.match(client, /Loading record details/);
  assert.match(client, /selectedRef\.current\?\.key === commandSelection\.key/);
  assert.match(styles, /\.crm-confirm-modal/);
  assert.match(styles, /\.crm-pagination/);
  assert.match(styles, /\.crm-bulk-selection/);
});

test('My Work dashboard is backed by authenticated account-scoped CRM data with explicit freshness and empty states', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');
  const styles = await source('app/globals.css');

  assert.match(client, /fetch\('\/api\/crm\/workspace\?directory=home'/);
  assert.match(client, /Loading your authenticated CRM work/);
  assert.match(client, /Fresh \$\{formatDate\(dashboard\?\.fetchedAt/);
  for (const widget of ['My Work', 'Open tasks', 'Recent activity', 'Campaign status']) assert.match(client, new RegExp(`title=\"${widget}\"`));
  assert.match(client, /No open tasks in recent account work/);
  assert.match(client, /No recent activity in this account set/);
  assert.match(client, /No campaigns yet/);
  assert.match(client, /open\('account', task\.accountKey\)/);
  assert.match(client, /open\('campaign', campaign\.key\)/);
  assert.match(route, /directory === 'home'/);
  assert.match(route, /async function homeDashboard/);
  assert.match(route, /HOME_ACCOUNT_DETAIL_LIMIT = 8/);
  assert.match(route, /account_workspace', \{ account_id: account\.id \}/);
  assert.match(route, /return \{ accounts: accountRows\.map/);
  assert.match(styles, /\.crm-home-grid/);
  assert.match(styles, /\.crm-home-list/);
});

test('global search groups only authorized CRM directories and keeps favorites and recents scoped to the active session', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const styles = await source('app/globals.css');

  assert.match(client, /function recordSearchEntries\(/);
  for (const collection of ['accounts', 'campaigns', 'contacts', 'tasks', 'emails', 'templates']) assert.match(client, new RegExp(`\.\.\.${collection}\.map`));
  assert.match(client, /type: 'Accounts'/);
  assert.match(client, /type: 'Campaigns'/);
  assert.match(client, /type: 'Contacts'/);
  assert.match(client, /type: 'Tasks'/);
  assert.match(client, /type: 'Emails'/);
  assert.match(client, /type: 'Email Templates'/);
  assert.match(client, /function WorkspaceShortcuts\(/);
  assert.match(client, /No favorites in this authenticated workspace/);
  assert.match(client, /No records opened in this workspace yet/);
  assert.match(client, /vanish when the session page closes/);
  assert.match(client, /window\.addEventListener\('keydown', focusSearch\)/);
  assert.match(client, /event\.key === '\/'/);
  assert.match(client, /event\.key === 'ArrowDown'/);
  assert.match(client, /event\.key === 'Escape'/);
  assert.match(client, /function QuickCreate\(\{ onRoute \}\)/);
  assert.match(client, /onRoute\('Accounts'\);/);
  assert.match(client, /onRoute\('Campaigns'\);/);
  assert.match(client, /onRoute\('Calendar'\);/);
  assert.match(client, /setRecentRecords/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
  assert.match(styles, /\.crm-search-group/);
  assert.match(styles, /\.crm-workspace-shortcuts/);
  assert.match(styles, /\.crm-star-button/);
});

test('account detail relationships open scoped contact and task records without bypassing DNC controls', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');

  assert.match(client, /<AccountRecord detail=\{detail\} accountKey=\{selected\.key\}[^>]*open=\{openRecord\}/);
  assert.match(client, /function PeoplePanel\(\{ detail, accountKey, command, busy, open \}\)/);
  assert.match(client, /onClick=\{\(\) => open\('contact', person\.key\)\}/);
  assert.match(client, /function TaskPanel\(\{ tasks, accountKey, command, busy, open, expanded = false \}\)/);
  assert.match(client, /onClick=\{\(\) => open\('task', task\.key\)\}/);
  assert.match(client, /terminalSuppression \? <span className="crm-muted-copy">This person is terminally suppressed\. No further review, campaign, draft, or attempt action is available\.<\/span>/);
});
