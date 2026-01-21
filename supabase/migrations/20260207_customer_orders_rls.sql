-- Allow authenticated users to read their own orders and related records
-- without exposing other customers' data. Keeps service-role policy intact.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'orders' and policyname = 'customer can view own orders'
  ) then
    create policy "customer can view own orders"
    on public.orders
    for select
    to authenticated
    using (
      (
        contact_email is not null
        and lower(contact_email) = lower(auth.email())
      )
      or (
        contact_phone is not null
        and regexp_replace(contact_phone, '\\D', '', 'g') =
          regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\\D', '', 'g')
      )
      or (
        customer_id is not null
        and exists (
          select 1 from public.customers c
          where c.id = customer_id
            and c.auth_user_id = auth.uid()
        )
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'order_items' and policyname = 'customer can view own order items'
  ) then
    create policy "customer can view own order items"
    on public.order_items
    for select
    to authenticated
    using (
      exists (
        select 1 from public.orders o
        where o.id = order_items.order_id
          and (
            (
              o.contact_email is not null
              and lower(o.contact_email) = lower(auth.email())
            )
            or (
              o.contact_phone is not null
              and regexp_replace(o.contact_phone, '\\D', '', 'g') =
                regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\\D', '', 'g')
            )
            or (
              o.customer_id is not null
              and exists (
                select 1 from public.customers c
                where c.id = o.customer_id
                  and c.auth_user_id = auth.uid()
              )
            )
          )
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'order_events' and policyname = 'customer can view own order events'
  ) then
    create policy "customer can view own order events"
    on public.order_events
    for select
    to authenticated
    using (
      exists (
        select 1 from public.orders o
        where o.id = order_events.order_id
          and (
            (
              o.contact_email is not null
              and lower(o.contact_email) = lower(auth.email())
            )
            or (
              o.contact_phone is not null
              and regexp_replace(o.contact_phone, '\\D', '', 'g') =
                regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\\D', '', 'g')
            )
            or (
              o.customer_id is not null
              and exists (
                select 1 from public.customers c
                where c.id = o.customer_id
                  and c.auth_user_id = auth.uid()
              )
            )
          )
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'courier_tasks' and policyname = 'customer can view own courier tasks'
  ) then
    create policy "customer can view own courier tasks"
    on public.courier_tasks
    for select
    to authenticated
    using (
      exists (
        select 1 from public.orders o
        where o.id = courier_tasks.order_id
          and (
            (
              o.contact_email is not null
              and lower(o.contact_email) = lower(auth.email())
            )
            or (
              o.contact_phone is not null
              and regexp_replace(o.contact_phone, '\\D', '', 'g') =
                regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\\D', '', 'g')
            )
            or (
              o.customer_id is not null
              and exists (
                select 1 from public.customers c
                where c.id = o.customer_id
                  and c.auth_user_id = auth.uid()
              )
            )
          )
      )
    );
  end if;
end $$;
