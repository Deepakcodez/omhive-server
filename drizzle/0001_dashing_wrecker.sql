CREATE TABLE "idle_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendanceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp,
	"durationSeconds" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idle_sessions" ADD CONSTRAINT "idle_sessions_attendanceId_attendance_id_fk" FOREIGN KEY ("attendanceId") REFERENCES "public"."attendance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idle_sessions" ADD CONSTRAINT "idle_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idle_attendance_idx" ON "idle_sessions" USING btree ("attendanceId");--> statement-breakpoint
CREATE INDEX "idle_user_idx" ON "idle_sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idle_start_idx" ON "idle_sessions" USING btree ("startTime");