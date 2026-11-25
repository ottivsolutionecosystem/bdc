ALTER TABLE "fair_tasks" ADD COLUMN "owner_name" TEXT;

UPDATE "fair_tasks"
SET "owner_name" = btrim(substring("description" from char_length('Responsável: ') + 1)),
    "description" = NULL
WHERE "description" LIKE 'Responsável: %'
  AND position(E'\n' in "description") = 0;
