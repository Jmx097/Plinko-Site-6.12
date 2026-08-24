// Pure, server-consumable policy contract. This module does not invoke a model,
// perform network I/O, or grant a Pocket role.
export const COPILOT_POLICY_VERSION = 'copilot-foundation-v1';

export const COPILOT_CAPABILITY = 'copilot.workspace';
export const COPILOT_PARENT_CAPABILITY = 'crm.workspace';

export const COPILOT_ACTION_RISKS = Object.freeze({
  read: 'R0_READ_ONLY',
  plan: 'R1_PROPOSE_ONLY',
  write: 'R2_REVIEW_REQUIRED',
  external: 'R3_EXTERNAL_OR_IRREVERSIBLE',
});

export const COPILOT_TOOL_CATALOG = Object.freeze({
  my_work: { risk: COPILOT_ACTION_RISKS.read, crmAction: 'home_dashboard', maxRecords: 50 },
  account_search: { risk: COPILOT_ACTION_RISKS.read, crmAction: 'list_accounts', maxRecords: 25, maxQueryLength: 240 },
  account_detail: { risk: COPILOT_ACTION_RISKS.read, crmAction: 'account_workspace', maxRecords: 1 },
  tasks: { risk: COPILOT_ACTION_RISKS.read, crmAction: 'task_directory', maxRecords: 25, maxQueryLength: 240 },
  blocked_state_explanation: { risk: COPILOT_ACTION_RISKS.read, crmAction: 'account_workspace', maxRecords: 1 },
  next_action_plan: { risk: COPILOT_ACTION_RISKS.plan, crmAction: 'account_workspace', maxRecords: 1 },
});

export const COPILOT_LIMITS = Object.freeze({
  maxConcurrentRunsPerActor: 1,
  maxConcurrentRunsPerOrganization: 4,
  maxRunStartsPerActorPerHour: 20,
  maxReadToolCallsPerActorOrganizationPerMinute: 10,
  maxInputTokensPerRun: 8_000,
  maxOutputTokensPerRun: 1_500,
  maxArtifactBytes: 12_000,
  maxEstimatedModelCostUsdPerRun: 0.25,
  maxEstimatedModelCostUsdPerOrganizationPerDay: 10,
});

export function isCopilotTool(toolName) {
  return Object.hasOwn(COPILOT_TOOL_CATALOG, toolName);
}

export function requireCopilotTool(toolName) {
  if (!isCopilotTool(toolName)) throw new Error('Unsupported Copilot tool');
  return COPILOT_TOOL_CATALOG[toolName];
}

export function canExecuteCopilotRisk(risk) {
  return risk === COPILOT_ACTION_RISKS.read || risk === COPILOT_ACTION_RISKS.plan;
}
