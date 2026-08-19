import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('CRM preserves touch-safe navigation and horizontal list access on narrow screens', async () => {
  const styles = await source('app/globals.css');

  assert.match(styles, /@media \(max-width:560px\)[\s\S]*\.crm-app-nav[\s\S]*touch-action:pan-x/);
  assert.match(styles, /@media \(max-width:560px\)[\s\S]*\.crm-app-nav button[\s\S]*min-height:44px/);
  assert.match(styles, /\.crm-table-wrap[\s\S]*touch-action:pan-x/);
  assert.match(styles, /\.crm-calendar-grid[\s\S]*touch-action:pan-x/);
});

test('CRM keeps dialogs and primary controls usable inside a 320–560px viewport', async () => {
  const styles = await source('app/globals.css');

  assert.match(styles, /\.crm-confirm-modal[\s\S]*max-height:calc\(100dvh - 40px\)[\s\S]*overflow:auto/);
  assert.match(styles, /@media \(max-width:560px\)[\s\S]*\.crm-topbar-button,[\s\S]*\.crm-notification-button,[\s\S]*\.crm-avatar-button,[\s\S]*\.crm-primary,[\s\S]*\.crm-danger-button,[\s\S]*\.crm-check-button[\s\S]*min-height:44px/);
  assert.match(styles, /@media \(max-width:560px\)[\s\S]*\.crm-calendar-event[\s\S]*min-height:44px/);
  assert.match(styles, /@media \(max-width:560px\)[\s\S]*\.crm-calendar-controls \.crm-text-button[\s\S]*min-height:44px/);
});

test('CRM provides keyboard-visible module focus and modal keyboard containment', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const styles = await source('app/globals.css');

  assert.match(styles, /\.crm-app-nav button:focus-visible[\s\S]*outline:3px solid/);
  assert.match(client, /event\.key === 'Escape'/);
  assert.match(client, /focusable\[0\]\?\.focus\(\)/);
  assert.match(client, /triggerRef\.current\?\.focus\(\)/);
});

test('CRM defaults the calendar to agenda on compact viewports', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');

  assert.match(client, /matchMedia\('\(max-width: 560px\)'\)\.matches \? 'agenda' : 'month'/);
});
