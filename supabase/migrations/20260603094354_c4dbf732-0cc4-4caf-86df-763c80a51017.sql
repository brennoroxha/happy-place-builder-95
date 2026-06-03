CREATE POLICY "Backend can manage app settings"
ON public.app_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Backend can manage page events"
ON public.page_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Backend can manage sales"
ON public.sales
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);