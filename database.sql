-- psql -U postgres -d myfundsdata -f .\database.sql

CREATE TABLE IF NOT EXISTS user_table  (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    reset_password_token VARCHAR(255),    -- Add this column to store the reset token
    reset_password_expiration TIMESTAMP -- Add this column to store the expiration time
);

CREATE TABLE IF NOT EXISTS categories_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_table (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_table(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

