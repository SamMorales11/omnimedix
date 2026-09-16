import { z } from "zod";
import { Role } from "../constants/roles.js";

export const createUserSchema = z.object({
  name: z
    .string({ required_error: "Nama wajib diisi" })
    .trim()
    .min(2, "Nama minimal 2 karakter"),
  email: z
    .string({ required_error: "Email wajib diisi" })
    .trim()
    .email("Format email tidak valid"),
  password: z
    .string({ required_error: "Password wajib diisi" })
    .min(8, "Password minimal 8 karakter"),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: "Role harus ADMIN, DOCTOR, atau PHARMACIST" }),
  }),
  isActive: z.boolean().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
