-- READ-ONLY CATALOG VERIFICATION. Do not run without separate authorization.
-- No application rows, auth identities, password values, or storage objects are selected.
-- Capture all result sets privately. Missing rows/permissions are blockers, not proof of safety.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';

-- 1. Nine required legacy tables; missing tables remain visible as NULL.
WITH targets AS (
  SELECT unnest(ARRAY[
    'contractor_transactions', 'contractor_loans', 'contractor_labour_profiles',
    'contractor_piecework', 'contractor_mbook', 'contractor_daily_works',
    'contractor_labour', 'contractor_materials', 'contractor_parties'
  ]) AS table_name
)
SELECT t.table_name, c.oid IS NOT NULL AS exists, c.relkind,
       pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM targets t LEFT JOIN pg_class c ON c.oid = to_regclass('public.' || t.table_name)
ORDER BY t.table_name;

-- 2. Complete columns/types/defaults, constraints, indexes and triggers for type preflight.
SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name,
       format_type(a.atttypid, a.atttypmod) AS sql_type, a.attnotnull,
       a.attidentity, a.attgenerated, pg_get_expr(d.adbin, d.adrelid) AS default_expression
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE n.nspname = 'public' AND c.relname IN (
 'contractor_transactions','contractor_loans','contractor_labour_profiles',
 'contractor_piecework','contractor_mbook','contractor_daily_works',
 'contractor_labour','contractor_materials','contractor_parties')
ORDER BY c.relname, a.attnum;

SELECT k.conrelid::regclass::text AS relation_name, k.conname, k.contype,
       k.convalidated, k.condeferrable, k.condeferred, pg_get_constraintdef(k.oid, true) AS definition
FROM pg_constraint k WHERE k.conrelid IN (
 SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relname LIKE 'contractor_%')
ORDER BY relation_name, k.conname;

SELECT i.indrelid::regclass::text AS relation_name, i.indisvalid, i.indisunique,
       pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index i WHERE i.indrelid IN (
 SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relname LIKE 'contractor_%')
ORDER BY relation_name, definition;

SELECT t.tgrelid::regclass::text AS relation_name, t.tgname, t.tgenabled,
       pg_get_triggerdef(t.oid, true) AS definition, t.tgfoid::regprocedure::text AS routine
FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid IN (
 SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE (n.nspname = 'public' AND c.relname LIKE 'contractor_%')
    OR (n.nspname = 'storage' AND c.relname IN ('objects','buckets')))
ORDER BY relation_name, t.tgname;

-- 3. Explicit/default table ACLs, INCLUDING PUBLIC (grantee OID zero).
SELECT n.nspname, c.relname, CASE WHEN x.grantee = 0 THEN 'PUBLIC'
       ELSE pg_get_userbyid(x.grantee) END AS grantee,
       pg_get_userbyid(x.grantor) AS grantor, x.privilege_type, x.is_grantable
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x
WHERE (n.nspname = 'public' AND c.relname LIKE 'contractor_%')
   OR (n.nspname = 'storage' AND c.relname IN ('objects','buckets'))
ORDER BY n.nspname, c.relname, grantee, x.privilege_type;

SELECT n.nspname, c.relname, a.attname,
       CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
       x.privilege_type, x.is_grantable
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
CROSS JOIN LATERAL aclexplode(a.attacl) x
WHERE n.nspname = 'public' AND c.relname LIKE 'contractor_%'
ORDER BY c.relname, a.attname, grantee;

-- Effective privileges include inherited and PUBLIC grants for the two browser roles.
SELECT r.rolname, c.oid::regclass::text AS relation_name, v.privilege,
       has_table_privilege(r.oid, c.oid, v.privilege) AS effective_table_privilege
FROM pg_roles r CROSS JOIN pg_class c
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) v(privilege)
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE r.rolname IN ('anon','authenticated') AND n.nspname = 'public'
  AND c.relname LIKE 'contractor_%'
ORDER BY r.rolname, c.relname, v.privilege;

SELECT n.nspname, CASE WHEN x.grantee = 0 THEN 'PUBLIC'
       ELSE pg_get_userbyid(x.grantee) END AS grantee,
       x.privilege_type, x.is_grantable
FROM pg_namespace n
CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) x
WHERE n.nspname IN ('public','contractor_private','contractor_finance_v2','storage','auth')
ORDER BY n.nspname, grantee, x.privilege_type;

-- 4. All commands, role lists, permissive/restrictive flags and complete expressions.
SELECT n.nspname, c.relname, p.polname, p.polcmd, p.polpermissive,
       ARRAY(SELECT CASE WHEN role_oid = 0 THEN 'PUBLIC'
                   ELSE pg_get_userbyid(role_oid) END
             FROM unnest(p.polroles) role_oid) AS roles,
       pg_get_expr(p.polqual, p.polrelid) AS using_expression,
       pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression
FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'public' AND c.relname LIKE 'contractor_%')
   OR n.nspname IN ('contractor_private','contractor_finance_v2')
   OR (n.nspname = 'storage' AND c.relname IN ('objects','buckets'))
ORDER BY n.nspname, c.relname, p.polname;

-- 5. Privileged/custom routines, execution grants and definition fingerprints.
-- Do NOT print bodies automatically: existing routines may embed credentials.
-- An owner must review redacted bodies, including dynamic SQL and reachable definer calls.
SELECT p.oid::regprocedure::text AS routine, n.nspname, p.prokind,
       pg_get_userbyid(p.proowner) AS owner, p.prosecdef AS security_definer,
       p.provolatile, p.proconfig AS fixed_settings, l.lanname,
       md5(p.prosrc) AS source_fingerprint,
       CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
       x.privilege_type, x.is_grantable
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND (p.prosecdef OR n.nspname IN ('public','contractor_private','contractor_finance_v2')
       OR p.proname ~* '(admin|membership|contractor)')
ORDER BY routine, grantee;

SELECT pg_get_userbyid(d.defaclrole) AS owner, n.nspname, d.defaclobjtype,
       CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
       x.privilege_type, x.is_grantable
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) x
ORDER BY owner, n.nspname, d.defaclobjtype, grantee;

-- 6. Trust mapping candidates and role inheritance (metadata only; NO membership user IDs).
SELECT n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND c.relname ~* '(admin|member|role)'
ORDER BY n.nspname, c.relname;

SELECT r.rolname, r.rolsuper, r.rolbypassrls, r.rolinherit, r.rolcanlogin
FROM pg_roles r
WHERE r.rolname IN ('anon','authenticated','service_role','postgres')
   OR r.rolsuper OR r.rolbypassrls
ORDER BY r.rolname;

SELECT pg_get_userbyid(m.roleid) AS granted_role, pg_get_userbyid(m.member) AS member_role,
       m.admin_option
FROM pg_auth_members m
ORDER BY granted_role, member_role;

-- Config may be unset at SQL-session level. Confirm API-exposed schemas in the dashboard separately.
SELECT current_setting('pgrst.db_schemas', true) AS session_api_schema_setting;

-- 7. Freeze the nine-table catalog snapshot for a reviewed proposal preflight.
-- This fingerprint is drift detection, not proof of correct authorization.

WITH targets AS (
  SELECT unnest(ARRAY[
    'contractor_transactions', 'contractor_loans', 'contractor_labour_profiles',
    'contractor_piecework', 'contractor_mbook', 'contractor_daily_works',
    'contractor_labour', 'contractor_materials', 'contractor_parties'
  ]) AS table_name
), snapshot AS (
  SELECT t.table_name, c.oid::text AS table_oid, c.relkind, c.relrowsecurity,
         c.relforcerowsecurity, c.relowner::regrole::text AS owner,
         c.relacl::text AS table_acl,
         (SELECT jsonb_agg(jsonb_build_object(
            'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
            'not_null', a.attnotnull, 'acl', a.attacl::text,
            'default', pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum)
          FROM pg_attribute a LEFT JOIN pg_attrdef d
            ON d.adrelid = a.attrelid AND d.adnum = a.attnum
          WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
         (SELECT jsonb_agg(jsonb_build_object(
            'name', p.polname, 'command', p.polcmd, 'permissive', p.polpermissive,
            'roles', p.polroles::text, 'using', pg_get_expr(p.polqual, p.polrelid),
            'check', pg_get_expr(p.polwithcheck, p.polrelid)) ORDER BY p.polname)
          FROM pg_policy p WHERE p.polrelid = c.oid) AS policies,
         (SELECT jsonb_agg(pg_get_constraintdef(k.oid, true) ORDER BY k.conname)
          FROM pg_constraint k WHERE k.conrelid = c.oid) AS constraints,
         (SELECT jsonb_agg(pg_get_triggerdef(g.oid, true) ORDER BY g.tgname)
          FROM pg_trigger g WHERE g.tgrelid = c.oid AND NOT g.tgisinternal) AS triggers
  FROM targets t LEFT JOIN pg_class c ON c.oid = to_regclass('public.' || t.table_name)
)
SELECT md5(coalesce(jsonb_agg(to_jsonb(snapshot) ORDER BY table_name)::text, '[]')) AS security_fingerprint
FROM snapshot
;

ROLLBACK;

