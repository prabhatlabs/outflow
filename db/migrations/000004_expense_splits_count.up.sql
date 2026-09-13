ALTER TABLE expenses ADD COLUMN splits_count INTEGER NOT NULL DEFAULT 0;

UPDATE expenses e
SET splits_count = (SELECT count(*) FROM expense_splits es WHERE es.expense_id = e.id);
