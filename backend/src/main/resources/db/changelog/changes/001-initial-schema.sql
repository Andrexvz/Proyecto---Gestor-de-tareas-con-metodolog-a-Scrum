--liquibase formatted sql

--changeset sena:001-create-users-table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    title VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--changeset sena:002-create-projects-table
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--changeset sena:003-create-sprints-table
CREATE TABLE IF NOT EXISTS sprints (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sprints_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

--changeset sena:004-create-user-stories-table
CREATE TABLE IF NOT EXISTS user_stories (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    sprint_id BIGINT,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    acceptance_criteria TEXT,
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    story_points INT NOT NULL DEFAULT 1,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stories_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_stories_sprint FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL
);

--changeset sena:005-create-tasks-table
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    user_story_id BIGINT NOT NULL,
    assigned_to_id BIGINT,
    code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'TODO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_story FOREIGN KEY (user_story_id) REFERENCES user_stories(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_user FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL
);

--changeset sena:006-create-indexes
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_stories_project ON user_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_stories_sprint ON user_stories(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_story ON tasks(user_story_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id);
