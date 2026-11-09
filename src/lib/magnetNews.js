/** @typedef {{title:string, description:string}} MagnetPoint */
/** @typedef {{headline:string, points:MagnetPoint[], body:string, ending_line?:string, location_town?:string}} MagnetDraft */
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

/** @param {unknown} s */
const strip = (s) => String(s || '').replace(/&#x20;|&nbsp;/gi,' ').replace(/[\u200b-\u200d\uFEFF]/g,'').trim();
/** @param {unknown} text */
export function newsWordCount(text) {
  return strip(text).split(/\s+/u).filter(Boolean).length;
}
/** @param {unknown} text */
export function shortenCardText(text, limit=95) {
  const value = strip(text);
  if (value.length <= limit) return value;
  return value.slice(0,limit).replace(/\s+\S*$/u,'').trimEnd() + '…';
}
/** @param {string} key @param {string} headline */
export function magnetTheme(key, headline='') {
  return MAGNET_THEMES.find(x=>x.key===key) || MAGNET_THEMES[hashText(headline)%MAGNET_THEMES.length];
}
/** @param {string} text */
function hashText(text) {
  let hash=0;
  for (const char of String(text || '')) hash = (Math.imul(hash,31)+(char.codePointAt(0) ?? 0))>>>0;
  return hash;
}
/** @param {number} index @param {string} headline */
export function impactColor(index, headline='') {
  return IMPACT_COLORS[(index + hashText(headline)%IMPACT_COLORS.length)%IMPACT_COLORS.length];
}
/** @param {string} headline */
export function splitHighlight(headline) {
  const words=strip(headline).split(/\s+/u).filter(Boolean);
  if (words.length<3) return [headline,''];
  const start=Math.max(0,Math.floor(words.length/2)-1);
  return [words.slice(0,start).join(' '), words.slice(start,start+2).join(' '), words.slice(start+2).join(' ')];
}
/** @param {string} raw @returns {MagnetPoint} */
function parsePoint(raw) {
  const line = strip(raw)
    .replace(/^(?:[-•●▪■➤►✓✔→]|\*(?!\*)|\d{1,2}[.)])\s*/u, '');
  let match = line.match(/^\*\*([^*]+)\*\*\s*[:：–—-]?\s*(.*)$/u);
  if (match) return {title:strip(match[1]).replace(/[:：–—-]+$/u, ''), description:strip(match[2])};
  match = line.match(/^([^:：]{2,48})[:：]\s*(.+)$/u);
  if (match) return {title:strip(match[1]), description:strip(match[2])};
  // Plain pasted points often lose Markdown list markers. Split a short leading phrase
  // into a colored heading, keeping the exact remaining words as the description.
  const words = strip(line.replace(/\*\*/g, '')).split(/\s+/u).filter(Boolean);
  if (words.length <= 6) return {title:words.join(' '), description:''};
  const titleLength = Math.min(5, Math.max(3, Math.floor(words.length / 3)));
  return {title:words.slice(0, titleLength).join(' '), description:words.slice(titleLength).join(' ')};
}

/** @param {string} line */
function cleanLine(line) {
  return strip(line).replace(/^(?:>\s*)?#+\s*/u, '').trim();
}

/** @param {string} line */
function isMediaMarker(line) {
  return /^image_[\w.-]+\.(?:png|jpe?g|webp)(?:\s*\+\s*\d+)?$/iu.test(line)
    || /^!\[[^\]]*\]\([^)]*\)$/u.test(line);
}

/** @param {string} line */
function isExplicitPoint(line) {
  return /^(?:[-•●▪■➤►✓✔→]|\*(?!\*)|\d{1,2}[.)])\s+/u.test(line)
    || /^\*\*[^*]+[:：]\*\*/u.test(line)
    || /^[^:：\n]{2,40}[:：]\s+\S+/u.test(line);
}

/** @param {string} line */
function isCompactPoint(line) {
  return newsWordCount(line) <= 35 && line.length <= 245;
}

/**
 * Parse a headline, six points and a separate body WITHOUT changing news facts.
 * Support Markdown bullets, numbered points, bold labels, or six short unmarked
 * paragraphs/lines before the story (as in pasted Telugu newsroom copy).
 * Do not synthesize missing points or silently remove overflow content.
 *
 * @param {string} input
 * @returns {{headline:string,points:MagnetPoint[],body:string,ending_line:string,wordCount:number,warnings:string[],recognitionMode:string}}
 */
