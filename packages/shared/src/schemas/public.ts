import { z } from "zod";

export const getDoctorsQuerySchema = z.object({
  poliId: z
    .string({ required_error: "Parameter 'poliId' wajib disertakan." })
    .uuid("Format 'poliId' tidak valid. Harus berupa UUID yang valid."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus berformat YYYY-MM-DD.")
    .optional(),
});

export type GetDoctorsQueryInput = z.infer<typeof getDoctorsQuerySchema>;

export const createBookingQueueSchema = z.object({
  poliId: z
    .string({ required_error: "poliId wajib diisi." })
    .uuid("Format 'poliId' tidak valid. Harus berupa UUID yang valid."),
  doctorId: z
    .string({ required_error: "doctorId wajib diisi." })
    .uuid("Format 'doctorId' tidak valid. Harus berupa UUID yang valid."),
  patient: z
    .object({
      fullName: z
        .string({ required_error: "Nama lengkap pasien wajib diisi." })
        .trim()
        .min(2, "Nama lengkap pasien minimal 2 karakter.")
        .max(255, "Nama lengkap pasien maksimal 255 karakter."),
      dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal lahir harus YYYY-MM-DD.")
        .optional(),
      age: z
        .number()
        .int("Umur harus berupa bilangan bulat.")
        .positive("Umur harus lebih dari 0.")
        .max(130, "Umur maksimal 130 tahun.")
        .optional(),
      gender: z.enum(["MALE", "FEMALE", "L", "P"], {
        errorMap: () => ({
          message:
            "Jenis kelamin harus salah satu dari: MALE, FEMALE, L, atau P.",
        }),
      }),
      phone: z
        .string({ required_error: "Nomor telepon/kontak wajib diisi." })
        .trim()
        .min(8, "Nomor telepon minimal 8 karakter.")
        .max(30, "Nomor telepon maksimal 30 karakter."),
      nik: z
        .string()
        .trim()
        .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit angka.")
        .optional()
        .or(z.literal("")),
    })
    .refine((data) => Boolean(data.dateOfBirth || data.age), {
      message:
        "Salah satu dari tanggal lahir (dateOfBirth) atau umur (age) wajib diisi.",
      path: ["dateOfBirth"],
    }),
});

export type CreateBookingQueueInput = z.infer<typeof createBookingQueueSchema>;

export const trackQueueQuerySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Kode booking minimal 3 karakter.")
      .optional(),
    queueNumber: z
      .string()
      .trim()
      .min(2, "Nomor antrean minimal 2 karakter.")
      .optional(),
    date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Format tanggal harus berformat YYYY-MM-DD.",
      )
      .optional(),
  })
  .refine((data) => Boolean(data.code || data.queueNumber), {
    message:
      "Harap sertakan parameter 'code' (kode booking) atau 'queueNumber' (nomor antrean).",
    path: ["code"],
  });

export type TrackQueueQueryInput = z.infer<typeof trackQueueQuerySchema>;
