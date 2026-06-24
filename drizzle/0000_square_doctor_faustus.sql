CREATE TYPE "public"."activity_type" AS ENUM('work', 'break');--> statement-breakpoint
CREATE TYPE "public"."work_status" AS ENUM('working', 'break', 'logged_out');--> statement-breakpoint
CREATE TABLE "activitysession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"syncId" uuid NOT NULL,
	"attendanceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"activity_type" "activity_type" DEFAULT 'work' NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"software" text NOT NULL,
	"title" text NOT NULL,
	"hostname" text NOT NULL,
	"systemUsername" varchar(255) NOT NULL,
	CONSTRAINT "activitysession_syncId_unique" UNIQUE("syncId")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"date" date NOT NULL,
	"loginTime" timestamp NOT NULL,
	"logoutTime" timestamp,
	"expectedWorkSeconds" integer DEFAULT 32400 NOT NULL,
	"totalWorkSeconds" integer DEFAULT 0 NOT NULL,
	"totalBreakSeconds" integer DEFAULT 0 NOT NULL,
	"isPresent" boolean DEFAULT true NOT NULL,
	"status" "work_status" DEFAULT 'working' NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"systemUsername" varchar(255) NOT NULL,
	"os" varchar(100) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "break_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendanceId" uuid NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp,
	"durationSeconds" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userName" varchar(255) NOT NULL,
	"fullName" varchar(255) NOT NULL,
	"phone" varchar(15) NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_userName_unique" UNIQUE("userName"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "activitysession" ADD CONSTRAINT "activitysession_attendanceId_attendance_id_fk" FOREIGN KEY ("attendanceId") REFERENCES "public"."attendance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activitysession" ADD CONSTRAINT "activitysession_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "break_sessions" ADD CONSTRAINT "break_sessions_attendanceId_attendance_id_fk" FOREIGN KEY ("attendanceId") REFERENCES "public"."attendance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_user_idx" ON "activitysession" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "activity_attendance_idx" ON "activitysession" USING btree ("attendanceId");--> statement-breakpoint
CREATE INDEX "activity_start_idx" ON "activitysession" USING btree ("startTime");--> statement-breakpoint
CREATE INDEX "activity_user_time_idx" ON "activitysession" USING btree ("userId","startTime");--> statement-breakpoint
CREATE INDEX "attendance_user_date_idx" ON "attendance" USING btree ("userId","date");--> statement-breakpoint
CREATE INDEX "attendance_status_idx" ON "attendance" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("userName");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");