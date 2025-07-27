-- PostgreSQL initialization script for Interactive Narrative Creator
-- This file will be executed when the database container starts

-- Create database if not exists (already created by POSTGRES_DB env var)
-- CREATE DATABASE IF NOT EXISTS narrative_creator;

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create any additional extensions you might need
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search
-- CREATE EXTENSION IF NOT EXISTS "hstore";   -- For key-value storage

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE narrative_creator TO postgres; 