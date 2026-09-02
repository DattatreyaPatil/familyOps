revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
revoke execute on function public.user_can_access_family(uuid) from anon;
revoke execute on function public.user_can_access_family(uuid) from authenticated;
