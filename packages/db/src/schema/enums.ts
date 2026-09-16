import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["ADMIN", "DOCTOR", "PHARMACIST"]);

export const genderEnum = pgEnum("gender", ["MALE", "FEMALE"]);

export const queueStatusEnum = pgEnum("queue_status", [
  "waiting",
  "in_progress",
  "completed",
  "cancelled",
]);

export const prescriptionStatusEnum = pgEnum("prescription_status", [
  "pending",
  "preparing",
  "ready",
  "taken",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "in",
  "out",
]);
