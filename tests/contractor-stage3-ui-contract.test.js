import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  STAGE3_ATOMIC_ENTRIES_ENABLED,STAGE3_OPERATIONS,createAtomicEntryPoster
} from '../src/lib/contractor/atomic-entry-client.js';

test('Stage 3 permits only defined operations and never modifies global legacy gate',()=>{
  assert.equal(STAGE3_ATOMIC_ENTRIES_ENABLED,true);
  assert.ok(STAGE3_OPERATIONS.includes('expense'));
  assert.ok(STAGE3_OPERATIONS.includes('material_purchase'));
  assert.ok(STAGE3_OPERATIONS.includes('labour_payment'));
  assert.ok(!STAGE3_OPERATIONS.includes('reverse_labour'));
  const source=readFileSync(new URL('../src/lib/contractor/financial-write-gate.js',import.meta.url),'utf8');
  assert.match(source,/export const FINANCIAL_WRITES_ENABLED = false/);
});

test('Stage 3 calls only the reviewed RPC and reuses the idempotency key on failed retries',async()=>{
  let calls=[];
  let attempt=0;
  const poster=createAtomicEntryPoster({
    rpc:async(name,args)=>{
      calls.push({name,args});
      attempt++;
      if(attempt===1)return {data:null,error:new Error('connection lost')};
      return {data:{success:true,transaction_id:21},error:null};
    }
  },()=>'asv_test_key_123456789000');
  const payload={category:'General Overheads',source:'Cash',amount:'100.00',desc:'Test desk',recipient:'Test desk'};
  await assert.rejects(poster('expense',payload),/connection lost/);
  const result=await poster('expense',payload);
  assert.equal(result.success,true);
  assert.equal(calls.length,2);
  assert.equal(calls[0].name,'contractor_post_entry_v1');
  assert.equal(calls[0].args.p_idempotency_key,calls[1].args.p_idempotency_key);
  assert.equal(calls[0].args.p_operation,'expense');
  await assert.rejects(poster('unreviewed_delete',payload),/Unsupported financial operation/);
  assert.equal(calls.length,2);
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
