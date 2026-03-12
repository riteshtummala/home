-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLES
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    reg_number TEXT UNIQUE,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'organizer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    location TEXT,
    event_date DATE,
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    banner_url TEXT,
    capacity INTEGER DEFAULT 100,
    registration_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'confirmed',
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.event_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- INDEXES
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.registrations(user_id);


-- STORAGE
-- Create event-images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create event-files bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event-files', 'event-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Anyone can view event-images
CREATE POLICY "Public Access for event-images" ON storage.objects FOR SELECT TO public USING ( bucket_id = 'event-images' );
-- Authenticated users can upload event-images
CREATE POLICY "Auth Upload for event-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'event-images' );

-- Anyone can view event-files
CREATE POLICY "Public Access for event-files" ON storage.objects FOR SELECT TO public USING ( bucket_id = 'event-files' );
-- Authenticated users can upload event-files
CREATE POLICY "Auth Upload for event-files" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'event-files' );


-- FUNCTIONS

-- 1 AUTO USER PROFILE CREATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    'student'
  );
  RETURN new;
END;
$$;

-- 2 TRIGGER FUNCTION FOR AUTO UPDATE TIMESTAMP (Events)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3 INCREMENT REGISTRATION COUNT
CREATE OR REPLACE FUNCTION public.increment_event_registration_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.events
  SET registration_count = registration_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$;

-- 4 DECREMENT REGISTRATION COUNT
CREATE OR REPLACE FUNCTION public.decrement_event_registration_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.events
  SET registration_count = registration_count - 1
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$;

-- 5 EVENT CAPACITY CHECK
CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_capacity INTEGER;
  max_capacity INTEGER;
BEGIN
  SELECT registration_count, capacity INTO current_capacity, max_capacity
  FROM public.events
  WHERE id = NEW.event_id;

  IF current_capacity >= max_capacity THEN
    RAISE EXCEPTION 'Event is full';
  END IF;

  RETURN NEW;
END;
$$;


-- TRIGGERS

-- Trigger 1: Auto profile creation on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto update timestamp for events
DROP TRIGGER IF EXISTS handle_updated_at_events ON public.events;
CREATE TRIGGER handle_updated_at_events
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Trigger 2: Check capacity before insert
DROP TRIGGER IF EXISTS enforce_capacity_before_registration ON public.registrations;
CREATE TRIGGER enforce_capacity_before_registration
  BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE PROCEDURE public.check_event_capacity();

-- Trigger 3: Increment count after insert
DROP TRIGGER IF EXISTS increment_count_after_registration ON public.registrations;
CREATE TRIGGER increment_count_after_registration
  AFTER INSERT ON public.registrations
  FOR EACH ROW EXECUTE PROCEDURE public.increment_event_registration_count();

-- Trigger 4: Decrement count after delete
DROP TRIGGER IF EXISTS decrement_count_after_registration_delete ON public.registrations;
CREATE TRIGGER decrement_count_after_registration_delete
  AFTER DELETE ON public.registrations
  FOR EACH ROW EXECUTE PROCEDURE public.decrement_event_registration_count();


-- ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_files ENABLE ROW LEVEL SECURITY;


-- POLICIES

-- USERS TABLE POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users 
  FOR SELECT TO authenticated 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users" ON public.users 
  FOR SELECT TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users" ON public.users 
  FOR UPDATE TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- EVENTS TABLE POLICIES
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
CREATE POLICY "Anyone can view events" ON public.events 
  FOR SELECT TO public 
  USING (true);

DROP POLICY IF EXISTS "Organizers and Admins can create events" ON public.events;
CREATE POLICY "Organizers and Admins can create events" ON public.events 
  FOR INSERT TO authenticated 
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('organizer', 'admin')
  );

DROP POLICY IF EXISTS "Organizers can edit own events" ON public.events;
CREATE POLICY "Organizers can edit own events" ON public.events 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can edit any event" ON public.events;
CREATE POLICY "Admins can edit any event" ON public.events 
  FOR UPDATE TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Organizers can delete own events" ON public.events;
CREATE POLICY "Organizers can delete own events" ON public.events 
  FOR DELETE TO authenticated 
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can delete any event" ON public.events;
CREATE POLICY "Admins can delete any event" ON public.events 
  FOR DELETE TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- REGISTRATION POLICIES
DROP POLICY IF EXISTS "Users can view own registrations" ON public.registrations;
CREATE POLICY "Users can view own registrations" ON public.registrations 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all registrations" ON public.registrations;
CREATE POLICY "Admins can view all registrations" ON public.registrations 
  FOR SELECT TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Event creators can view their event registrations" ON public.registrations;
CREATE POLICY "Event creators can view their event registrations" ON public.registrations 
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = registrations.event_id AND events.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can register themselves" ON public.registrations;
CREATE POLICY "Users can register themselves" ON public.registrations 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own registration" ON public.registrations;
CREATE POLICY "Users can delete own registration" ON public.registrations 
  FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any registration" ON public.registrations;
CREATE POLICY "Admins can delete any registration" ON public.registrations 
  FOR DELETE TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- EVENT FILES POLICIES
DROP POLICY IF EXISTS "Anyone can view event files" ON public.event_files;
CREATE POLICY "Anyone can view event files" ON public.event_files 
  FOR SELECT TO public 
  USING (true);

DROP POLICY IF EXISTS "Admins and Event creators can upload files" ON public.event_files;
CREATE POLICY "Admins and Event creators can upload files" ON public.event_files 
  FOR INSERT TO authenticated 
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR 
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_files.event_id AND events.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and Event creators can delete files" ON public.event_files;
CREATE POLICY "Admins and Event creators can delete files" ON public.event_files 
  FOR DELETE TO authenticated 
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR 
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_files.event_id AND events.created_by = auth.uid()
    )
  );


-- REALTIME
-- Adding tables to the supabase_realtime publication
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
