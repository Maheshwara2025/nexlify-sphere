/** NS Magnet News: conservative formatting, never invent facts or rewrite copy. */
export const MAGNET_THEMES = [
  { key:'crimson', name:'Crimson Gold', primary:'#b91c1c', highlight:'#ffd24d', dark:'#3b0a16' },
  { key:'royal', name:'Royal Blue', primary:'#1d4ed8', highlight:'#ffde59', dark:'#081c49' },
  { key:'emerald', name:'Emerald', primary:'#047857', highlight:'#ffe267', dark:'#062f27' },
  { key:'violet', name:'Royal Violet', primary:'#713db2', highlight:'#ffe16b', dark:'#25123d' },
  { key:'maroon', name:'Maroon', primary:'#9f1239', highlight:'#ffd772', dark:'#350b24' },
  { key:'saffron', name:'Saffron', primary:'#c25b12', highlight:'#fff0a1', dark:'#44220b' }
];
export const IMPACT_COLORS = [
  { ink:'#7040a3', bg:'#f4edfc' },
  { ink:'#2855aa', bg:'#edf3ff' },
  { ink:'#087767', bg:'#e8f7f2' },
  { ink:'#976d04', bg:'#fff8d9' },
  { ink:'#ac501b', bg:'#fff0e5' },
  { ink:'#ad3154', bg:'#fff0f5' }
];
export const MAGNET_DEFAULT_ENDING = 'మరిన్ని వార్తల కోసం NS NEWS ను అనుసరించండి.';

const strip = (s) => String(s || '').replace(/&#x20;|&nbsp;/gi,' ').replace(/[\u200b-\u200d\uFEFF]/g,'').trim();
export function newsWordCount(text) {
  return strip(text).split(/\s+/u).filter(Boolean).length;
}
export function shortenCardText(text, limit=95) {
  const value = strip(text);
  if (value.length <= limit) return value;
  return value.slice(0,limit).replace(/\s+\S*$/u,'').trimEnd() + '…';
}
export function magnetTheme(key, headline='') {
  return MAGNET_THEMES.find(x=>x.key===key) || MAGNET_THEMES[hashText(headline)%MAGNET_THEMES.length];
}
function hashText(text) {
  let hash=0;
  for (const char of String(text || '')) hash = (Math.imul(hash,31)+char.codePointAt(0))>>>0;
  return hash;
}
export function impactColor(index, headline='') {
  return IMPACT_COLORS[(index + hashText(headline)%IMPACT_COLORS.length)%IMPACT_COLORS.length];
}
export function splitHighlight(headline) {
  const words=strip(headline).split(/\s+/u).filter(Boolean);
  if (words.length<3) return [headline,''];
  const start=Math.max(0,Math.floor(words.length/2)-1);
  return [words.slice(0,start).join(' '), words.slice(start,start+2).join(' '), words.slice(start+2).join(' ')];
}
function parsePoint(raw) {
  const line = strip(raw).replace(/^[-*•]\s+/u,'');
  let match=line.match(/^\*\*([^*]+)\*\*\s*[:：–-]?\s*(.*)$/u);
  if (match) return {title:strip(match[1]).replace(/[:：]+$/u,''), description:strip(match[2])};
  match=line.match(/^([^:：]{2,45})[:：]\s*(.+)$/u);
  if (match) return {title:strip(match[1]),description:strip(match[2])};
  return {title:strip(line.replace(/\*\*/g,'')),description:''};
}
function cleanLine(line) {
  return strip(line).replace(/^(?:>\s*)?#+\s*/u,'').trim();
}
/**
 * Parse first heading, exactly six bullet candidates and remaining paragraphs.
 * Keep invalid/unrecognized source text for editorial review; do not fabricate bullets.
 */
export function parseMagnetNews(input) {
  const normalized=String(input||'').replace(/\r\n?/g,'\n').replace(/&#x20;|&nbsp;/gi,' ');
  const lines=normalized.split('\n').map(cleanLine).filter(line=>
    line && !/^image_[\w.-]+\.(?:png|jpe?g|webp)(?:\s*\+\s*\d+)?$/iu.test(line)
      && !/^!\[[^\]]*\]\([^)]*\)$/u.test(line)
  );
  if (!lines.length) return {headline:'',points:[],body:'',ending_line:MAGNET_DEFAULT_ENDING,wordCount:0, warnings:['వార్తను నమోదు చేయండి.']};
  const headline=strip(lines[0].replace(/^\*\*(.*?)\*\*$/u,'$1').replace(/^[*#]+/u,'').replace(/[*#]+$/u,''));
  const points=[];
  const bodyParts=[];
  for (const line of lines.slice(1)) {
    if (/^(?:[-*•]\s+|\d{1,2}[.)]\s+)/u.test(line)) {
      if(points.length<6) points.push(parsePoint(line.replace(/^\d{1,2}[.)]\s+/u,'')));
      else bodyParts.push(line); // Do not silently discard extra source content.
    } else {
      bodyParts.push(strip(line.replace(/\*\*/g,'')));
    }
  }
  const body=bodyParts.join('\n\n').trim();
  const wordCount=newsWordCount(body);
  const warnings=[];
  if(!headline) warnings.push('ప్రధాన శీర్షిక అవసరం.');
  if(points.length!==6) warnings.push('ఆరు ముఖ్యాంశాలు అవసరం. ప్రస్తుతం '+points.length+' మాత్రమే గుర్తించబడ్డాయి.');
  if(!body) warnings.push('వార్తా కథనం అవసరం.');
  if(wordCount>150) warnings.push('కథనం 150 పదాలు మించింది ('+wordCount+'). సవరించండి.');
  if(points.some(p=>!p.title)) warnings.push('ప్రతి పాయింట్‌కు శీర్షిక ఉండాలి.');
  return {headline,points,body,ending_line:MAGNET_DEFAULT_ENDING,wordCount,warnings};
}
export function validateMagnetNews(draft, hasPhoto=false) {
  const errors=[];
  if(!draft?.headline?.trim()) errors.push('Headline అవసరం.');
  if(!Array.isArray(draft?.points)||draft.points.length!==6||draft.points.some(p=>!p.title?.trim())) errors.push('6 ముఖ్యాంశాలు తప్పనిసరి.');
  if(!draft?.body?.trim()) errors.push('Body అవసరం.');
  if(newsWordCount(draft?.body)>150) errors.push('Body 150 పదాల లోపు ఉండాలి.');
  if(!hasPhoto) errors.push('Photo Upload తప్పనిసరి.');
  return errors;
}
export function magnetShareText(article, url) {
  const headline=strip(article?.headline);
  const location=strip(article?.location_town);
  const bullets=(Array.isArray(article?.points)?article.points:[]).map((p,i)=>
    (i+1)+'. '+strip(p.title)+(p.description?' — '+strip(p.description):'')
  ).join('\n');
  return '📰 *'+headline+'*\n'+(location?'📍 '+location+'\n':'')+'\n'+bullets+'\n\n'
    +strip(article?.body)+'\n\n'+strip(article?.ending_line||MAGNET_DEFAULT_ENDING)
    +'\n\n*NS NEWS*'+(url?'\n'+url:'');
}