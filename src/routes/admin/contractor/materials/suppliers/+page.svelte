<script>
 import {onMount} from 'svelte';
 import {supabase} from '$lib/supabaseClient';
 import {readAllRows,projectToday} from '$lib/contractor/data.js';
 import {stockPosition} from '$lib/contractor/material-catalog.js';
 import {prepareSupplierSettlementRpc,submitStage2AtomicPayment} from '$lib/contractor/atomic-payment-client.js';
 let parties=[],bills=[],billItems=[],materials=[],transactions=[],usage=[];
 let loading=true,error='',success='',supplierId='';
 let payBill=null,payAmount=0,payFunding='Cash',payDate=projectToday(),paying=false;
 let paymentKey='',paymentFingerprint='';
 let usageModal=false,using=false,usageCode='',usageQuantity=1,usageSite='Mutharam',usageNotes='',usageDate=projectToday();
 let usageKey='',usageFingerprint='';
 $: selectedSupplier=parties.find(p=>String(p.id)===supplierId)||null;
 $: shownBills=selectedSupplier?bills.filter(b=>String(b.supplier_id)===supplierId):bills;
 $: purchaseTotal=shownBills.reduce((sum,b)=>sum+Number(materials.find(m=>String(m.id)===String(b.material_id))?.total_amount||0),0);
 $: dueTotal=shownBills.reduce((sum,b)=>{
    const m=materials.find(m=>String(m.id)===String(b.material_id));
    const t=transactions.find(t=>String(t.id)===String(m?.obligation_tx_id));
    return sum+Number(t?.balance||0);
 },0);
 $: paidTotal=purchaseTotal-dueTotal;
 $: stocks=stockPosition(billItems,usage);
 $: chosenStock=stocks.find(s=>s.code===usageCode)||null;
 onMount(()=>{void loadAll();});
 async function loadAll(){
  loading=true;error='';
  try{
   const results=await Promise.all([
    readAllRows(supabase,'contractor_parties'),
    readAllRows(supabase,'contractor_purchase_bills',{orderBy:'id'}),
    readAllRows(supabase,'contractor_purchase_bill_items',{orderBy:'id'}),
    readAllRows(supabase,'contractor_materials',{orderBy:'id'}),
    readAllRows(supabase,'contractor_transactions',{orderBy:'id'}),
    readAllRows(supabase,'contractor_material_stock_usage',{orderBy:'id'})
   ]);
   [parties,bills,billItems,materials,transactions,usage]=results;
   parties=parties.filter(p=>p.party_type==='Supplier');
  }catch(e){error=e?.message||'రికార్డులు లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి.';}
  finally{loading=false;}
 }
 function billDetails(b){
  const mat=materials.find(m=>String(m.id)===String(b.material_id));
  const obligation=transactions.find(t=>String(t.id)===String(mat?.obligation_tx_id));
  return {
   material:mat,obligation,lines:billItems.filter(x=>String(x.bill_id)===String(b.id)),
   payments:transactions.filter(t=>t.entry_type==='supplier_payment'
     && String(t.obligation_id)===String(obligation?.id))
  };
 }
 function openPayment(b){
  const details=billDetails(b);
  if(!details.obligation||Number(details.obligation.balance)<=0){error='ఈ బిల్లులో చెల్లించాల్సిన బాకీ లేదు.';return;}
  payBill={bill:b,...details};
  payAmount=Number(details.obligation.balance);
  payFunding='Cash';payDate=projectToday();
  paymentKey='';paymentFingerprint='';error='';
 }
 async function savePayment(){
  if(!payBill||paying)return;
  paying=true;error='';success='';
  try{
   const draft={
    obligationId:payBill.obligation.id,materialId:payBill.material.id,
    amount:Number(payAmount),fundingSource:payFunding,paymentDate:payDate,
    notes:'Supplier Bill #'+payBill.bill.id+' payment'
   };
   const finger=JSON.stringify(draft);
   if(!paymentKey||finger!==paymentFingerprint){
    paymentKey='asv_sup_'+crypto.randomUUID().replaceAll('-','');
    paymentFingerprint=finger;
   }
   const command=prepareSupplierSettlementRpc({...draft,idempotencyKey:paymentKey});
   const result=await submitStage2AtomicPayment(supabase,command);
   paymentKey='';paymentFingerprint='';
   payBill=null;await loadAll();
   success='పేమెంట్ విజయవంతమైంది. Voucher: '+result.voucher_no;
  }catch(e){error=e?.message||'పేమెంట్ సేవ్ కాలేదు.';}
  finally{paying=false;}
 }
 function openUsage(stock){
  usageCode=stock.code;usageQuantity=1;usageSite='Mutharam';usageNotes='';usageDate=projectToday();
  usageKey='';usageFingerprint='';error='';usageModal=true;
 }
 async function saveUsage(){
  if(using||!chosenStock)return;
  error='';success='';
  const amount=Number(usageQuantity);
  if(!Number.isFinite(amount)||amount<=0||amount>chosenStock.remaining){
    error='లభ్యమైన స్టాక్ కంటే ఎక్కువ వాడలేరు.';return;
  }
  using=true;
  try{
   const payload={date:usageDate,material_code:usageCode,quantity:amount,
     site_name:usageSite.trim(),notes:usageNotes.trim()};
   const finger=JSON.stringify(payload);
   if(!usageKey||finger!==usageFingerprint){
    usageKey='asv_use_'+crypto.randomUUID().replaceAll('-','');
    usageFingerprint=finger;
   }
   const {data,error:rpcError}=await supabase.rpc('contractor_use_material_stock_v1',{
    p_payload:payload,p_idempotency_key:usageKey
   });
   if(rpcError)throw rpcError;
   if(!data?.success)throw new Error('స్టాక్ నమోదు నిర్ధారణ కాలేదు.');
   usageKey='';usageFingerprint='';usageModal=false;
   await loadAll();success='Site Usage నమోదైంది. కొత్త స్టాక్ వివరాలు చూపిస్తున్నాం.';
  }catch(e){error=e?.message||'స్టాక్ వినియోగం సేవ్ కాలేదు.';}
  finally{using=false;}
 }
 function money(value){return Number(value||0).toLocaleString('en-IN');}
