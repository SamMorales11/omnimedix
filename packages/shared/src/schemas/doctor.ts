import { z } from "zod";

export const updateQueueStatusSchema = z.object({
  status: z.enum(["waiting", "in_progress", "completed", "cancelled"], {
    errorMap: () => ({
      message:
        "Status antrean harus salah satu dari: waiting, in_progress, completed, atau cancelled.",
    }),
  }),
});

export type UpdateQueueStatusInput = z.infer<typeof updateQueueStatusSchema>;

export const queueParamSchema = z.object({
  id: z
    .string({ required_error: "ID antrean wajib disertakan." })
    .uuid("Format ID antrean harus berupa UUID yang valid."),
});

export type QueueParamInput = z.infer<typeof queueParamSchema>;

export const updateDiagnosisSchema = z.object({
  diagnosis: z
    .string({ required_error: "Diagnosis wajib diisi." })
    .trim()
    .min(1, "Diagnosis wajib diisi dan tidak boleh kosong.")
    .max(5000, "Diagnosis maksimal 5000 karakter."),
  notes: z
    .string()
    .trim()
    .max(5000, "Catatan medis maksimal 5000 karakter.")
    .optional()
    .nullable(),
});

export type UpdateDiagnosisInput = z.infer<typeof updateDiagnosisSchema>;

export const prescriptionItemSchema = z.object({
  medicineId: z
    .string({ required_error: "ID obat (medicineId) wajib diisi." })
    .uuid("Format ID obat harus berupa UUID yang valid."),
  dosage: z
    .string({ required_error: "Dosis obat wajib diisi." })
    .trim()
    .min(1, "Dosis obat tidak boleh kosong.")
    .max(100, "Dosis obat maksimal 100 karakter."),
  quantity: z
    .number({ required_error: "Jumlah obat (quantity) wajib diisi." })
    .int("Jumlah obat harus berupa bilangan bulat.")
    .positive("Jumlah obat harus minimal 1.")
    .max(1000, "Jumlah obat maksimal 1000."),
  instructions: z
    .string({ required_error: "Aturan pakai / instruksi wajib diisi." })
    .trim()
    .min(1, "Aturan pakai / instruksi tidak boleh kosong.")
    .max(1000, "Aturan pakai / instruksi maksimal 1000 karakter."),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;

export const createPrescriptionSchema = z.object({
  queueId: z
    .string({ required_error: "ID antrean (queueId) wajib diisi." })
    .uuid("Format ID antrean harus berupa UUID yang valid."),
  notes: z
    .string()
    .trim()
    .max(5000, "Catatan resep maksimal 5000 karakter.")
    .optional()
    .nullable(),
  items: z
    .array(prescriptionItemSchema, {
      required_error: "Daftar obat resep (items) wajib diisi.",
    })
    .min(1, "Resep harus berisi minimal 1 item obat."),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
