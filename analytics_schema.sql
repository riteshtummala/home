-- ==========================================
-- ANALYTICS & VOLUNTEER PERFORMANCE LOG (Phase 10)
-- ==========================================

-- Create an audit table mapping every successful scan to the specific volunteer who executed it
CREATE TABLE IF NOT EXISTS public.ticket_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on row level security
ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;

-- Allow volunteers and admins to INSERT records when they successfully process a scan
-- NOTE: In a true zero-trust enterprise deployment we'd proxy this via RPC to ensure they aren't spoofing the ticket_id,
-- but for this MVP, RLS INSERTs are permitted if you have the role.
CREATE POLICY "Admins and Volunteers can insert scan logs"
  ON public.ticket_scans FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'volunteer')
  );

-- Only Admins who created the Event can SELECT the scan logs for that specific event
CREATE POLICY "Admins can view scans for their events"
  ON public.ticket_scans FOR SELECT
  USING (
    EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id AND e.created_by = auth.uid()
    )
  );
