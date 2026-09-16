import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["ADMIN", "DOCTOR", "PHARMACIST"]);

export const genderEnum = pgEnum("gender", ["MALE", "FEMALE"]);

export const queueStatusEnum = pgEnum("queue_status", [
  "WAITING",
  "IN_CONSULTATION",
  "COMPLETED",
  "CANCELLED",
]);

export const prescriptionStatusEnum = pgEnum("prescription_status", [
  "PENDING",
  "PREPARED",
  "DISPENSED",
  "CANCELLED",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "IN",
  "OUT",
  "ADJUSTMENT",
]);
