--liquibase formatted sql

--changeset sena:012-add-user-global-role
ALTER TABLE users ADD COLUMN IF NOT EXISTS global_role VARCHAR(50) NOT NULL DEFAULT 'USER';
UPDATE users SET global_role = 'ADMIN' WHERE role = 'ROLE_ADMINISTRADOR' OR email = 'admin@velocity.dev';

--changeset sena:013-create-project-memberships-table
CREATE TABLE IF NOT EXISTS project_memberships (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    scrum_role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_memberships_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_memberships_project_user UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_project ON project_memberships(project_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON project_memberships(user_id);

--changeset sena:014-create-epics-table
CREATE TABLE IF NOT EXISTS epics (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    color_hex VARCHAR(10) NOT NULL DEFAULT '#8B5CF6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_epics_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT uk_epics_project_name UNIQUE (project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_epics_project ON epics(project_id);

--changeset sena:015-add-epic-to-user-stories
ALTER TABLE user_stories ADD COLUMN IF NOT EXISTS epic_id BIGINT;
ALTER TABLE user_stories ADD CONSTRAINT fk_stories_epic FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_stories_epic ON user_stories(epic_id);

--changeset sena:016-add-velocity-and-metrics-to-sprints
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS velocity INT DEFAULT 0;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS delivered_points INT DEFAULT 0;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS planned_points INT DEFAULT 0;

--changeset sena:017-create-impediments-table
CREATE TABLE IF NOT EXISTS impediments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    created_by_id BIGINT NOT NULL,
    creator_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_by_id BIGINT,
    resolver_name VARCHAR(150),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_comment TEXT,
    CONSTRAINT fk_impediments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_impediments_creator FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_impediments_resolver FOREIGN KEY (resolved_by_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_impediments_task ON impediments(task_id);
CREATE INDEX IF NOT EXISTS idx_impediments_status ON impediments(status);

--changeset sena:018-create-task-comments-table
CREATE TABLE IF NOT EXISTS task_comments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    author_name VARCHAR(150) NOT NULL,
    author_email VARCHAR(150),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);

--changeset sena:019-create-audit-logs-table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    user_name VARCHAR(150) NOT NULL,
    user_email VARCHAR(150),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

--changeset sena:020-create-notifications-table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    read_status BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_status);

--changeset sena:021-create-password-reset-tokens-table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);

--changeset sena:022-add-business-integrity-constraints
ALTER TABLE user_stories ADD CONSTRAINT uk_stories_project_code UNIQUE (project_id, code);
ALTER TABLE tasks ADD CONSTRAINT uk_tasks_story_code UNIQUE (user_story_id, code);
