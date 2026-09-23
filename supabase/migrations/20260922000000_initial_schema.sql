-- ==================================================
-- JAL RAKSHAK AI — SUPABASE INITIAL DATABASE MIGRATION
-- Migration Version: 20260922000000_initial_schema.sql
-- ==================================================

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------
-- 1. PROFILES TABLE
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'citizen' CHECK (role IN ('citizen', 'field_worker', 'panchayat', 'admin')),
  village TEXT DEFAULT 'Shivpur',
  ward TEXT DEFAULT 'ward-3',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------
-- 2. WATER SOURCES TABLE
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.water_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  village TEXT DEFAULT 'Shivpur',
  ward TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------
-- 3. WATER REPORTS TABLE
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.water_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_id UUID REFERENCES public.water_sources(id) ON DELETE SET NULL,
  issue_category TEXT NOT NULL CHECK (
    issue_category IN (
      'water_quality', 'bad_smell', 'unusual_color', 'low_supply', 
      'leakage', 'handpump_failure', 'pipeline_failure', 'contamination', 
      'illness_cluster', 'other', 'smell_colour', 'sewage_mixing'
    )
  ),
  description TEXT,
  language TEXT DEFAULT 'en',
  severity INTEGER DEFAULT 1,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  village TEXT DEFAULT 'Shivpur',
  ward TEXT,
  photo_url TEXT,
  offline_created BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'open' CHECK (
    status IN ('open', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed', 'pending', 'saved_offline', 'verified', 'reopened')
  ),
  verification_status TEXT DEFAULT 'unverified',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------
-- 4. RISK SCORES TABLE
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.water_reports(id) ON DELETE CASCADE,
  risk_score NUMERIC(5,2) NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence NUMERIC(5,2),
  severity_factor NUMERIC(5,2),
  frequency_factor NUMERIC(5,2),
  recurrence_factor NUMERIC(5,2),
  persistence_factor NUMERIC(5,2),
  reach_factor NUMERIC(5,2),
  explanation JSONB,
  model_version TEXT DEFAULT 'rule-based-v1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------
-- 5. TASKS TABLE
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.water_reports(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------
-- 6. INSPECTIONS TABLE
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  result TEXT,
  water_quality_status TEXT,
  observations TEXT,
  evidence_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------
-- 7. FEEDBACK TABLE
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.water_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  resolved BOOLEAN,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------
-- 8. NOTIFICATIONS TABLE
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  related_report_id UUID REFERENCES public.water_reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------
-- 9. AUDIT LOGS TABLE
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- DATABASE INDEXES
-- ==================================================
CREATE INDEX IF NOT EXISTS idx_water_reports_user_id ON public.water_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_water_reports_source_id ON public.water_reports(source_id);
CREATE INDEX IF NOT EXISTS idx_water_reports_status ON public.water_reports(status);
CREATE INDEX IF NOT EXISTS idx_water_reports_issue_category ON public.water_reports(issue_category);
CREATE INDEX IF NOT EXISTS idx_water_reports_ward ON public.water_reports(ward);
CREATE INDEX IF NOT EXISTS idx_water_reports_created_at ON public.water_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_risk_scores_report_id ON public.risk_scores(report_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_risk_level ON public.risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_inspections_task_id ON public.inspections(task_id);
CREATE INDEX IF NOT EXISTS idx_feedback_report_id ON public.feedback(report_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- ==================================================
-- HELPER FUNCTIONS & SIGNUP TRIGGER
-- ==================================================

-- Helper function to fetch user role safely
CREATE OR REPLACE FUNCTION public.get_user_role(user_uid UUID)
RETURNS TEXT AS $$
DECLARE
  u_role TEXT;
BEGIN
  SELECT role INTO u_role FROM public.profiles WHERE id = user_uid;
  RETURN COALESCE(u_role, 'citizen');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Automatically create profile entry when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, village, ward)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Citizen User'),
    NEW.raw_user_meta_data->>'phone',
    'citizen', -- Always default to citizen for security
    COALESCE(NEW.raw_user_meta_data->>'village', 'Shivpur'),
    COALESCE(NEW.raw_user_meta_data->>'ward', 'ward-3')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger execution on auth.users signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
CREATE POLICY "Profiles read access" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR public.get_user_role(auth.uid()) IN ('panchayat', 'admin', 'field_worker')
  );

CREATE POLICY "Profiles insert access" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles update access" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR public.get_user_role(auth.uid()) = 'admin'
  );

-- 2. Water Sources RLS
CREATE POLICY "Water sources viewable by authenticated users" ON public.water_sources
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Water sources manageable by panchayat and admin" ON public.water_sources
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('panchayat', 'admin'));

