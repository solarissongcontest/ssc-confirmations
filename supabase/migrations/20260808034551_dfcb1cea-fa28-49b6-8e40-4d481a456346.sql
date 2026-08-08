
revoke all on function public.sync_round_stats() from public, anon, authenticated;
revoke all on function public.sync_round_stats_row() from public, anon, authenticated;
revoke all on function public.round_availability(uuid) from public, anon, authenticated;
revoke all on function public.submit_confirmation(jsonb) from public, anon, authenticated;
grant execute on function public.round_availability(uuid) to service_role;
grant execute on function public.submit_confirmation(jsonb) to service_role;
