-- Links a maintenance task back to the binder appliance it was generated
-- for (nullable — most tasks come from the whole-home generator or manual
-- entry and have no single appliance behind them). Lets "Shop on Amazon"
-- skip re-asking for brand/model the app already knows from the binder item,
-- and use the AI's already-appliance-specific products_search_term directly.
ALTER TABLE public.maintenance_tasks
  ADD COLUMN IF NOT EXISTS binder_item_id uuid REFERENCES public.home_binder_items(id) ON DELETE SET NULL;
