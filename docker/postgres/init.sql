CREATE EXTENSION IF NOT EXISTS vector;

SELECT 'CREATE DATABASE felops_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'felops_test')\gexec
