/** Size-wise material catalogue and pure calculation helpers for BuildTrack. */
export const MATERIAL_TYPES = Object.freeze([
  {code:'CEMENT',name:'Cement',label:'సిమెంట్ (Cement)',unit:'Bags'},
  {code:'ROD_6MM',name:'6mm Steel Rods',label:'6mm స్టీల్ రాడ్లు',unit:'Nos'},
  {code:'ROD_8MM',name:'8mm Steel Rods',label:'8mm స్టీల్ రాడ్లు',unit:'Nos'},
  {code:'ROD_10MM',name:'10mm Steel Rods',label:'10mm స్టీల్ రాడ్లు',unit:'Nos'},
  {code:'ROD_12MM',name:'12mm Steel Rods',label:'12mm స్టీల్ రాడ్లు',unit:'Nos'},
  {code:'BINDING_WIRE',name:'Binding Wire',label:'బైండింగ్ వైర్',unit:'Kg'},
  {code:'SAND',name:'Sand',label:'ఇసుక',unit:'Trips'},
  {code:'AGGREGATE_20MM',name:'20mm Aggregate',label:'20mm కంకర',unit:'Trips'},
  {code:'BRICKS',name:'Bricks',label:'ఇటుకలు',unit:'Trips'},
  {code:'OTHER',name:'Other Material',label:'ఇతర మెటీరియల్',unit:'Nos'}
]);
export const CUSTOM_UNITS = Object.freeze(['Nos','Kg','Bags','Trips','Tons','CFT','SFT']);
export function newMaterialLine(code='CEMENT'){
  return {code,quantity:1,unit_rate:0,label:'',unit:'Nos'};
}
const money=value=>Math.round((Number(value)||0)*100)/100;
export function lineAmount(item){return money(Number(item.quantity)*Number(item.unit_rate));}
export function billTotals(items=[],transport=0){
  const itemsTotal=money(items.reduce((sum,item)=>sum+lineAmount(item),0));
  return {itemsTotal,transport:money(transport),grandTotal:money(itemsTotal+Number(transport||0))};
}
export function materialStockCode(line){
  if(line.code==='OTHER') return 'OTHER:'+String(line.label||'').trim().toUpperCase();
  return line.code;
}
/** @param {object} draft @param {string} today ISO-8601 project-local date */
export function prepareMultiItemBill(draft,today){
  if(!draft||!Array.isArray(draft.items)||draft.items.length<1||draft.items.length>40)
    throw new Error('ఒక బిల్లులో 1–40 సరుకులు ఉండాలి.');
  const name=String(draft.supplier_name||'').trim();
  const phone=String(draft.supplier_phone||'').replace(/[^0-9]/g,'');
  if(name.length<2||name.length>150) throw new Error('సప్లయర్ పేరు నమోదు చేయండి.');
  if(phone && !/^\d{10}$/.test(phone)) throw new Error('సరైన 10 అంకెల ఫోన్ నంబర్ ఇవ్వండి.');
  const day=String(draft.date||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z'))||day>today)
    throw new Error('సరైన కొనుగోలు తేదీ ఇవ్వండి; భవిష్యత్తు తేదీ వద్దు.');
  const billNumber=String(draft.bill_number||'').trim();
  if(billNumber.length>100) throw new Error('బిల్లు నంబరు చాలా పొడవుగా ఉంది.');
  const transport=Number(draft.transport_cost||0);
  if(!Number.isFinite(transport)||transport<0||transport>10000000||money(transport)!==transport)
    throw new Error('రవాణా ఖర్చు సరిచూడండి.');
  const mode=draft.payment_mode;
  if(!['Cash','Bank','UPI','Credit'].includes(mode)) throw new Error('చెల్లింపు విధానం ఎంచుకోండి.');
  const items=draft.items.map((row,index)=>{
    const type=MATERIAL_TYPES.find(t=>t.code===row.code);
    if(!type) throw new Error('సరుకు '+(index+1)+' రకం సరైంది కాదు.');
    const quantity=Number(row.quantity);
    const rate=Number(row.unit_rate);
    if(!Number.isFinite(quantity)||quantity<=0||quantity>1000000||Math.round(quantity*1000)!==quantity*1000)
      throw new Error('సరుకు '+(index+1)+' పరిమాణం సరిచూడండి.');
    if(!Number.isFinite(rate)||rate<0||rate>100000000||money(rate)!==rate)
      throw new Error('సరుకు '+(index+1)+' రేటు సరిచూడండి.');
    const label=type.code==='OTHER'?String(row.label||'').trim():type.name;
    const unit=type.code==='OTHER'?row.unit:type.unit;
    if(label.length<2||label.length>70 || (type.code==='OTHER'&&!CUSTOM_UNITS.includes(unit)))
      throw new Error('ఇతర మెటీరియల్ పేరు/యూనిట్ సరిచూడండి.');
    return {code:row.code,label,unit,quantity,unit_rate:rate};
  });
  const totals=billTotals(items,transport);
  if(totals.grandTotal<=0||totals.grandTotal>999999999)
    throw new Error('మొత్తం బిల్లు విలువ సరిచూడండి.');
  const advance=mode==='Credit'?Number(draft.advance_paid||0):0;
  if(!Number.isFinite(advance)||advance<0||money(advance)!==advance||advance>totals.grandTotal)
    throw new Error('అడ్వాన్స్ మొత్తం సరిచూడండి.');
  const funding=draft.advance_source||'Cash';
  if(mode==='Credit'&&advance>0&&!['Cash','Bank','UPI'].includes(funding))
    throw new Error('అడ్వాన్స్ Cash/Bank/UPI ఎంచుకోండి.');
  const photo=String(draft.bill_photo||'');
  if(photo.length>2000000)throw new Error('బిల్లు ఫోటో 2MB లోపు ఉండాలి.');
  return {
    supplier_name:name,supplier_phone:phone,bill_number:billNumber,
    date:day,items,transport_cost:transport,
    payment_mode:mode,advance_paid:advance,advance_source:funding,bill_photo:photo
  };
}
/** Group only well-classified purchases. Legacy single-item rows remain separately labelled. */
export function stockPosition(items=[],usage=[]){
  const map=new Map();
  for(const row of items){
    const key=String(row.material_code||'');
    if(!key)continue;
    const entry=map.get(key)||{code:key,label:String(row.material_label||key),unit:String(row.unit||''),inward:0,used:0,remaining:0};
    entry.inward+=Number(row.quantity||0);
    map.set(key,entry);
  }
  for(const row of usage){
    const key=String(row.material_code||'');
    const entry=map.get(key);
    if(entry)entry.used+=Number(row.quantity||0);
  }
  return [...map.values()].map(x=>({...x,
    inward:Math.round(x.inward*1000)/1000,
    used:Math.round(x.used*1000)/1000,
    remaining:Math.round((x.inward-x.used)*1000)/1000
  })).sort((a,b)=>a.label.localeCompare(b.label));
}
