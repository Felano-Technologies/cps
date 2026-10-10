-- Operations can suspend accounts (riders, business owners): blocks sign-in and API access.
ALTER TABLE "users" ADD COLUMN "suspendedAt" TIMESTAMP(3);
