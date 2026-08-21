-- Align the current floor role name with the legacy receiving RPC permission.
-- Existing `employee` memberships remain valid for backward compatibility.

do $migration$
declare
  receiving_function oid;
  function_definition text;
  employee_literal constant text := '''employee''';
  operator_literal constant text := '''operator''';
  employee_literal_count integer;
begin
  select p.oid
    into receiving_function
  from pg_proc p
  join pg_namespace namespace on namespace.oid = p.pronamespace
  where namespace.nspname = 'public'
    and p.proname = 'receive_inbound_units'
  limit 1;

  if receiving_function is null then
    raise notice 'receive_inbound_units is not installed; role alignment skipped.';
    return;
  end if;

  select pg_get_functiondef(receiving_function)
    into function_definition;

  if position(operator_literal in function_definition) > 0 then
    return;
  end if;

  employee_literal_count :=
    (length(function_definition) - length(replace(function_definition, employee_literal, '')))
    / length(employee_literal);

  if employee_literal_count <> 1 then
    raise exception
      'Expected one legacy employee role literal in receiving authorization, found %.',
      employee_literal_count;
  end if;

  execute replace(
    function_definition,
    employee_literal,
    '''operator'', ''employee'''
  );
end
$migration$;

revoke all on function public.receive_inbound_units(
  uuid,
  uuid,
  integer,
  integer,
  text,
  text
) from public, anon;

grant execute on function public.receive_inbound_units(
  uuid,
  uuid,
  integer,
  integer,
  text,
  text
) to authenticated;
