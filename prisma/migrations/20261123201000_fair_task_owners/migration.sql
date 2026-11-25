ALTER TABLE "fair_tasks" ADD COLUMN "ownerNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "fair_tasks"
SET "ownerNames" = (
  SELECT COALESCE(array_agg(btrim(part) ORDER BY ordinality), ARRAY[]::TEXT[])
  FROM unnest(regexp_split_to_array("ownerName", ' / | e ')) WITH ORDINALITY AS split(part, ordinality)
  WHERE btrim(part) <> ''
)
WHERE "ownerName" IS NOT NULL AND btrim("ownerName") <> '';

UPDATE "fair_tasks" AS task
SET "ownerNames" = ARRAY[users.name]
FROM "users"
WHERE task."assigneeId" = users.id
  AND cardinality(task."ownerNames") = 0;

ALTER TABLE "fair_tasks" DROP CONSTRAINT "fair_tasks_assigneeId_fkey";
ALTER TABLE "fair_tasks" DROP COLUMN "assigneeId";
ALTER TABLE "fair_tasks" DROP COLUMN "ownerName";
