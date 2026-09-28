-- Campus Coin - Final Database Schema
-- Fresh installation schema for campus_coin_db

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS transaction_history;
DROP TABLE IF EXISTS tip_preferences;
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS insight_history;
DROP TABLE IF EXISTS admin_content;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(130) NOT NULL,
    email VARCHAR(200) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    academic_year VARCHAR(50) NOT NULL DEFAULT '',
    monthly_savings_goal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    monthly_allowance_baseline DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    reset_token_hash VARCHAR(255) DEFAULT NULL,
    reset_token_expires_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_reset_token_hash (reset_token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE categories (
    category_id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(36) DEFAULT NULL,
    name VARCHAR(150) NOT NULL,
    type ENUM('income','expense') NOT NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (category_id),
    KEY idx_categories_user_id (user_id),
    CONSTRAINT fk_categories_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE transactions (
    transaction_id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('income','expense') NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    txn_date DATE NOT NULL,
    is_recurring TINYINT(1) NOT NULL DEFAULT 0,
    recurring_frequency VARCHAR(20) DEFAULT NULL,
    next_occurrence_date DATE DEFAULT NULL,
    recurring_active TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (transaction_id),
    KEY idx_transactions_user_id (user_id),
    KEY idx_transactions_category_id (category_id),
    KEY idx_transactions_date (txn_date),
    KEY idx_transactions_recurring (user_id, recurring_active, next_occurrence_date),
    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_transactions_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE budgets (
    budget_id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    category_id INT NOT NULL,
    monthly_limit DECIMAL(10,2) NOT NULL,
    month_year VARCHAR(20) NOT NULL,
    PRIMARY KEY (budget_id),
    UNIQUE KEY uq_budget_user_category_month (user_id, category_id, month_year),
    KEY idx_budgets_category_id (category_id),
    CONSTRAINT fk_budgets_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_budgets_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE tip_preferences (
    preference_id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    tip_key VARCHAR(100) NOT NULL,
    status ENUM('pinned','dismissed') NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (preference_id),
    UNIQUE KEY uq_tip_user_key (user_id, tip_key),
    CONSTRAINT fk_tip_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE admin_content (
    content_id INT NOT NULL AUTO_INCREMENT,
    type ENUM('announcement','tip_template') NOT NULL,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE insight_history (
    insight_id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    month_year VARCHAR(20) NOT NULL,
    summary_text TEXT NOT NULL,
    tip_text TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (insight_id),
    KEY idx_insight_history_user (user_id),
    CONSTRAINT fk_insight_history_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE bookmarks (
    bookmark_id INT NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    item_type ENUM('insight','tip') NOT NULL,
    item_key VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (bookmark_id),
    KEY idx_bookmarks_user (user_id),
    CONSTRAINT fk_bookmarks_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- No FK to transactions/categories here on purpose:
-- history must remain available even after the original transaction is deleted.
CREATE TABLE transaction_history (
    history_id INT NOT NULL AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    txn_date DATE NOT NULL,
    is_recurring TINYINT(1) NOT NULL DEFAULT 0,
    action_type ENUM('updated','deleted') NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (history_id),
    KEY idx_history_user (user_id),
    KEY idx_history_transaction (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- System default categories available to every student
INSERT INTO categories (user_id, name, type, is_default) VALUES
(NULL, 'Allowance', 'income', 1),
(NULL, 'Part-time Job', 'income', 1),
(NULL, 'Scholarship', 'income', 1),
(NULL, 'Gift', 'income', 1),
(NULL, 'Other Income', 'income', 1),
(NULL, 'Food', 'expense', 1),
(NULL, 'Transport', 'expense', 1),
(NULL, 'Hostel/Rent', 'expense', 1),
(NULL, 'Academics', 'expense', 1),
(NULL, 'Subscriptions', 'expense', 1),
(NULL, 'Entertainment', 'expense', 1),
(NULL, 'Miscellaneous', 'expense', 1);

SET FOREIGN_KEY_CHECKS = 1;
