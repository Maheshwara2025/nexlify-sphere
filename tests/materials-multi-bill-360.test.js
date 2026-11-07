import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 MATERIAL_TYPES, billTotals, prepareMultiItemBill, stockPosition, newMaterialLine
} from '../src/lib/contractor/material-catalog.js';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const payload = () => ({
 supplier_name:'MITRA IRON HARDWARE',supplier_phone:'9866087577',
 date:'2026-10-03',bill_number:'',payment_mode:'Credit',advance_paid:0,
 advance_source:'Cash',bill_photo:'',transport_cost:200,
 items:[
  {code:'ROD_12MM',quantity:30,unit_rate:580},
  {code:'ROD_6MM',quantity:20,unit_rate:200},
  {code:'BINDING_WIRE',quantity:2,unit_rate:100},
  {code:'ROD_10MM',quantity:4,unit_rate:460},
  {code:'CEMENT',quantity:20,unit_rate:300}
 ]
});

test('material line catalogue separates each steel size, cement and binding wire',()=>{
 const types=new Map(MATERIAL_TYPES.map(x=>[x.code,x.unit]));
 for(const code of ['ROD_6MM','ROD_8MM','ROD_10MM','ROD_12MM']) assert.equal(types.get(code),'Nos');
 assert.equal(types.get('BINDING_WIRE'),'Kg');
 assert.equal(types.get('CEMENT'),'Bags');
 assert.equal(newMaterialLine('ROD_8MM').code,'ROD_8MM');
});

test('receipt amounts, transport and overall credit match the scanned receipt',()=>{
 const prepared=prepareMultiItemBill(payload(),'2026-11-08');
 assert.equal(prepared.supplier_name,'MITRA IRON HARDWARE');
 assert.equal(prepared.items.length,5);
 assert.deepEqual(prepared.items.map(x=>x.unit),['Nos','Nos','Kg','Nos','Bags']);
 assert.deepEqual(billTotals(prepared.items,prepared.transport_cost),{
  itemsTotal:29440,transport:200,grandTotal:29640
 });
});

test('invalid future purchase, unsupported unit and invalid advance are rejected',()=>{
 const badDate=payload();badDate.date='2026-12-03';
 assert.throws(()=>prepareMultiItemBill(badDate,'2026-11-08'),/భవిష్యత్తు/);
 const badQty=payload();badQty.items[1].quantity=-1;
 assert.throws(()=>prepareMultiItemBill(badQty,'2026-11-08'),/పరిమాణం/);
 const badAdvance=payload();badAdvance.advance_paid=30000;
 assert.throws(()=>prepareMultiItemBill(badAdvance,'2026-11-08'),/అడ్వాన్స్/);
 const other=payload();other.items=[{code:'OTHER',label:'pipe',unit:'invalid',quantity:2,unit_rate:10}];
 assert.throws(()=>prepareMultiItemBill(other,'2026-11-08'),/యూనిట్/);
});

test('size-wise stock keeps each rod gauge and binding wire separate',()=>{
 const purchased=[
  {material_code:'ROD_12MM',material_label:'12mm Steel Rods',unit:'Nos',quantity:30},
  {material_code:'ROD_6MM',material_label:'6mm Steel Rods',unit:'Nos',quantity:20},
  {material_code:'BINDING_WIRE',material_label:'Binding Wire',unit:'Kg',quantity:2},
 ];
 const usage=[{material_code:'ROD_12MM',quantity:4},{material_code:'BINDING_WIRE',quantity:0.5}];
 const stock=stockPosition(purchased,usage);
 assert.equal(stock.find(x=>x.code==='ROD_12MM').remaining,26);
 assert.equal(stock.find(x=>x.code==='ROD_6MM').remaining,20);
 assert.equal(stock.find(x=>x.code==='BINDING_WIRE').remaining,1.5);
});

test('DB migration makes just one credit obligation for a multi-item bill and guards every mutation',()=>{
 const sql=read('supabase/releases/20261108_multi_item_bills_supplier360_size_stock.sql');
 assert.match(sql,/BEGIN;[\s\S]*COMMIT;/);
 assert.match(sql,/CREATE TABLE public\.contractor_purchase_bills/);
 assert.match(sql,/CREATE TABLE public\.contractor_purchase_bill_items/);
 assert.match(sql,/CREATE TABLE public\.contractor_material_stock_usage/);
 assert.match(sql,/CREATE FUNCTION public\.contractor_post_material_bill_v1/);
 assert.match(sql,/CREATE FUNCTION public\.contractor_use_material_stock_v1/);
 assert.match(sql,/PERFORM pg_advisory_xact_lock/);
 assert.match(sql,/contractor_access_status\(\)/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/BILL_ALREADY_ENTERED/);
 assert.match(sql,/contractor_materials[\s\S]*contractor_transactions/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.contractor_post_material_bill_v1\(jsonb,text\) TO authenticated/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.contractor_post_material_bill_v1\(jsonb,text\) FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/FOR SELECT TO authenticated USING/);
 assert.match(sql,/INSUFFICIENT_STOCK/);
});

test('legacy ₹23600 entries are removed only after exact snapshot and audit',()=>{
 const sql=read('supabase/releases/20261108_mitra_iron_hardware_legacy_23600_cleanup.sql');
 assert.match(sql,/BEGIN;[\s\S]*COMMIT;/);
 assert.match(sql,/contractor_private\.removed_material_purchases/);
 assert.match(sql,/DELETE FROM public\.contractor_transactions WHERE id IN\(13,14\)/);
 assert.match(sql,/DELETE FROM public\.contractor_materials WHERE id IN\(3,4\)/);
 assert.match(sql,/Linked payments or additional transactions exist/);
});

test('purchase form, supplier bills, stock and settlement controls are reachable',()=>{
 const main=read('src/routes/admin/contractor/materials/+page.svelte');
 const editor=read('src/routes/admin/contractor/materials/multi/+page.svelte');
 const suppliers=read('src/routes/admin/contractor/materials/suppliers/+page.svelte');
 const data=read('src/lib/contractor/data.js');
 assert.match(main,/href="\/admin\/contractor\/materials\/multi"/);
 assert.match(main,/href="\/admin\/contractor\/materials\/suppliers"/);
 assert.match(editor,/contractor_post_material_bill_v1/);
 assert.match(editor,/Add Item/);
 assert.match(editor,/prepareMultiItemBill/);
 assert.match(suppliers,/contractor_use_material_stock_v1/);
 assert.match(suppliers,/submitStage2AtomicPayment/);
 assert.match(suppliers,/Supplier Bill 360/);
 assert.match(data,/contractor_purchase_bill_items/);
 assert.match(data,/contractor_material_stock_usage/);
});
