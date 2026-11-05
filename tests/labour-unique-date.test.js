import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/releases/20261106_labour_daily_attendance_unique.sql', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/routes/admin/contractor/labour/+page.svelte', import.meta.url), 'utf8');

test('attendance cleanup is atomic, audited and aborts on paid or conflicting duplicate', () => {
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
  assert.match(sql, /LOCK TABLE public\.contractor_labour IN ACCESS EXCLUSIVE MODE/);
  assert.match(sql, /CREATE TABLE contractor_private\.labour_duplicate_archive/);
  assert.match(sql, /attendance_snapshot jsonb NOT NULL/);
  assert.match(sql, /idempotency_snapshot jsonb/);
  assert.match(sql, /RAISE EXCEPTION 'Conflicting attendance/);
  assert.match(sql, /RAISE EXCEPTION 'Duplicate attendance % has linked payments/);
  assert.match(sql, /DELETE FROM contractor_private\.idempotency_log/);
  assert.match(sql, /DELETE FROM public\.contractor_labour WHERE id=dupe\.id/);
  assert.doesNotMatch(sql, /TRUNCATE TABLE public\.contractor_labour/i);
});

test('database prevents future duplicates by worker ID and calendar date', () => {
  assert.match(sql, /ADD CONSTRAINT contractor_labour_worker_date_unique UNIQUE \(worker_id,date\)/);
  assert.match(sql, /ALTER COLUMN worker_id SET NOT NULL/);
  assert.match(sql, /ALTER COLUMN date SET NOT NULL/);
  assert.match(sql, /ADD CONSTRAINT contractor_labour_worker_id_nonblank/);
});

test('form provides Telugu already-entered message and does not rely on UI alone', () => {
  assert.match(view, /duplicateAttendance = labourRecords\.find/);
  assert.match(view, /ఈ కార్మికుడికి ఈ తేదీన హాజరు ఇప్పటికే నమోదైంది/);
  assert.match(view, /role="alert"/);
  assert.match(view, /\!\!duplicateAttendance/);
  assert.match(view, /\.eq\('worker_id', form\.worker_id\)\.eq\('date', form\.date\)/);
  assert.match(view, /error\?\.code === '23505'/);
  assert.match(view, /await postEntry\('attendance', form\)/);
});