-- 3. Water Reports RLS
CREATE POLICY "Citizens read own reports or authorities read ward reports" ON public.water_reports
  FOR SELECT USING (
    auth.uid() = user_id 
    OR public.get_user_role(auth.uid()) IN ('panchayat', 'field_worker', 'admin')
    OR auth.role() IN ('authenticated', 'anon')
  );

CREATE POLICY "Authenticated users insert reports" ON public.water_reports
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'authenticated'
  );

CREATE POLICY "Authorities or owners update reports" ON public.water_reports
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR public.get_user_role(auth.uid()) IN ('panchayat', 'field_worker', 'admin')
  );

-- 4. Risk Scores RLS
CREATE POLICY "Risk scores viewable by report owners and authorities" ON public.risk_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.water_reports wr 
      WHERE wr.id = risk_scores.report_id 
        AND (wr.user_id = auth.uid() OR public.get_user_role(auth.uid()) IN ('panchayat', 'field_worker', 'admin'))
    )
  );

CREATE POLICY "Risk scores manageable by system or authorities" ON public.risk_scores
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Tasks RLS
CREATE POLICY "Tasks viewable by assigned worker, panchayat, or admin" ON public.tasks
  FOR SELECT USING (
    assigned_to = auth.uid() 
    OR assigned_by = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('panchayat', 'admin')
  );

CREATE POLICY "Panchayat and admin insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) IN ('panchayat', 'admin'));

CREATE POLICY "Assigned worker or panchayat update tasks" ON public.tasks
  FOR UPDATE USING (
    assigned_to = auth.uid() 
    OR public.get_user_role(auth.uid()) IN ('panchayat', 'admin')
  );

-- 6. Inspections RLS
CREATE POLICY "Inspections viewable by task assignees and authorities" ON public.inspections
  FOR SELECT USING (
    inspector_id = auth.uid() 
    OR public.get_user_role(auth.uid()) IN ('panchayat', 'admin', 'field_worker')
  );

CREATE POLICY "Field workers insert inspections" ON public.inspections
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) IN ('field_worker', 'panchayat', 'admin'));

-- 7. Feedback RLS
CREATE POLICY "Feedback viewable by report owner and authorities" ON public.feedback
  FOR SELECT USING (
    user_id = auth.uid() 
    OR public.get_user_role(auth.uid()) IN ('panchayat', 'admin')
  );

CREATE POLICY "Report owners submit feedback" ON public.feedback
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR auth.role() = 'authenticated'
  );

-- 8. Notifications RLS
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- 9. Audit Logs RLS
CREATE POLICY "Audit logs viewable by admin only" ON public.audit_logs
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- ==================================================
-- STORAGE BUCKETS SETUP & POLICIES
-- ==================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('inspection-evidence', 'inspection-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Objects Policies
CREATE POLICY "Allow public read access to report images" ON storage.objects
  FOR SELECT USING (bucket_id IN ('report-images', 'inspection-evidence'));

CREATE POLICY "Allow authenticated users to upload report images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'report-images' AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );

CREATE POLICY "Allow field workers to upload inspection evidence" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'inspection-evidence' AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );
