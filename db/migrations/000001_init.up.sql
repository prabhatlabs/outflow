-- Trigger to automatically handle updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enums
CREATE TYPE login_provider AS ENUM ('email', 'google');
CREATE TYPE group_type AS ENUM ('household', 'trip', 'roommates', 'couple', 'project', 'other');
CREATE TYPE group_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE group_member_status AS ENUM ('invited', 'active', 'left', 'removed');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'cancelled');
CREATE TYPE split_type AS ENUM ('equal', 'percentage', 'exact', 'shares');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'bank_transfer', 'card', 'other');
CREATE TYPE budget_period AS ENUM ('weekly', 'monthly', 'yearly', 'custom');

-- Users Scheme
CREATE TABLE IF NOT EXISTS users (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    email             VARCHAR(255) NOT NULL UNIQUE,
    first_name        VARCHAR(150) NOT NULL,
    last_name         VARCHAR(150),
    avatar_url        TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    timezone          VARCHAR(50) NOT NULL DEFAULT 'UTC',
    email_verified_at TIMESTAMPTZ,
    last_login_mode   login_provider,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

-- Users Triggers
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Auths Scheme
CREATE TABLE IF NOT EXISTS auths (
    id                      UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider                login_provider,
    provider_account_id     VARCHAR(255) NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT provider_provider_account_id UNIQUE (provider, provider_account_id),
    CONSTRAINT user_id_provider UNIQUE (user_id, provider)
);

-- Auths Triggers
CREATE TRIGGER set_auths_updated_at
BEFORE UPDATE ON auths
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Groups Scheme
CREATE TABLE IF NOT EXISTS groups (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    name              VARCHAR(150) NOT NULL,
    description       TEXT,
    avatar_url        TEXT,
    type              group_type NOT NULL,
    default_currency  CHAR(3) NOT NULL DEFAULT 'USD',
    created_by        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_archived       BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Groups Index
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups (created_by);

-- Groups Triggers
CREATE TRIGGER set_groups_updated_at
BEFORE UPDATE ON groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Group Members Scheme
CREATE TABLE IF NOT EXISTS group_members (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role              group_member_role NOT NULL DEFAULT 'member',
    status            group_member_status NOT NULL DEFAULT 'invited',
    invited_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    joined_at         TIMESTAMPTZ,
    left_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_group_members_user_group UNIQUE (user_id, group_id)
);

-- Group Members Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_status ON group_members(user_id, status);

-- Group Members Triggers
CREATE TRIGGER set_group_members_updated_at
BEFORE UPDATE ON group_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Invitations Scheme
CREATE TABLE IF NOT EXISTS invitations (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    invited_by        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email             VARCHAR(255) NOT NULL,
    token_hash        VARCHAR(255) NOT NULL,
    status            invitation_status NOT NULL DEFAULT 'pending',
    expires_at        TIMESTAMPTZ NOT NULL,
    accepted_at       TIMESTAMPTZ,
    rejected_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invitations Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_group_id ON invitations (group_id);
CREATE INDEX IF NOT EXISTS idx_invitations_group_email ON invitations (group_id, email);
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON invitations (token_hash);

-- Invitations Triggers
CREATE TRIGGER set_invitations_updated_at
BEFORE UPDATE ON invitations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Categories Scheme
CREATE TABLE IF NOT EXISTS categories (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              VARCHAR(150) NOT NULL,
    icon              VARCHAR(100),
    color             VARCHAR(10) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_categories_name_group UNIQUE (name, group_id)
);

-- Categories Index
CREATE INDEX IF NOT EXISTS idx_categories_group_id ON categories (group_id);

-- Categories Triggers
CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Expenses Scheme
CREATE TABLE IF NOT EXISTS expenses (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paid_by           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
    amount            DECIMAL(14, 2) NOT NULL CHECK (amount > 0),
    description       VARCHAR(250),
    note              TEXT,
    split_type        split_type NOT NULL,
    is_archived       BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at       TIMESTAMPTZ,
    expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Expenses Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_group_date ON expenses (group_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_group_category ON expenses (group_id, category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_created_by ON expenses (group_id, created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_group_paid_by ON expenses (group_id, paid_by);

-- Expenses Triggers
CREATE TRIGGER set_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Expense Splits Scheme
CREATE TABLE IF NOT EXISTS expense_splits (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    expense_id        UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_owed       DECIMAL(14, 2) NOT NULL CHECK (amount_owed > 0),
    percentage        DECIMAL(5, 2),
    shares            DECIMAL(7, 2),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_expense_splits_expense_user UNIQUE (expense_id, user_id)
);

-- Expense Splits Indexes
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits (expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits (user_id);

-- Expense Splits Triggers
CREATE TRIGGER set_expense_splits_updated_at
BEFORE UPDATE ON expense_splits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Settlements Scheme
CREATE TABLE IF NOT EXISTS settlements (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount            DECIMAL(14, 2) NOT NULL CHECK (amount > 0),
    payment_method    payment_method NOT NULL,
    note              TEXT,
    settlement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_settlements_different_users CHECK (from_user_id != to_user_id)
);

-- Settlements Indexes
CREATE INDEX IF NOT EXISTS idx_settlements_group_date ON settlements (group_id, settlement_date);
CREATE INDEX IF NOT EXISTS idx_settlements_group_from ON settlements (group_id, from_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group_to ON settlements (group_id, to_user_id);

-- Settlements Triggers
CREATE TRIGGER set_settlements_updated_at
BEFORE UPDATE ON settlements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Settlement Splits Scheme
CREATE TABLE IF NOT EXISTS settlement_splits (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    settlement_id     UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    expense_split_id  UUID NOT NULL REFERENCES expense_splits(id) ON DELETE RESTRICT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_settlement_splits_settlement_expense UNIQUE (settlement_id, expense_split_id)
);

-- Settlement Splits Indexes
CREATE INDEX IF NOT EXISTS idx_settlement_splits_settlement_id ON settlement_splits (settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_splits_expense_split_id ON settlement_splits (expense_split_id);


-- Group Budgets Scheme
CREATE TABLE IF NOT EXISTS group_budgets (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    amount_limit      DECIMAL(14, 2) NOT NULL CHECK (amount_limit > 0),
    period            budget_period NOT NULL,
    start_date        DATE NOT NULL,
    end_date          DATE,
    alert_threshold   INTEGER NOT NULL DEFAULT 75 CHECK (alert_threshold > 0 AND alert_threshold <= 100),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_group_budgets_custom CHECK (period != 'custom' OR end_date IS NOT NULL),
    CONSTRAINT chk_group_budgets_end_date CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Group Budgets Index
CREATE INDEX IF NOT EXISTS idx_group_budgets_group_id ON group_budgets (group_id);

-- Group Budgets Triggers
CREATE TRIGGER set_group_budgets_updated_at
BEFORE UPDATE ON group_budgets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Personal Budgets Scheme
CREATE TABLE IF NOT EXISTS personal_budgets (
    id                UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_limit      DECIMAL(14, 2) NOT NULL CHECK (amount_limit > 0),
    period            budget_period NOT NULL,
    start_date        DATE NOT NULL,
    end_date          DATE,
    alert_threshold   INTEGER NOT NULL DEFAULT 75 CHECK (alert_threshold > 0 AND alert_threshold <= 100),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_personal_budgets_custom CHECK (period != 'custom' OR end_date IS NOT NULL),
    CONSTRAINT chk_personal_budgets_end_date CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Personal Budgets Index
CREATE INDEX IF NOT EXISTS idx_personal_budgets_user_id ON personal_budgets (user_id);

-- Personal Budgets Triggers
CREATE TRIGGER set_personal_budgets_updated_at
BEFORE UPDATE ON personal_budgets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
