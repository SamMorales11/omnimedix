import { relations } from "drizzle-orm";
import { users } from "./users";
import { polis } from "./polis";
import { doctors } from "./doctors";
import { patients } from "./patients";
import { queues } from "./queues";
import { medicines } from "./medicines";
import { prescriptions } from "./prescriptions";
import { prescriptionItems } from "./prescription-items";
import { stockMovements } from "./stock-movements";
import { auditLogs } from "./audit-logs";

export const usersRelations = relations(users, ({ one, many }) => ({
  doctor: one(doctors, {
    fields: [users.id],
    references: [doctors.userId],
  }),
  auditLogs: many(auditLogs),
}));

export const polisRelations = relations(polis, ({ many }) => ({
  doctors: many(doctors),
  queues: many(queues),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
  poli: one(polis, {
    fields: [doctors.poliId],
    references: [polis.id],
  }),
  queues: many(queues),
  prescriptions: many(prescriptions),
}));

export const patientsRelations = relations(patients, ({ many }) => ({
  queues: many(queues),
  prescriptions: many(prescriptions),
}));

export const queuesRelations = relations(queues, ({ one }) => ({
  patient: one(patients, {
    fields: [queues.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [queues.doctorId],
    references: [doctors.id],
  }),
  poli: one(polis, {
    fields: [queues.poliId],
    references: [polis.id],
  }),
  prescription: one(prescriptions, {
    fields: [queues.id],
    references: [prescriptions.queueId],
  }),
}));

export const medicinesRelations = relations(medicines, ({ many }) => ({
  prescriptionItems: many(prescriptionItems),
  stockMovements: many(stockMovements),
}));

export const prescriptionsRelations = relations(
  prescriptions,
  ({ one, many }) => ({
    queue: one(queues, {
      fields: [prescriptions.queueId],
      references: [queues.id],
    }),
    doctor: one(doctors, {
      fields: [prescriptions.doctorId],
      references: [doctors.id],
    }),
    patient: one(patients, {
      fields: [prescriptions.patientId],
      references: [patients.id],
    }),
    items: many(prescriptionItems),
  }),
);

export const prescriptionItemsRelations = relations(
  prescriptionItems,
  ({ one }) => ({
    prescription: one(prescriptions, {
      fields: [prescriptionItems.prescriptionId],
      references: [prescriptions.id],
    }),
    medicine: one(medicines, {
      fields: [prescriptionItems.medicineId],
      references: [medicines.id],
    }),
  }),
);

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  medicine: one(medicines, {
    fields: [stockMovements.medicineId],
    references: [medicines.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
