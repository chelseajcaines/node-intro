-- psql -U postgres -d myfundsdata -f .\database.sql

CREATE TABLE IF NOT EXISTS user_table  (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expiration TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS budget_table (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_table(id) ON DELETE CASCADE,
    category_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_table(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- CREATE TABLE IF NOT EXISTS income_table (
--     id SERIAL PRIMARY KEY,
--     user_id INTEGER REFERENCES user_table(id) ON DELETE CASCADE,
--     name TEXT NOT NULL,
--     amount NUMERIC(10,2) NOT NULL,
--     time TEXT NOT NULL CHECK (time IN ('Weekly', 'Bi-Weekly', 'Monthly', 'Yearly')),
--     date DATE NOT NULL,
--     position TEXT NOT NULL CHECK (position IN ('Full Time', 'Part Time', 'Casual', 'Side Job')),
--     created_at TIMESTAMP DEFAULT NOW()
-- );

CREATE TABLE IF NOT EXISTS expense_table (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_table(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    date DATE NOT NULL,
    payment TEXT NOT NULL CHECK (payment IN ('Credit', 'Debit', 'Cash')),
    deduction TEXT NOT NULL CHECK (deduction IN ('none')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- CREATE TABLE IF NOT EXISTS savings_table (
--     id SERIAL PRIMARY KEY,
--     user_id INTEGER REFERENCES user_table(id) ON DELETE CASCADE,
--     name TEXT NOT NULL,
--     amount NUMERIC(10,2) NOT NULL,
--     deposit_amount NUMERIC(10,2) NOT NULL,
--     time TEXT NOT NULL CHECK (time IN ('Daily', 'Weekly', 'Bi-Weekly', 'Monthly', 'Yearly')),
--     date DATE NOT NULL,
--     created_at TIMESTAMP DEFAULT NOW()
-- );

