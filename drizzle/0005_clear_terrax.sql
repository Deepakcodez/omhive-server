ALTER TABLE "users" ADD CONSTRAINT "users_userName_unique" UNIQUE("userName");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_unique" UNIQUE("phone");