-- psql -U postgres -d myfundsdata -f .\database.sql

CREATE TABLE IF NOT EXISTS user_table  (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    reset_password_token VARCHAR(255),    -- Add this column to store the reset token
    reset_password_expiration TIMESTAMP -- Add this column to store the expiration time
);

CREATE TABLE IF NOT EXISTS budget_table (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_table(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    time TEXT NOT NULL CHECK (time IN ('Daily', 'Weekly', 'Monthly', 'Yearly')),
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

