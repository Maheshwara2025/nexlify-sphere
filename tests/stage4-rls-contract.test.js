import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/releases/20261105_stage4_public_rls_hardening.sql', import.meta.url),
  'utf8'
);
const layout = readFileSync(
  new URL('../src/routes/admin/contractor/+layout.svelte', import.meta.url),
  'utf8'
);

test('Stage 4 release is gated, transactional and targets all nine exposed tables', () => {
  assert.match(migration, /BEGIN;[\s\S]*COMMIT;/);
  assert.match(migration, /No enabled verified admin: migration would cause owner lockout/);
  assert.match(migration, /Stage 4 inventory drift/);
  assert.match(migration, /Stage 4 policy inventory drift/);
  for (const name of [
    'contractor_cashbook', 'contractor_contacts', 'contractor_gd_entries',
    'contractor_gst_vault', 'contractor_material_stock', 'contractor_projects',
    'contractor_vendor_dues', 'news_articles', 'service_requests'
  ]) {
    assert.ok(migration.includes(name), name);
  }
});

test('Contractor side tables revoke anonymous access and require verified owner', () => {
  assert.match(migration, /REVOKE ALL ON TABLE public\.%I FROM PUBLIC,anon,authenticated/);
  assert.match(migration, /GRANT SELECT ON TABLE public\.%I TO authenticated/);
  assert.match(migration, /contractor_verified_owner_select/);
  assert.match(migration, /public\.contractor_access_status\(\)/);
  for (const policy of [
    'Admin full access cashbook','Admin full access gd_entries',
    'Admin full access gst_vault','Admin full access material_stock',
    'Admin full access projects','Admin full access vendor_dues'
  ]) assert.ok(migration.includes('DROP POLICY "'+policy+'"'));
});

test('Keep public news readable, protect write access, and keep service requests private', () => {
  assert.match(migration, /news_read_for_all ON public\.news_articles FOR SELECT TO anon,authenticated USING \(true\)/);
  assert.match(migration, /news_owner_insert ON public\.news_articles FOR INSERT TO authenticated/);
  assert.match(migration, /news_owner_update ON public\.news_articles FOR UPDATE TO authenticated/);
  assert.match(migration, /service_request_public_insert ON public\.service_requests FOR INSERT TO anon,authenticated/);
  assert.match(migration, /service_request_owner_read ON public\.service_requests FOR SELECT TO authenticated/);
  assert.doesNotMatch(migration, /service_request_public_read/);
});

test('Stage 3 UI is not falsely described as disabled; legacy reversals still locked', () => {
  assert.match(layout, /Stage 3 భద్రమైన అటామిక్ నమోదులు అందుబాటులో ఉన్నాయి/);
  assert.match(layout, /పాత లావాదేవీల తొలగింపు, రివర్సల్/);
  assert.doesNotMatch(layout, /కొత్త నమోదు, చెల్లింపులు, మార్పులు, తొలగింపులు నిలిపివేయబడ్డాయి/);
});
