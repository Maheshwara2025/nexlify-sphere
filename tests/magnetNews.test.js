import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMagnetNews, newsWordCount, validateMagnetNews, magnetShareText, impactColor, magnetTheme } from '../src/lib/magnetNews.js';

const article = [
  '**ముత్తారం గ్రామ అభివృద్ధిపై ప్రత్యేక సమీక్ష**',
  '- **రహదారులు:** మరమ్మతులు అవసరమైన రోడ్ల గుర్తింపు.',
  '- **డ్రైనేజీ:** నీటి పారుదల సౌకర్యాల పరిశీలన.',
  '- **అధికారులు:** పనుల అమలుపై సమీక్ష నిర్వహణ.',
  'image_f3a178.png+ 1',
  '- **అభివృద్ధి:** ప్రాధాన్యత క్రమంలో పనుల ప్రతిపాదన.',
  '- **ప్రజలు:** స్థానిక సమస్యల వివరాలు.',
  '- **నిధులు:** ప్రతిపాదనలను పరిశీలించాలని విజ్ఞప్తి.',
  'గ్రామంలో మౌలిక వసతులపై సమీక్ష జరిగింది.',
  'image_f3a178.png+ 2',
  'పనులను ప్రాధాన్యత క్రమంలో చేపట్టాలని సూచించారు. &#x20;'
].join('\n\n');

test('extracts one headline, six named impact strips and full body',()=>{
  const result=parseMagnetNews(article);
  assert.equal(result.headline,'ముత్తారం గ్రామ అభివృద్ధిపై ప్రత్యేక సమీక్ష');
  assert.equal(result.points.length,6);
  assert.equal(result.points[0].title,'రహదారులు');
  assert.match(result.points[0].description,/మరమ్మతులు/);
  assert.ok(!result.body.includes('image_f3a178'));
  assert.ok(!result.body.includes('&#x20;'));
  assert.equal(result.warnings.length,0);
});

test('does not invent missing news points',()=>{
  const result=parseMagnetNews('**ఒక శీర్షిక**\n- **అంశం:** వివరణ\n\nకథనం');
  assert.equal(result.points.length,1);
  assert.match(result.warnings.join(' '),/ఆరు/);
});

test('150 words maximum and photo required before publishing',()=>{
  const parsed=parseMagnetNews(article);
  assert.deepEqual(validateMagnetNews(parsed,true),[]);
  assert.ok(validateMagnetNews(parsed,false).some(x=>x.includes('Photo')));
  const long={...parsed,body:Array(151).fill('వార్త').join(' ')};
  assert.equal(newsWordCount(long.body),151);
  assert.ok(validateMagnetNews(long,true).some(x=>x.includes('150')));
});

test('published share text includes six points and full link',()=>{
  const parsed=parseMagnetNews(article);
  const text=magnetShareText({...parsed,location_town:'ముత్తారం'},'https://www.nexlifynucleus.in/news/magnet/ns-example');
  assert.match(text,/NS NEWS/);
  assert.match(text,/6\. నిధులు/);
  assert.match(text,/https:\/\/www\.nexlifynucleus\.in/);
});

test('theme and impact colors deterministic across refreshes',()=>{
  assert.deepEqual(impactColor(2,'శీర్షిక'),impactColor(2,'శీర్షిక'));
  assert.deepEqual(magnetTheme('auto','శీర్షిక'),magnetTheme('auto','శీర్షిక'));
});
