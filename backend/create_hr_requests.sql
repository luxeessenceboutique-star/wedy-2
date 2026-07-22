-- Execute this SQL in your Supabase Dashboard > SQL Editor --

CREATE TABLE IF NOT EXISTS public.hr_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending'::text, -- 'pending', 'approved', 'rejected'
    notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.hr_requests ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable read access for all authenticated users" 
ON public.hr_requests 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
ON public.hr_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
ON public.hr_requests 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Enable delete access for authenticated users" 
ON public.hr_requests 
FOR DELETE 
TO authenticated 
USING (true);
