import { z } from "zod";

export const updatePrescriptionStatusSchema = z.object({
  status: z.enum(["pending", "preparing", "ready", "taken"], {
    errorMap: () => ({
      message:
        "Status resep harus salah satu dari: pending, preparing, ready, atau taken.",
    }),
  }),
});

export type UpdatePrescriptionStatusInput = z.infer<
  typeof updatePrescriptionStatusSchema
>;

export const prescriptionParamSchema = z.object({
  id: z
    .string({ required_error: "ID resep wajib disertakan." })
    .uuid("Format ID resep harus berupa UUID yang valid."),
});

export type PrescriptionParamInput = z.infer<typeof prescriptionParamSchema>;

export const pharmacistPrescriptionQuerySchema = z.object({
  status: z.enum(["all", "pending", "preparing", "ready", "taken"]).optional(),
  search: z.string().optional(),
});

export type PharmacistPrescriptionQueryInput = z.infer<
  typeof pharmacistPrescriptionQuerySchema
>;

export const medicineParamSchema = z.object({
  id: z
    .string({ required_error: "ID obat wajib disertakan." })
    .uuid("Format ID obat harus berupa UUID yang valid."),
});

export type MedicineParamInput = z.infer<typeof medicineParamSchema>;

export const createMedicineSchema = z.object({
  name: z
    .string({ required_error: "Nama obat wajib diisi." })
    .trim()
    .min(1, "Nama obat tidak boleh kosong.")
    .max(255, "Nama obat maksimal 255 karakter."),
  category: z
    .string({ required_error: "Kategori obat wajib diisi." })
    .trim()
    .min(1, "Kategori obat tidak boleh kosong.")
    .max(100, "Kategori obat maksimal 100 karakter."),
  unit: z
    .string({ required_error: "Satuan obat (unit) wajib diisi." })
    .trim()
    .min(1, "Satuan obat tidak boleh kosong.")
    .max(50, "Satuan obat maksimal 50 karakter."),
  minStock: z
    .number({ required_error: "Stok minimum (minStock) wajib diisi." })
    .int("Stok minimum harus berupa bilangan bulat.")
    .min(0, "Stok minimum tidak boleh negatif.")
    .default(10),
  currentStock: z
    .number({ required_error: "Stok saat ini (currentStock) wajib diisi." })
    .int("Stok saat ini harus berupa bilangan bulat.")
    .min(0, "Stok saat ini tidak boleh negatif.")
    .default(0),
  isActive: z.boolean().default(true).optional(),
});

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;

export const updateMedicineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama obat tidak boleh kosong.")
    .max(255, "Nama obat maksimal 255 karakter.")
    .optional(),
  category: z
    .string()
    .trim()
    .min(1, "Kategori obat tidak boleh kosong.")
    .max(100, "Kategori obat maksimal 100 karakter.")
    .optional(),
  unit: z
    .string()
    .trim()
    .min(1, "Satuan obat tidak boleh kosong.")
    .max(50, "Satuan obat maksimal 50 karakter.")
    .optional(),
  minStock: z
    .number()
    .int("Stok minimum harus berupa bilangan bulat.")
    .min(0, "Stok minimum tidak boleh negatif.")
    .optional(),
  currentStock: z
    .number()
    .int("Stok saat ini harus berupa bilangan bulat.")
    .min(0, "Stok saat ini tidak boleh negatif.")
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;

export const pharmacistMedicineQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  low_stock: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
  stock_status: z.enum(["all", "normal", "low", "out"]).optional(),
  is_active: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === "") return undefined;
      if (val === "true" || val === "1") return true;
      if (val === "false" || val === "0") return false;
      return undefined;
    }),
});

export type PharmacistMedicineQueryInput = z.infer<
  typeof pharmacistMedicineQuerySchema
>;

export const createStockMovementSchema = z.object({
  medicineId: z
    .string({ required_error: "ID obat (medicineId) wajib diisi." })
    .uuid("Format ID obat harus berupa UUID yang valid."),
  type: z
    .enum(["in", "out"], {
      errorMap: () => ({
        message: "Tipe mutasi stok harus 'in' (masuk) atau 'out' (keluar).",
      }),
    })
    .default("in"),
  quantity: z
    .number({ required_error: "Jumlah obat (quantity) wajib diisi." })
    .int("Jumlah obat harus berupa bilangan bulat.")
    .positive("Jumlah obat harus lebih dari 0.")
    .max(100000, "Jumlah obat maksimal 100.000 per pencatatan."),
  reason: z
    .string({ required_error: "Alasan mutasi stok (reason) wajib diisi." })
    .trim()
    .min(1, "Alasan mutasi stok tidak boleh kosong.")
    .max(200, "Alasan mutasi stok maksimal 200 karakter."),
  reference: z
    .string()
    .trim()
    .max(100, "Nomor referensi faktur/supplier maksimal 100 karakter.")
    .optional()
    .nullable(),
});

export type CreateStockMovementInput = z.infer<
  typeof createStockMovementSchema
>;

export const pharmacistStockMovementsQuerySchema = z.object({
  medicineId: z
    .string()
    .uuid("Format ID obat harus berupa UUID yang valid.")
    .optional(),
  type: z.enum(["all", "in", "out"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50).optional(),
});

export type PharmacistStockMovementsQueryInput = z.infer<
  typeof pharmacistStockMovementsQuerySchema
>;

export const pharmacistStockReportQuerySchema = z.object({
  lowStockOnly: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((val) => val === true || val === "true" || val === "1"),
  low_stock_only: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((val) => val === true || val === "true" || val === "1"),
  category: z.string().optional(),
});

export type PharmacistStockReportQueryInput = z.infer<
  typeof pharmacistStockReportQuerySchema
>;
