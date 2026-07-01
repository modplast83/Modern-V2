-- Modern AI agent tables. Idempotent (CREATE TABLE IF NOT EXISTS) so it is
-- safe to (re)apply on existing databases without dropping or altering data.

CREATE TABLE IF NOT EXISTS modern_agent_settings (
  id serial PRIMARY KEY,
  model varchar(100) NOT NULL DEFAULT 'gpt-5',
  default_language varchar(10) NOT NULL DEFAULT 'auto',
  base_persona text,
  temperature numeric(3,2) NOT NULL DEFAULT '0.30',
  max_tool_iterations integer NOT NULL DEFAULT 6,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modern_agent_tasks (
  id serial PRIMARY KEY,
  task_key varchar(80) NOT NULL UNIQUE,
  name_ar varchar(200) NOT NULL,
  name_en varchar(200) NOT NULL,
  description text,
  response_guidance text,
  language varchar(10) NOT NULL DEFAULT 'auto',
  allowed_tools text[] NOT NULL DEFAULT '{}'::text[],
  is_write boolean NOT NULL DEFAULT false,
  required_permission varchar(80),
  max_daily_interactions integer,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modern_agent_knowledge (
  id serial PRIMARY KEY,
  title varchar(300) NOT NULL,
  content text NOT NULL,
  category varchar(40) NOT NULL DEFAULT 'general',
  is_private boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modern_agent_profiles (
  id serial PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES users(id),
  display_name varchar(200),
  notes text,
  preferences jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modern_agent_access (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id),
  role_id integer REFERENCES roles(id),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modern_agent_conversations (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  title varchar(300),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_modern_agent_conv_user
  ON modern_agent_conversations (user_id);

CREATE TABLE IF NOT EXISTS modern_agent_messages (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL REFERENCES modern_agent_conversations(id),
  role varchar(20) NOT NULL,
  content text NOT NULL DEFAULT '',
  metadata jsonb,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_modern_agent_msg_conv
  ON modern_agent_messages (conversation_id);

CREATE TABLE IF NOT EXISTS modern_agent_usage (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  task_key varchar(80) NOT NULL,
  usage_date date NOT NULL,
  count integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_modern_agent_usage
  ON modern_agent_usage (user_id, task_key, usage_date);
