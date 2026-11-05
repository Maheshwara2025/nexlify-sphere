import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {checkNewsFile, getYouTubeEmbedUrl, hasNewsVideo, NEWS_EXTRA_PHOTO_LIMIT} from '../src/lib/newsMedia.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root),'utf8');

test('NS News keeps text story as core category, plus optional related multimedia',()=>{
  const editor=read('src/routes/admin/news/+page.svelte');
  const listing=read('src/routes/news/+page.svelte');
  const full=read('src/routes/news/[id]/+page.svelte');
  for (const code of [editor,listing]) {
    assert.match(code, /స్థానిక వార్తలు/);
    assert.doesNotMatch(code, /వీడియో వార్తలు/);
  }
  assert.match(editor, /news_articles/);
  assert.match(editor, /image_url_2/);
  assert.match(editor, /media_gallery: gallery/);
  assert.match(editor, /video_url: videoUrl/);
  assert.match(editor, /videoMode === 'upload'/);
  assert.match(editor, /videoMode === 'youtube'/);
  assert.match(editor, /createContractorAccessGuard/);
  assert.match(full, /extraPhotos/);
  assert.match(full, /youtubeEmbedUrl/);
  assert.match(full, /<video/);
  assert.match(full, /<iframe/);
  assert.match(full, /formatNewsContent/);
  assert.match(listing, /hasNewsVideo/);
  assert.equal(NEWS_EXTRA_PHOTO_LIMIT,6);
});

test('strict YouTube IDs never accept arbitrary iframe domains',()=>{
  const expected='https://www.youtube-nocookie.com/embed/AbCdEf012_3';
  assert.equal(getYouTubeEmbedUrl('https://youtu.be/AbCdEf012_3'),expected);
  assert.equal(getYouTubeEmbedUrl('https://www.youtube.com/watch?v=AbCdEf012_3&t=8'),expected);
  assert.equal(getYouTubeEmbedUrl('https://youtube.com/shorts/AbCdEf012_3'),expected);
  assert.equal(getYouTubeEmbedUrl('https://youtube.com/live/AbCdEf012_3'),expected);
  for(const invalid of [
    'http://youtu.be/AbCdEf012_3',
    'https://youtube.com.evil.com/watch?v=AbCdEf012_3',
    'javascript:alert(1)',
    'https://example.com/watch?v=AbCdEf012_3',
    'https://youtu.be/not-valid',
    '',
    null
  ]) assert.equal(getYouTubeEmbedUrl(invalid),null);
  assert.equal(hasNewsVideo({youtube_url:'https://youtu.be/AbCdEf012_3'}),true);
  assert.equal(hasNewsVideo({video_url:'https://files.example/video.mp4'}),true);
  assert.equal(hasNewsVideo({youtube_url:'https://example.com/untrusted'}),false);
});

test('photo and direct video file sizes, types are checked',()=>{
  assert.equal(checkNewsFile({type:'image/jpeg',size:100},'image'),'jpg');
  assert.equal(checkNewsFile({type:'video/mp4',size:4000},'video'),'mp4');
  assert.throws(()=>checkNewsFile({type:'text/html',size:100},'image'));
  assert.throws(()=>checkNewsFile({type:'video/quicktime',size:100},'video'));
  assert.throws(()=>checkNewsFile({type:'video/mp4',size:41*1024*1024},'video'));
  assert.throws(()=>checkNewsFile({type:'image/png',size:9*1024*1024},'image'));
});

test('media migration preserves news and locks storage writes to verified owner',()=>{
  const migration=read('supabase/releases/20261105_ns_news_article_attachments.sql');
  assert.match(migration,/BEGIN;/);
  assert.match(migration,/COMMIT;/);
  assert.match(migration,/ADD COLUMN media_gallery jsonb/);
  assert.match(migration,/ADD COLUMN video_url text/);
  assert.match(migration,/news_media_gallery_limited/);
  assert.match(migration,/DROP POLICY "Public Access" ON storage.objects/);
  assert.match(migration,/FOR INSERT TO authenticated/);
  assert.match(migration,/contractor_access_status/);
  assert.match(migration,/ns-news-videos/);
  assert.doesNotMatch(migration,/DROP TABLE public.news_articles/);
});
