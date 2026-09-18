import { z } from "zod";

export interface AdminQueueSummary {
  todayTotal: number;
  waiting: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface AdminPatientsSummary {
  total: number;
}

export interface AdminDoctorsSummary {
  totalActive: number;
  total: number;
}

export interface AdminMedicinesSummary {
  total: number;
  normalStock: number;
  lowStock: number;
  outOfStock: number;
}

export interface AdminPrescriptionsSummary {
  pending: number;
  preparing: number;
  ready: number;
  taken: number;
  totalActive: number;
}

export interface AdminRecentActivity {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminDashboardSummaryResponse {
  today: string;
  queues: AdminQueueSummary;
  patients: AdminPatientsSummary;
  doctors: AdminDoctorsSummary;
  medicines: AdminMedicinesSummary;
  prescriptions: AdminPrescriptionsSummary;
  recentActivities: AdminRecentActivity[];
}

export const adminPatientParamSchema = z.object({
  id: z
    .string({ required_error: "ID pasien wajib disertakan." })
    .uuid("Format ID pasien harus berupa UUID yang valid."),
});

export type AdminPatientParamInput = z.infer<typeof adminPatientParamSchema>;

export const adminPatientQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === "") return undefined;
      if (val === "true" || val === "1") return true;
      if (val === "false" || val === "0") return false;
      return undefined;
    }),
});

export type AdminPatientQueryInput = z.infer<typeof adminPatientQuerySchema>;

export const createPatientSchema = z.object({
  fullName: z
    .string({ required_error: "Nama lengkap pasien wajib diisi." })
    .trim()
    .min(2, "Nama lengkap pasien minimal 2 karakter.")
    .max(255, "Nama lengkap pasien maksimal 255 karakter."),
  dateOfBirth: z
    .string({ required_error: "Tanggal lahir wajib diisi." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal lahir harus YYYY-MM-DD."),
  gender: z.enum(["MALE", "FEMALE"], {
    errorMap: () => ({
      message: "Jenis kelamin harus 'MALE' atau 'FEMALE'.",
    }),
  }),
  phone: z
    .string()
    .trim()
    .max(30, "Nomor telepon maksimal 30 karakter.")
    .optional()
    .nullable(),
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit angka.")
    .optional()
    .nullable()
    .or(z.literal("")),
  isActive: z.boolean().default(true).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nama lengkap pasien minimal 2 karakter.")
    .max(255, "Nama lengkap pasien maksimal 255 karakter.")
    .optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal lahir harus YYYY-MM-DD.")
    .optional(),
  gender: z
    .enum(["MALE", "FEMALE"], {
      errorMap: () => ({
        message: "Jenis kelamin harus 'MALE' atau 'FEMALE'.",
      }),
    })
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Nomor telepon maksimal 30 karakter.")
    .optional()
    .nullable(),
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit angka.")
    .optional()
    .nullable()
    .or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export interface AdminPatientItem {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  phone: string | null;
  nik: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPatientResponse {
  items: AdminPatientItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const adminDoctorParamSchema = z.object({
  id: z
    .string({ required_error: "ID dokter wajib disertakan." })
    .uuid("Format ID dokter harus berupa UUID yang valid."),
});

export type AdminDoctorParamInput = z.infer<typeof adminDoctorParamSchema>;

export const adminDoctorQuerySchema = z.object({
  search: z.string().optional(),
  poliId: z
    .string()
    .uuid("Format ID poli harus berupa UUID yang valid.")
    .optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === "") return undefined;
      if (val === "true" || val === "1") return true;
      if (val === "false" || val === "0") return false;
      return undefined;
    }),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
});

export type AdminDoctorQueryInput = z.infer<typeof adminDoctorQuerySchema>;

export const createDoctorSchema = z
  .object({
    userId: z
      .string()
      .uuid("Format ID user harus berupa UUID yang valid.")
      .optional()
      .nullable(),
    name: z
      .string()
      .trim()
      .min(2, "Nama dokter minimal 2 karakter.")
      .max(255, "Nama dokter maksimal 255 karakter.")
      .optional(),
    email: z
      .string()
      .trim()
      .email("Format email tidak valid.")
      .max(255, "Email maksimal 255 karakter.")
      .optional(),
    password: z
      .string()
      .min(6, "Password minimal 6 karakter.")
      .max(100, "Password maksimal 100 karakter.")
      .optional(),
    poliId: z
      .string({ required_error: "Poliklinik (poliId) wajib dipilih." })
      .uuid("Format ID poliklinik harus berupa UUID yang valid."),
    specialization: z
      .string({ required_error: "Spesialisasi dokter wajib diisi." })
      .trim()
      .min(2, "Spesialisasi minimal 2 karakter.")
      .max(150, "Spesialisasi maksimal 150 karakter."),
    isActive: z.boolean().default(true).optional(),
  })
  .refine(
    (data) => {
      if (!data.userId) {
        return Boolean(data.name && data.email && data.password);
      }
      return true;
    },
    {
      message:
        "Jika tidak menautkan ke userId yang ada, field name, email, dan password wajib diisi.",
      path: ["email"],
    },
  );

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama dokter minimal 2 karakter.")
    .max(255, "Nama dokter maksimal 255 karakter.")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid.")
    .max(255, "Email maksimal 255 karakter.")
    .optional(),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter.")
    .max(100, "Password maksimal 100 karakter.")
    .optional(),
  poliId: z
    .string()
    .uuid("Format ID poliklinik harus berupa UUID yang valid.")
    .optional(),
  specialization: z
    .string()
    .trim()
    .min(2, "Spesialisasi minimal 2 karakter.")
    .max(150, "Spesialisasi maksimal 150 karakter.")
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

export const updateDoctorStatusSchema = z.object({
  isActive: z.boolean({ required_error: "Status isActive wajib disertakan." }),
});

export type UpdateDoctorStatusInput = z.infer<typeof updateDoctorStatusSchema>;

export interface AdminDoctorPoliInfo {
  id: string;
  name: string;
}

export interface AdminDoctorItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "DOCTOR";
  poliId: string;
  poli: AdminDoctorPoliInfo;
  specialization: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDoctorResponse {
  items: AdminDoctorItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const adminUserParamSchema = z.object({
  id: z
    .string({ required_error: "ID user wajib disertakan." })
    .uuid("Format ID user harus berupa UUID yang valid."),
});

export type AdminUserParamInput = z.infer<typeof adminUserParamSchema>;

export const adminUserQuerySchema = z.object({
  role: z.enum(["ADMIN", "DOCTOR", "PHARMACIST"]).optional(),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === "") return undefined;
      if (val === "true" || val === "1") return true;
      if (val === "false" || val === "0") return false;
      return undefined;
    }),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
});

export type AdminUserQueryInput = z.infer<typeof adminUserQuerySchema>;

export const adminCreateUserSchema = z.object({
  name: z
    .string({ required_error: "Nama lengkap wajib diisi." })
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(255, "Nama maksimal 255 karakter."),
  email: z
    .string({ required_error: "Email wajib diisi." })
    .trim()
    .email("Format email tidak valid.")
    .max(255, "Email maksimal 255 karakter."),
  password: z
    .string({ required_error: "Password wajib diisi." })
    .min(6, "Password minimal 6 karakter.")
    .max(100, "Password maksimal 100 karakter."),
  role: z.enum(["DOCTOR", "PHARMACIST", "ADMIN"], {
    errorMap: () => ({ message: "Role harus DOCTOR, PHARMACIST, atau ADMIN." }),
  }),
  isActive: z.boolean().default(true).optional(),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const adminUpdateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: "Status isActive wajib disertakan." }),
});

export type AdminUpdateUserStatusInput = z.infer<
  typeof adminUpdateUserStatusSchema
>;

export const adminResetUserPasswordSchema = z.object({
  password: z
    .string({ required_error: "Password baru wajib diisi." })
    .min(6, "Password baru minimal 6 karakter.")
    .max(100, "Password baru maksimal 100 karakter."),
});

export type AdminResetUserPasswordInput = z.infer<
  typeof adminResetUserPasswordSchema
>;

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "DOCTOR" | "PHARMACIST";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUserResponse {
  items: AdminUserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const updateMedicineStatusSchema = z.object({
  isActive: z.boolean({ required_error: "Status isActive wajib disertakan." }),
});

export type UpdateMedicineStatusInput = z.infer<
  typeof updateMedicineStatusSchema
>;

