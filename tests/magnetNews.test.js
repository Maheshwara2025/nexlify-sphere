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


test('recognizes six colorful points from plain Telugu paragraphs without dash markers',()=>{
  const input = [
    'రంగారెడ్డి జిల్లా అధికారిపై హైకోర్టు ఆదేశాలు',
    'తెలంగాణ హైకోర్టు అధికారికి సంబంధించిన అంశాన్ని పరిశీలించింది.',
    'రంగారెడ్డి జిల్లా పరిధిలో జరిగిన పరిణామాలను కోర్టు ప్రస్తావించింది.',
    'కోర్టు నిర్ణయం ప్రకారం సంబంధిత అధికారులు స్పందించాల్సి ఉంటుంది.',
    'ప్రభుత్వం తరఫున తదుపరి చర్యలపై వివరణ ఇచ్చారు.',
    'ప్రజలకు సంబంధించిన అంశాలపై ప్రత్యేక దృష్టి పెట్టాలని సూచించారు.',
    'పూర్తి ఉత్తర్వుల వివరాలు అందుబాటులో ఉన్నాయని తెలిపారు.',
    'తెలంగాణలో కోర్టు ఆదేశాలకు సంబంధించిన పరిణామం చర్చనీయాంశమైంది. ఈ విషయంలో సంబంధిత అధికారుల స్పందన కోసం ఎదురుచూస్తున్నారు.',
    'అధికారిక సమాచారం అందిన తర్వాత మరిన్ని వివరాలు వెల్లడవుతాయి.'
  ].join('\n\n');
  const parsed=parseMagnetNews(input);
  assert.equal(parsed.recognitionMode,'paragraphs');
  assert.equal(parsed.points.length,6);
  assert.equal(parsed.headline,'రంగారెడ్డి జిల్లా అధికారిపై హైకోర్టు ఆదేశాలు');
  assert.ok(parsed.points[0].title.length>0);
  assert.ok(parsed.points[0].description.length>0);
  assert.ok(parsed.body.startsWith('తెలంగాణలో కోర్టు'));
  assert.ok(!parsed.body.includes('ప్రభుత్వం తరఫున'));
  assert.deepEqual(validateMagnetNews(parsed,true),[]);
  assert.equal(new Set(parsed.points.map((_,i)=>impactColor(i,parsed.headline).ink)).size,6);
});

test('recognizes six unmarked text lines before body',()=>{
  const input = [
    'ఒక ముఖ్యమైన తెలంగాణ వార్త',
    'మొదటి అంశంలో గ్రామానికి సంబంధించిన వివరాలు ఇచ్చారు.',
    'రెండో అంశంలో అధికారుల సమీక్ష జరిగింది.',
    'మూడో అంశంలో ప్రజల అభిప్రాయాలు వినిపించారు.',
    'నాలుగో అంశంలో అభివృద్ధి పనులను ప్రస్తావించారు.',
    'ఐదో అంశంలో పరిశీలన నిర్వహించారు.',
    'ఆరో అంశంలో తదుపరి చర్యలు పేర్కొన్నారు.',
    'మొత్తం మీద ఈ వార్తకు సంబంధించిన పూర్తి కథనం ఇక్కడ ఉంటుంది.'
  ].join('\n');
  const parsed=parseMagnetNews(input);
  assert.equal(parsed.recognitionMode,'lines');
  assert.equal(parsed.points.length,6);
  assert.match(parsed.body,/పూర్తి కథనం/);
});

test('supports six bold Telugu labels without hyphen prefixes',()=>{
  const input=[
    '**వార్త ప్రధాన శీర్షిక**',
    '**ముఖ్య నిర్ణయం:** మొదటి అంశం వివరణ.',
    '**రెండో అంశం:** రెండో అంశం వివరణ.',
    '**మూడో అంశం:** మూడో అంశం వివరణ.',
    '**నాలుగో అంశం:** నాలుగో అంశం వివరణ.',
    '**ఐదో అంశం:** ఐదో అంశం వివరణ.',
    '**ఆరో అంశం:** ఆరో అంశం వివరణ.',
    'ఈ వార్తకు సంబంధించిన పూర్తి వివరాలు ఇక్కడ ఇవ్వబడ్డాయి.'
  ].join('\n\n');
  const parsed=parseMagnetNews(input);
  assert.equal(parsed.recognitionMode,'explicit');
  assert.equal(parsed.points.length,6);
  assert.equal(parsed.points[0].title,'ముఖ్య నిర్ణయం');
  assert.equal(parsed.points[0].description,'మొదటి అంశం వివరణ.');
});

test('does not manufacture six points from an ordinary short article',()=>{
  const input=[
    'సాధారణ వార్త శీర్షిక',
    'మొదటి పేరాగ్రాఫ్ వార్తా వివరణ.',
    'రెండో పేరాగ్రాఫ్ మరిన్ని వివరాలు.',
    'మూడో పేరాగ్రాఫ్ పూర్తి కథనం.'
  ].join('\n\n');
  const parsed=parseMagnetNews(input);
  assert.equal(parsed.points.length,0);
  assert.match(parsed.warnings.join(' '),/ఆరు/);
  assert.ok(parsed.body.includes('పేరాగ్రాఫ్'));
});