export function parseMagnetNews(input) {
  const normalized=String(input||'').replace(/\r\n?/g,'\n').replace(/&#x20;|&nbsp;/gi,' ');
  const allLines = normalized.split('\n').map(cleanLine)
    .map(line => isMediaMarker(line) ? '' : line);
  const headingIndex = allLines.findIndex(Boolean);
  if (headingIndex<0) return {
    headline:'',points:[],body:'',ending_line:MAGNET_DEFAULT_ENDING,
    wordCount:0,warnings:['వార్తను నమోదు చేయండి.'],recognitionMode:'empty'
  };
  const headline=strip(allLines[headingIndex]
    .replace(/^\*\*(.*?)\*\*$/u,'$1').replace(/^[*#]+/u,'').replace(/[*#]+$/u,''));
  const rest = allLines.slice(headingIndex+1);
  /** @type {MagnetPoint[]} */
  let points=[];
  /** @type {string[]} */
  let bodyParts=[];
  let recognitionMode='explicit';

  // 1. Respect explicit markdown/numbered point markers wherever they occur.
  for (const line of rest) {
    if (isExplicitPoint(line) && points.length<6) points.push(parsePoint(line));
    else if (line) bodyParts.push(strip(line.replace(/\*\*/g,'')));
  }

  // 2. When the clipboard has stripped bullets, look for six compact paragraphs
  //    followed by at least one paragraph of story text.
  if (points.length<6) {
    const paragraphs=rest.join('\n').split(/\n\s*\n+/u)
      .map(block=>block.split('\n').map(strip).filter(Boolean).join(' '))
      .filter(Boolean)
      .filter(block=>!/^(?:ముఖ్యాంశాలు|ప్రధాన అంశాలు|వార్తా కథనం|పూర్తి కథనం)\s*[:：]?$/u.test(block));
    const lines=rest.filter(Boolean)
      .filter(line=>!/^(?:ముఖ్యాంశాలు|ప్రధాన అంశాలు|వార్తా కథనం|పూర్తి కథనం)\s*[:：]?$/u.test(line));

    // A regular full article should not be arbitrarily split into points:
    // require SIX short segments before a remaining narrative section.
    const candidates = paragraphs.length>=7 && paragraphs.slice(0,6).every(isCompactPoint)
      ? {parts:paragraphs,mode:'paragraphs'}
      : lines.length>=7 && lines.slice(0,6).every(isCompactPoint)
        ? {parts:lines,mode:'lines'} : null;
    if(candidates) {
      points=candidates.parts.slice(0,6).map(parsePoint);
      bodyParts=candidates.parts.slice(6);
      recognitionMode=candidates.mode;
    }
  }

  const body=bodyParts.join('\n\n').trim();
  const wordCount=newsWordCount(body);
  const warnings=[];
  if(!headline) warnings.push('ప్రధాన శీర్షిక అవసరం.');
  if(points.length!==6) warnings.push('ఆరు ముఖ్యాంశాలు అవసరం. ప్రస్తుతం '+points.length+' మాత్రమే గుర్తించబడ్డాయి. పాయింట్లను ఒక్కొక్క ప్యారాగ్రాఫ్‌గా ఇవ్వండి.');
  if(!body) warnings.push('వార్తా కథనం అవసరం.');
  if(wordCount>150) warnings.push('కథనం 150 పదాలు మించింది ('+wordCount+'). సవరించండి.');
  if(points.some(p=>!p.title)) warnings.push('ప్రతి పాయింట్‌కు శీర్షిక ఉండాలి.');
  return {headline,points,body,ending_line:MAGNET_DEFAULT_ENDING,wordCount,warnings,recognitionMode};
}
/** @param {MagnetDraft} draft @param {boolean} hasPhoto */
export function validateMagnetNews(draft, hasPhoto=false) {
  const errors=[];
  if(!draft?.headline?.trim()) errors.push('Headline అవసరం.');
  if(!Array.isArray(draft?.points)||draft.points.length!==6||draft.points.some(p=>!p.title?.trim())) errors.push('6 ముఖ్యాంశాలు తప్పనిసరి.');
  if(!draft?.body?.trim()) errors.push('Body అవసరం.');
  if(newsWordCount(draft?.body)>150) errors.push('Body 150 పదాల లోపు ఉండాలి.');
  if(!hasPhoto) errors.push('Photo Upload తప్పనిసరి.');
  return errors;
}
/** @param {MagnetDraft} article @param {string} url */
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