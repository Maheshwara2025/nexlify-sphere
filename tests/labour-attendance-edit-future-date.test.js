import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../supabase/releases/20261107_labour_edit_attendance_date_guard.sql',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/routes/admin/contractor/labour/+page.svelte',import.meta.url),'utf8');

test('future attendance is stopped on the database even outside the form',()=>{
  assert.match(sql,/CREATE TRIGGER labour_reject_future_attendance_date/);
  assert.match(sql,/BEFORE INSERT OR UPDATE OF date ON public\.contractor_labour/);
  assert.match(sql,/NEW\.date > \(now\(\) AT TIME ZONE 'Asia\/Kolkata'\)::date/);
  assert.match(sql,/FUTURE_ATTENDANCE_NOT_ALLOWED/);
  assert.match(sql,/Historical rows remain untouched/);
  assert.doesNotMatch(sql,/DELETE FROM public\.contractor_labour/);
});

test('editing attendance is owner-only, atomic, and audited',()=>{
  assert.match(sql,/BEGIN;[\s\S]*COMMIT;/);
  assert.match(sql,/CREATE TABLE contractor_private\.labour_attendance_edit_audit/);
  assert.match(sql,/old_row jsonb NOT NULL/);
  assert.match(sql,/new_row jsonb NOT NULL/);
  assert.match(sql,/CREATE FUNCTION public\.contractor_edit_attendance_v1/);
  assert.match(sql,/SECURITY DEFINER SET search_path=''/);
  assert.match(sql,/auth\.uid\(\)/);
  assert.match(sql,/public\.contractor_access_status\(\)/);
  assert.match(sql,/FOR UPDATE/);
  assert.match(sql,/ATTENDANCE_HAS_PAYMENTS/);
  assert.match(sql,/ATTENDANCE_CHANGED/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.contractor_edit_attendance_v1\(bigint,jsonb,jsonb,text\)[\s\S]*TO authenticated/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.contractor_edit_attendance_v1\(bigint,jsonb,jsonb,text\)[\s\S]*FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/REVOKE ALL ON TABLE public\.contractor_labour FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/labour_verified_owner_select/);
});

test('mobile-friendly Edit Attendance form requires reason and prevents conflicts and future dates',()=>{
  assert.match(ui,/openEditAttendance\(l\)/);
  assert.match(ui,/role="alert"/);
  assert.match(ui,/భవిష్యత్తు తేదీ/);
  assert.match(ui,/max=\{projectToday\(\)\}/);
  assert.match(ui,/form\.date > projectToday\(\)/);
  assert.match(ui,/editForm\.date > projectToday\(\)/);
  assert.match(ui,/!!editDateConflict/);
  assert.match(ui,/contractor_edit_attendance_v1/);
  assert.match(ui,/editForm\.reason\.trim\(\)/);
  assert.match(ui,/p_expected:/);
  assert.match(ui,/Already Entered/);
  assert.match(ui,/saveAttendanceEdit/);
  assert.match(ui,/Audit History/);
});
