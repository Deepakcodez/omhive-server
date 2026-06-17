CREATE TYPE "public"."activity_type" AS ENUM('work', 'break');--> statement-breakpoint
CREATE TYPE "public"."work_status" AS ENUM('working', 'break', 'logged_out');--> statement-breakpoint
CREATE TABLE "activitysession" (
	"id" uuid PRIMARY KEY NOT NULL,
	"attendanceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"activity_type" "activity_type" DEFAULT 'work' NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"software" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"systemUsername" varchar(255) NOT NULL,
	CONSTRAINT "activitysession_id_unique" UNIQUE("id")
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
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"fullName" varchar(255),
	"phone" varchar(15),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "activitysession" ADD CONSTRAINT "activitysession_attendanceId_attendance_id_fk" FOREIGN KEY ("attendanceId") REFERENCES "public"."attendance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activitysession" ADD CONSTRAINT "activitysession_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "break_sessions" ADD CONSTRAINT "break_sessions_attendanceId_attendance_id_fk" FOREIGN KEY ("attendanceId") REFERENCES "public"."attendance"("id") ON DELETE no action ON UPDATE no action;