CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE');--> statement-breakpoint
CREATE TYPE "public"."prescription_status" AS ENUM('pending', 'preparing', 'ready', 'taken');--> statement-breakpoint
CREATE TYPE "public"."queue_status" AS ENUM('waiting', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'DOCTOR', 'PHARMACIST');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'DOCTOR' NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "polis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polis_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"poli_id" uuid NOT NULL,
	"specialization" varchar(150) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctors_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" "gender" NOT NULL,
	"phone" varchar(30),
	"nik" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_number" varchar(20) NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"poli_id" uuid NOT NULL,
	"status" "queue_status" DEFAULT 'waiting' NOT NULL,
	"booking_code" varchar(50),
	"queue_date" date DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queues_booking_code_unique" UNIQUE("booking_code")
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"min_stock" integer DEFAULT 10 NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_id" uuid,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" "prescription_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"dosage" varchar(100),
	"quantity" integer NOT NULL,
	"instructions" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"reason" varchar(255),
	"reference_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity" varchar(100) NOT NULL,
	"entity_id" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_poli_id_polis_id_fk" FOREIGN KEY ("poli_id") REFERENCES "public"."polis"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queues" ADD CONSTRAINT "queues_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queues" ADD CONSTRAINT "queues_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queues" ADD CONSTRAINT "queues_poli_id_polis_id_fk" FOREIGN KEY ("poli_id") REFERENCES "public"."polis"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_queue_id_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."queues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_polis_name" ON "polis" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_polis_is_active" ON "polis" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_doctors_user_id" ON "doctors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_doctors_poli_id" ON "doctors" USING btree ("poli_id");--> statement-breakpoint
CREATE INDEX "idx_doctors_is_active" ON "doctors" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_patients_nik" ON "patients" USING btree ("nik");--> statement-breakpoint
CREATE INDEX "idx_patients_phone" ON "patients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_patients_full_name" ON "patients" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_queues_date_status" ON "queues" USING btree ("queue_date","status");--> statement-breakpoint
CREATE INDEX "idx_queues_patient_id" ON "queues" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_queues_doctor_id" ON "queues" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_queues_poli_id" ON "queues" USING btree ("poli_id");--> statement-breakpoint
CREATE INDEX "idx_queues_booking_code" ON "queues" USING btree ("booking_code");--> statement-breakpoint
CREATE INDEX "idx_medicines_name" ON "medicines" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_medicines_category" ON "medicines" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_medicines_current_stock" ON "medicines" USING btree ("current_stock");--> statement-breakpoint
CREATE INDEX "idx_medicines_is_active" ON "medicines" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_queue_id" ON "prescriptions" USING btree ("queue_id");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_doctor_id" ON "prescriptions" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_patient_id" ON "prescriptions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_prescriptions_status" ON "prescriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_prescription_items_prescription_id" ON "prescription_items" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "idx_prescription_items_medicine_id" ON "prescription_items" USING btree ("medicine_id");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_medicine_id" ON "stock_movements" USING btree ("medicine_id");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_type" ON "stock_movements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_created_at" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_reference_id" ON "stock_movements" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");