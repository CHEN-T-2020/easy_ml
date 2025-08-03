-- 假新闻识别平台数据库结构

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 项目表
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'collecting', -- collecting, training, testing, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文本样本表
CREATE TABLE text_samples (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    label VARCHAR(10) NOT NULL, -- 'real' or 'fake'
    source VARCHAR(255),
    word_count INTEGER,
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 模型训练记录表
CREATE TABLE training_sessions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    model_config JSONB,
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    training_duration INTEGER, -- seconds
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 测试结果表
CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    input_text TEXT NOT NULL,
    predicted_label VARCHAR(10) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    actual_label VARCHAR(10),
    is_correct BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 特征分析表
CREATE TABLE feature_analysis (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    feature_type VARCHAR(50) NOT NULL, -- keyword, sentiment, structure
    feature_value VARCHAR(255) NOT NULL,
    importance_score DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_text_samples_project_id ON text_samples(project_id);
CREATE INDEX idx_text_samples_label ON text_samples(label);
CREATE INDEX idx_training_sessions_project_id ON training_sessions(project_id);
CREATE INDEX idx_test_results_project_id ON test_results(project_id);
CREATE INDEX idx_feature_analysis_project_id ON feature_analysis(project_id);