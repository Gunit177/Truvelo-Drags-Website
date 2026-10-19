-- Run in the SQL Editor AFTER setup. Read-only inspection: all four tables
-- should have rowsecurity=true. No anon table grants should be returned.
select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in ('profiles','events','race_results','quote_requests');
select tablename, policyname, roles, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename in ('profiles','events','race_results','quote_requests');
select grantee, table_name, privilege_type from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
and table_name in ('profiles','events','race_results','quote_requests')
order by table_name,grantee,privilege_type;
