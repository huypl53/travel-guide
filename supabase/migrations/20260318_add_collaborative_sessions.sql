CREATE TABLE collaborative_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  trip_name text NOT NULL DEFAULT 'Untitled Trip',
  trip_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_collab_sessions_slug ON collaborative_sessions(slug);
CREATE INDEX idx_collab_sessions_expires ON collaborative_sessions(expires_at);

ALTER TABLE collaborative_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write via anon role (sessions are public by design)
CREATE POLICY "Allow public read collaborative sessions"
  ON collaborative_sessions FOR SELECT TO anon, authenticated
  USING (expires_at > now());

CREATE POLICY "Allow public insert collaborative sessions"
  ON collaborative_sessions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update collaborative sessions"
  ON collaborative_sessions FOR UPDATE TO anon, authenticated
  USING (expires_at > now());
