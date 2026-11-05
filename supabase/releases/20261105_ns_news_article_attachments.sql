-- NS News: add article-related media. Existing text news and categories are preserved.
-- Storage migration also closes existing anonymous write/delete access to news-images.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
BEGIN
  IF to_regclass('public.news_articles') IS NULL
     OR to_regprocedure('public.contractor_access_status()') IS NULL
     OR NOT EXISTS (SELECT 1 FROM contractor_private.admin_memberships WHERE enabled) THEN
    RAISE EXCEPTION 'NS News requires the current article table and verified owner membership';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='news-images' AND public)
     OR EXISTS (SELECT 1 FROM storage.buckets WHERE id='ns-news-videos')
     OR NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname='storage' AND tablename='objects' AND policyname='Public Access'
         AND cmd='ALL' AND roles='{public}'::name[]
     ) THEN
    RAISE EXCEPTION 'Storage configuration changed; stop and manually review policy drift';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='news_articles'
               AND column_name IN ('video_url','video_caption','media_gallery')) THEN
    RAISE EXCEPTION 'Article media columns already exist; review before applying';
  END IF;
END $preflight$;

ALTER TABLE public.news_articles
  ADD COLUMN video_url text,
  ADD COLUMN video_caption text,
  ADD COLUMN media_gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT news_media_gallery_limited CHECK (
    jsonb_typeof(media_gallery)='array' AND jsonb_array_length(media_gallery)<=6
  );

-- Public video bucket: MP4/WebM only, 40 MiB per upload; browser playback via public URL.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('ns-news-videos','ns-news-videos',true,41943040,ARRAY['video/mp4','video/webm']);

-- Replace old "anyone can upload/delete" policy. Public still sees uploaded photos.
DROP POLICY "Public Access" ON storage.objects;
CREATE POLICY "NS News media public read" ON storage.objects
  FOR SELECT TO anon,authenticated
  USING (bucket_id IN ('news-images','ns-news-videos'));
CREATE POLICY "NS News verified owner upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('news-images','ns-news-videos')
    AND COALESCE((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false)
  );
CREATE POLICY "NS News verified owner edit" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('news-images','ns-news-videos')
    AND COALESCE((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false)
  )
  WITH CHECK (
    bucket_id IN ('news-images','ns-news-videos')
    AND COALESCE((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false)
  );
CREATE POLICY "NS News verified owner remove" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('news-images','ns-news-videos')
    AND COALESCE((SELECT (public.contractor_access_status()->>'is_admin')::boolean),false)
  );

-- Do not touch the other storage bucket; its access model requires a separate audit.
COMMIT;