</script>
<svelte:head><title>Supplier Bill 360° & Size Stock | A.S.V. BuildTrack</title></svelte:head>
<div class="min-h-screen bg-slate-50 p-3 sm:p-6 text-slate-900">
 <div class="mx-auto max-w-7xl space-y-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
   <div>
    <a href="/admin/contractor/materials" class="text-sm font-bold text-indigo-700 hover:underline">← Materials</a>
    <h1 class="mt-2 text-xl sm:text-2xl font-black">🏪 Supplier Bill 360° & Size-wise Stock</h1>
    <p class="mt-1 text-xs text-slate-600">ప్రతి బిల్లు, సరుకుల వివరాలు, చెల్లింపులు, బాకీ & స్టాక్</p>
   </div>
   <a href="/admin/contractor/materials/multi" class="rounded-xl bg-amber-500 px-4 py-3 text-sm font-black">＋ Multi-Item Purchase</a>
  </div>
  {#if error}<p role="alert" class="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>{/if}
  {#if success}<p role="status" class="rounded-xl border border-green-300 bg-green-50 p-3 text-sm font-bold text-green-800">{success}</p>{/if}
  {#if loading}
   <p class="rounded-xl bg-white p-6 text-center text-slate-600">లోడ్ అవుతోంది...</p>
  {:else}
   <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
    <label class="block text-sm font-bold">సప్లయర్‌ను ఎంచుకోండి
     <select bind:value={supplierId} class="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm">
      <option value="">అందరు సప్లయర్లు</option>
      {#each parties as party}<option value={String(party.id)}>{party.name} ({party.phone||'ఫోన్ లేదు'})</option>{/each}
     </select>
    </label>
    <div class="grid grid-cols-3 gap-2 sm:gap-3">
     <div class="rounded-xl bg-slate-50 p-3"><p class="text-[10px] font-bold text-slate-500">మొత్తం కొనుగోళ్లు</p><p class="mt-1 text-base sm:text-xl font-black">₹{money(purchaseTotal)}</p></div>
     <div class="rounded-xl bg-green-50 p-3"><p class="text-[10px] font-bold text-green-700">చెల్లించినది</p><p class="mt-1 text-base sm:text-xl font-black text-green-800">₹{money(paidTotal)}</p></div>
     <div class="rounded-xl bg-red-50 p-3"><p class="text-[10px] font-bold text-red-700">మిగిలిన బాకీ</p><p class="mt-1 text-base sm:text-xl font-black text-red-800">₹{money(dueTotal)}</p></div>
    </div>
   </section>
   <section class="space-y-3">
    <h2 class="text-lg font-black">🧾 Supplier Bills ({shownBills.length})</h2>
    {#if shownBills.length===0}
      <div class="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">Multi-Item Bills ఇంకా నమోదు కాలేదు. పాత Single-Item Purchases ఈ విభాగంలో చూపించడం లేదు.</div>
    {:else}
     {#each shownBills as bill}
      {@const details=billDetails(bill)}
      <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
       <div class="flex flex-wrap items-center justify-between gap-2">
        <div><h3 class="font-black text-base">{parties.find(x=>String(x.id)===String(bill.supplier_id))?.name || 'Supplier'}</h3>
         <p class="text-xs text-slate-600">Bill #{bill.id} · {details.material?.date||'—'} · Ref: {bill.external_invoice_no||'No supplier invoice number'}</p>
        </div>
        <div class="text-right"><p class="font-black text-lg">₹{money(details.material?.total_amount)}</p>
         <p class="text-xs font-bold {Number(details.obligation?.balance)>0?'text-red-700':'text-green-700'}">Due ₹{money(details.obligation?.balance)}</p>
        </div>
       </div>
       <div class="overflow-x-auto"><table class="w-full min-w-[420px] text-left text-xs">
        <thead><tr class="border-b bg-slate-100"><th class="p-2">సరుకు</th><th class="p-2 text-right">Qty</th><th class="p-2 text-right">Rate</th><th class="p-2 text-right">మొత్తం</th></tr></thead>
        <tbody>
         {#each details.lines as item}
          <tr class="border-b"><td class="p-2 font-bold">{item.material_label}</td><td class="p-2 text-right">{item.quantity} {item.unit}</td><td class="p-2 text-right">₹{money(item.unit_rate)}</td><td class="p-2 text-right font-bold">₹{money(item.line_total)}</td></tr>
         {/each}
        </tbody>
       </table></div>
       <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs text-slate-600">Transport ₹{money(details.material?.transport_cost)} · Paid ₹{money(Number(details.material?.total_amount)-Number(details.obligation?.balance))}</p>
        {#if Number(details.obligation?.balance)>0}
         <button type="button" on:click={() => openPayment(bill)}
          class="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white">₹ బాకీ చెల్లించండి</button>
        {:else}<span class="rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700">✓ Paid</span>{/if}
       </div>
       {#if details.payments.length}
        <details class="rounded-lg bg-slate-50 p-3"><summary class="cursor-pointer text-xs font-bold">చెల్లింపుల చరిత్ర ({details.payments.length})</summary>
         <div class="mt-2 space-y-1">
          {#each details.payments as tx}
           <p class="text-xs">{tx.date} · ₹{money(tx.amount)} · {tx.source} · {tx.invoice_no||'Voucher'}</p>
          {/each}
         </div>
        </details>
       {/if}
       {#if details.material?.bill_photo}
        <details class="text-xs"><summary class="cursor-pointer font-bold text-indigo-700">📷 బిల్లు ఫోటో</summary>
         <img src={details.material.bill_photo} alt="Supplier invoice" class="mt-2 max-h-96 max-w-full rounded-lg border object-contain"/>
        </details>
       {/if}
      </article>
     {/each}
    {/if}
   </section>
   <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
    <h2 class="text-lg font-black">📦 Size-wise Material Stock</h2>
    <p class="text-xs text-slate-600">కొత్త Multi-Item Bills ద్వారా వచ్చిన స్టాక్ మాత్రమే ఇక్కడ లెక్కించబడుతుంది. పాత Single-Item Records ఆటోమేటిక్‌గా కలపబడవు.</p>
    {#if stocks.length===0}<p class="py-5 text-center text-sm text-slate-500">ఇంకా సైజులవారీ స్టాక్ లేదు.</p>
    {:else}
     <div class="overflow-x-auto"><table class="w-full min-w-[470px] text-left text-xs">
      <thead><tr class="border-b bg-slate-100"><th class="p-2">మెటీరియల్</th><th class="p-2 text-right">వచ్చినది</th><th class="p-2 text-right">వాడినది</th><th class="p-2 text-right">మిగిలినది</th><th class="p-2">Action</th></tr></thead>
      <tbody>{#each stocks as stock}
       <tr class="border-b"><td class="p-2 font-bold">{stock.label}</td><td class="p-2 text-right">{stock.inward} {stock.unit}</td>
        <td class="p-2 text-right">{stock.used}</td><td class="p-2 text-right font-black">{stock.remaining}</td>
        <td class="p-2">{#if stock.remaining>0}<button type="button" on:click={() => openUsage(stock)} class="rounded-lg bg-indigo-50 px-3 py-2 font-bold text-indigo-700">Site Usage</button>{:else}—{/if}</td></tr>
      {/each}</tbody>
     </table></div>
    {/if}
   </section>
  {/if}
 </div>
</div>

{#if payBill}
 <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3">
  <div class="w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-5 space-y-3 text-slate-900">
   <div class="flex items-center justify-between"><h3 class="font-black">Supplier Payment · Bill #{payBill.bill.id}</h3>
    <button type="button" on:click={() => payBill=null} class="text-xl">✕</button></div>
   <p class="text-sm">బాకీ: <strong>₹{money(payBill.obligation.balance)}</strong></p>
   <form on:submit|preventDefault={savePayment} class="space-y-3">
    <label class="block text-xs font-bold">చెల్లింపు మొత్తం ₹
     <input type="number" step="0.01" min="0.01" max={payBill.obligation.balance} bind:value={payAmount} required class="mt-1 w-full rounded-lg border p-3"/>
    </label>
    <label class="block text-xs font-bold">చెల్లింపు తేదీ
     <input type="date" max={projectToday()} bind:value={payDate} required class="mt-1 w-full rounded-lg border p-3"/>
    </label>
    <label class="block text-xs font-bold">Payment Mode
     <select bind:value={payFunding} class="mt-1 w-full rounded-lg border p-3">
      <option value="Cash">Cash</option><option value="Bank">Bank</option><option value="UPI">UPI</option>
     </select>
    </label>
    <button type="submit" disabled={paying} class="w-full rounded-xl bg-emerald-600 p-3 font-black text-white disabled:opacity-50">{paying?'సేవ్ అవుతోంది…':'Payment Save చేయండి'}</button>
   </form>
  </div>
 </div>
{/if}

{#if usageModal}
 <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3">
  <div class="w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-5 space-y-3 text-slate-900">
   <div class="flex items-center justify-between"><h3 class="font-black">Site Material Usage</h3>
    <button type="button" on:click={() => usageModal=false} class="text-xl">✕</button></div>
   <p class="text-sm">{chosenStock?.label} · అందుబాటులో {chosenStock?.remaining} {chosenStock?.unit}</p>
   <form on:submit|preventDefault={saveUsage} class="space-y-3">
    <label class="block text-xs font-bold">వాడిన పరిమాణం
     <input type="number" min="0.001" step="0.001" max={chosenStock?.remaining} bind:value={usageQuantity} required class="mt-1 w-full rounded-lg border p-3"/>
    </label>
    <label class="block text-xs font-bold">తేదీ
     <input type="date" max={projectToday()} bind:value={usageDate} required class="mt-1 w-full rounded-lg border p-3"/>
    </label>
    <label class="block text-xs font-bold">సైట్ పేరు
     <input bind:value={usageSite} minlength="2" maxlength="150" required class="mt-1 w-full rounded-lg border p-3"/>
    </label>
    <label class="block text-xs font-bold">వినియోగం వివరాలు
     <textarea bind:value={usageNotes} maxlength="1000" rows="2" class="mt-1 w-full rounded-lg border p-3"></textarea>
    </label>
    <button type="submit" disabled={using} class="w-full rounded-xl bg-indigo-700 p-3 font-black text-white disabled:opacity-50">{using?'సేవ్ అవుతోంది…':'Stock Usage Save చేయండి'}</button>
   </form>
  </div>
 </div>
{/if}
