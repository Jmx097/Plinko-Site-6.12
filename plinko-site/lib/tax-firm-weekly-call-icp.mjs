export const TAX_FIRM_WEEKLY_CALL_ICP = Object.freeze({
  name: 'Tax firm weekly call queue',
  channel: 'call',
  employeeCount: Object.freeze({
    minimumExclusive: 50,
    label: 'More than 50 employees',
  }),
  revenueCapacityHypothesis: Object.freeze({
    maximumUsdExclusive: 1_000_000,
    label: 'Under $1M revenue-capacity hypothesis',
  }),
  evidenceRequirement: 'Use dated first-party or credible public source evidence for headcount and revenue-capacity signals. Revenue is a hypothesis, not asserted fact.',
  workflow: Object.freeze([
    'Review account fit and evidence before adding people.',
    'Keep people/contact approval separate from account approval.',
    'Record manual call outcomes, next actions, and do-not-contact choices in the CRM.',
  ]),
});
