PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE features (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  desc_en TEXT,
  desc_vi TEXT,
  votes_up INTEGER DEFAULT 0,
  votes_down INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
, role TEXT DEFAULT 'user', status TEXT DEFAULT 'active');
INSERT INTO "users" ("id","email","name","avatar_url","created_at","last_login_at","role","status") VALUES('07611d9c-59a0-452f-8485-4afa3f8e0615','sso-71139@sso.local',NULL,NULL,1788332172700,1788332172817,'user','active');
INSERT INTO "users" ("id","email","name","avatar_url","created_at","last_login_at","role","status") VALUES('a32782ea-8a5a-4733-84c2-5bf0dae438ab','sso-lumina-user-42@sso.local',NULL,NULL,1788332409159,1788332409506,'user','active');
INSERT INTO "users" ("id","email","name","avatar_url","created_at","last_login_at","role","status") VALUES('07475c04-f822-47f5-9b78-e627a93a26d6','sso-2@sso.local',NULL,NULL,1788345196540,1788355228590,'user','active');
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO "user_sessions" ("id","user_id","token","expires_at","created_at") VALUES('b669f69b-6288-4610-8b4f-3e6821d69c71','07611d9c-59a0-452f-8485-4afa3f8e0615','9c7e75c4-858a-4c7d-9076-9d48a2f86b3eb3986e3f-8a62-4a8b-a4e1-9a488ee6929c',1788333072773,1788332172773);
INSERT INTO "user_sessions" ("id","user_id","token","expires_at","created_at") VALUES('4be1ac70-b3b6-499d-8833-4f8d5750e27d','a32782ea-8a5a-4733-84c2-5bf0dae438ab','da7210e3-8b75-4cc1-92d4-d6830ff76ce5c27ccd43-b911-4d11-b31d-0a5394dedb96',1788333309464,1788332409464);
INSERT INTO "user_sessions" ("id","user_id","token","expires_at","created_at") VALUES('5534c336-8004-4585-9e71-2f72b9d1c307','07475c04-f822-47f5-9b78-e627a93a26d6','690db1ab-18af-44d1-8a29-694d84b359e9ddbd7802-610e-42f9-8278-84027e4ae082',1788346097640,1788345197640);
INSERT INTO "user_sessions" ("id","user_id","token","expires_at","created_at") VALUES('9578ecea-b6b2-4507-a3c7-ce61138fcdee','07475c04-f822-47f5-9b78-e627a93a26d6','4328c14b-434d-4005-b15a-442d822d4891cacadaf7-5d62-40f1-ab15-73dcefd724b8',1788349438697,1788348538697);
INSERT INTO "user_sessions" ("id","user_id","token","expires_at","created_at") VALUES('da92274d-6bb6-4aba-b984-6f43c27b42b3','07475c04-f822-47f5-9b78-e627a93a26d6','10df7ee8-e69c-4f4f-935e-b86aec135cf8ba0b927f-5a80-4bed-9bb9-7d1f71895588',1788356128243,1788355228243);
CREATE TABLE feature_suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  desc_en TEXT,
  desc_vi TEXT,
  status TEXT DEFAULT 'pending',
  approved_feature_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL, reviewed_by TEXT, reviewed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_feature_id) REFERENCES features(id) ON DELETE SET NULL
);
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL, status TEXT DEFAULT 'active', moderated_by TEXT, moderated_at INTEGER,
  FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL,
  user_id TEXT,
  fingerprint TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK(vote_type IN ('up', 'down')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE admin_emails (
  email TEXT PRIMARY KEY,
  added_at INTEGER NOT NULL,
  added_by TEXT
);
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_suggestions_user ON feature_suggestions(user_id);
CREATE INDEX idx_suggestions_status ON feature_suggestions(status);
CREATE INDEX idx_suggestions_created ON feature_suggestions(created_at DESC);
CREATE INDEX idx_comments_feature ON comments(feature_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
CREATE INDEX idx_comments_is_admin ON comments(is_admin);
CREATE INDEX idx_votes_feature ON votes(feature_id);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_votes_fingerprint ON votes(fingerprint);
CREATE INDEX idx_votes_created ON votes(created_at);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_comments_status ON comments(status);
