-- Business teams: a CV can be shared with one team. Additive only: existing CVs stay private
-- (team_id NULL), and deleting a team unshares its CVs instead of deleting them.

ALTER TABLE "cvs"
ADD COLUMN "team_id" UUID;

ALTER TABLE "cvs"
ADD CONSTRAINT "cvs_team_id_fkey"
FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_cvs_team_id" ON "cvs"("team_id");
