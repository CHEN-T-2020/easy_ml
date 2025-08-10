-- PostgreSQL Schema for News Classifier Platform
-- Run this to set up your database

-- Create database (if using raw PostgreSQL)
-- CREATE DATABASE news_classifier;

-- Text samples table (replaces samples.json)
CREATE TABLE IF NOT EXISTS text_samples (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    label VARCHAR(20) NOT NULL CHECK (label IN ('normal', 'clickbait')),
    word_count INTEGER NOT NULL DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training datasets table (replaces training data files)
CREATE TABLE IF NOT EXISTS training_datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    total_samples INTEGER DEFAULT 0,
    normal_count INTEGER DEFAULT 0,
    clickbait_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model training history
CREATE TABLE IF NOT EXISTS training_history (
    id SERIAL PRIMARY KEY,
    model_type VARCHAR(50) NOT NULL,
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4), 
    recall_score DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    training_time INTEGER, -- milliseconds
    sample_count INTEGER,
    training_params JSONB, -- store model-specific parameters
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prediction logs (optional, for analytics)
CREATE TABLE IF NOT EXISTS prediction_logs (
    id SERIAL PRIMARY KEY,
    text_input TEXT NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    prediction VARCHAR(20) NOT NULL,
    confidence INTEGER NOT NULL, -- 0-100
    processing_time DECIMAL(6,2), -- milliseconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_text_samples_label ON text_samples(label);
CREATE INDEX IF NOT EXISTS idx_text_samples_created_at ON text_samples(created_at);
CREATE INDEX IF NOT EXISTS idx_training_history_model ON training_history(model_type);
CREATE INDEX IF NOT EXISTS idx_prediction_logs_model ON prediction_logs(model_type);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to auto-update updated_at
CREATE TRIGGER update_text_samples_updated_at 
    BEFORE UPDATE ON text_samples 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();