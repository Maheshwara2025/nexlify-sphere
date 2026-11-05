import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  STAGE3_ATOMIC_ENTRIES_ENABLED,STAGE3_OPERATIONS,createAtomicEntryPoster
} from '../src/lib/contractor/atomic-entry-client.js';

test('Stage 3 permits only defined operations and never modifies global legacy gate',()=>{
  assert.equal(STAGE3_ATOMIC_ENTRIES_ENABLED,false);
  assert.ok(STAGE3_OPERATIONS.includes('expense'));
  assert.ok(STAGE3_OPERATIONS.includes('material_purchase'));
  assert.ok(STAGE3_OPERATIONS.includes('labour_payment'));
  assert.ok(!STAGE3_OPERATIONS.includes('reverse_labour'));
  const source=readFileSync(new URL('../src/lib/contractor/financial-write-gate.js',import.meta.url),'utf8');
  assert.match(source,/export const FINANCIAL_WRITES_ENABLED = false/);
});

test('disabled Stage 3 cannot call database even with a populated form',async()=>{
  let calls=0;
  const poster=createAtomicEntryPoster({rpc:async()=>{calls++;return {data:{success:true},error:null}}},
    ()=>'asv_test_key_123456789000');
  await assert.rejects(poster('expense',{category:'General Overheads',amount:100}),
    e=>e.code==='FINANCIAL_WRITES_DISABLED');
  assert.equal(calls,0);
});

test('every Stage 3 UI invokes reviewed atomic client and shows disabled-gate selector',()=>{
  for(const route of ['+page.svelte','materials/+page.svelte','labour/+page.svelte',
    'piecework/+page.svelte','loans/+page.svelte','daily-work/+page.svelte']){
    const content=readFileSync(new URL('../src/routes/admin/contractor/'+route,import.meta.url),'utf8');
    assert.match(content,/createAtomicEntryPoster\(supabase\)/);
    assert.match(content,/STAGE3_ATOMIC_ENTRIES_ENABLED/);
  }
});

test('Stage 3 financial pages retain safe legacy delete/reversal disablement',()=>{
  const x=readFileSync(new URL('../src/routes/admin/contractor/labour/+page.svelte',import.meta.url),'utf8');
  assert.match(x,/disabled=\{!FINANCIAL_WRITES_ENABLED\}/);
  const y=readFileSync(new URL('../src/routes/admin/contractor/loans/+page.svelte',import.meta.url),'utf8');
  assert.match(y,/disabled=\{!FINANCIAL_WRITES_ENABLED\}/);
});
