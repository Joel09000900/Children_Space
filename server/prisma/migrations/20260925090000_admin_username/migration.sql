-- Pseudo de connexion, alternative à l'e-mail (renseigné pour le compte admin)
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
