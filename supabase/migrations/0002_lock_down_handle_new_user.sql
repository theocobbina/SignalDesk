-- handle_new_user() is only meant to run as the auth.users trigger,
-- not be callable through the public API (/rest/v1/rpc).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
