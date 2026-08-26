-- LiftNex schema 5: professional mode and Coach audit data.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'athlete';

CREATE TABLE IF NOT EXISTS trainer_invites (
  code TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  used_at TEXT,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS trainer_invites_trainer_idx ON trainer_invites(trainer_id);

CREATE TABLE IF NOT EXISTS trainer_athletes (
  trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created TEXT NOT NULL,
  PRIMARY KEY (trainer_id, athlete_id)
);
CREATE INDEX IF NOT EXISTS trainer_athletes_athlete_idx ON trainer_athletes(athlete_id);

CREATE TABLE IF NOT EXISTS signed_plan_packages (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  package_json TEXT NOT NULL,
  signature TEXT NOT NULL,
  created TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS signed_plan_packages_athlete_idx ON signed_plan_packages(athlete_id);

CREATE TABLE IF NOT EXISTS coach_usage (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  window_started INTEGER NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0
);
