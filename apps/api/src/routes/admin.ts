import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  Role,
  adminPatientParamSchema,
  adminPatientQuerySchema,
  createPatientSchema,
  updatePatientSchema,
  adminDoctorParamSchema,
  adminDoctorQuerySchema,
  createDoctorSchema,
  updateDoctorSchema,
  updateDoctorStatusSchema,
  adminUserParamSchema,
  adminUserQuerySchema,
  adminCreateUserSchema,
  adminUpdateUserStatusSchema,
  adminResetUserPasswordSchema,
  createMedicineSchema,
  updateMedicineSchema,
  medicineParamSchema,
  pharmacistMedicineQuerySchema,
  updateMedicineStatusSchema,
} from "@omnimedix/shared";
import { adminService } from "../services/admin.service";
import { requireAuth, type AppEnv } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";

export const adminRoutes = new Hono<AppEnv>()
  // Lindungi seluruh endpoint di /admin dengan auth + rbac (hanya role ADMIN)
  .use("*", requireAuth, requireRoles(Role.ADMIN))

  /**
   * GET /admin/dashboard/summary
   * Mengembalikan ringkasan operasional klinik & rumah sakit terpadu untuk panel administrator:
   * - Jumlah antrean hari ini (total, waiting, in_progress, completed, cancelled)
   * - Jumlah pasien terdaftar
   * - Jumlah dokter aktif
   * - Status stok obat (total, normal, rendah, habis)
   * - Jumlah resep aktif (pending, preparing, ready, taken)
   * - 10 log aktivitas terbaru sistem
   */
  .get("/dashboard/summary", async (c) => {
    const summary = await adminService.getDashboardSummary();

    return c.json(
      {
        success: true,
        data: summary,
      },
      200,
    );
  })

  /**
   * ==========================================
   * PENGELOLAAN DATA PASIEN (CRUD PASIEN)
   * ==========================================
   */

  /**
   * GET /admin/patients
   * Mengambil daftar pasien terdaftar
   * Query: ?search=...&page=1&limit=10&isActive=true|false
   */
  .get(
    "/patients",
    zValidator("query", adminPatientQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter filter pasien tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const query = c.req.valid("query");
      const result = await adminService.getPatients(query);

      return c.json(
        {
          success: true,
          data: result.items,
          pagination: result.pagination,
        },
        200,
      );
    },
  )

  /**
   * GET /admin/patients/:id
   * Mengambil detail satu data pasien berdasarkan UUID
   */
  .get(
    "/patients/:id",
    zValidator("param", adminPatientParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID pasien tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const patient = await adminService.getPatientById(id);

      return c.json(
        {
          success: true,
          data: patient,
        },
        200,
      );
    },
  )

  /**
   * POST /admin/patients
   * Mendaftarkan data pasien baru oleh Administrator
   * Body: { fullName, dateOfBirth, gender, phone?, nik?, isActive? }
   */
  .post(
    "/patients",
    zValidator("json", createPatientSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Formulir pendaftaran pasien baru tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");

      const created = await adminService.createPatient(user.id, input);

      return c.json(
        {
          success: true,
          message: `Data pasien '${created.fullName}' berhasil didaftarkan.`,
          data: created,
        },
        201,
      );
    },
  )

  /**
   * PUT /admin/patients/:id
   * Memperbarui informasi profil data pasien
   */
  .put(
    "/patients/:id",
    zValidator("param", adminPatientParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID pasien tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", updatePatientSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Formulir pembaruan pasien tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");

      const updated = await adminService.updatePatient(user.id, id, input);

      return c.json(
        {
          success: true,
          message: `Data pasien '${updated.fullName}' berhasil diperbarui.`,
          data: updated,
        },
        200,
      );
    },
  )

  /**
   * DELETE /admin/patients/:id
   * Menonaktifkan data pasien dari peredaran aktif (Soft Delete)
   */
  .delete(
    "/patients/:id",
    zValidator("param", adminPatientParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID pasien tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");

      const deleted = await adminService.deletePatient(user.id, id);

      return c.json(
        {
          success: true,
          message: `Data pasien '${deleted.fullName}' berhasil dinonaktifkan.`,
          data: deleted,
        },
        200,
      );
    },
  )

  /**
   * ==========================================
   * PENGELOLAAN DATA DOKTER (CRUD DOKTER)
   * ==========================================
   */

  /**
   * GET /admin/doctors
   * Mengambil daftar seluruh dokter terdaftar
   * Query: ?search=...&poliId=...&isActive=true|false&page=1&limit=10
   */
  .get(
    "/doctors",
    zValidator("query", adminDoctorQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter filter dokter tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const query = c.req.valid("query");
      const result = await adminService.getDoctors(query);

      return c.json(
        {
          success: true,
          data: result.items,
          pagination: result.pagination,
        },
        200,
      );
    },
  )

  /**
   * GET /admin/doctors/:id
   * Mengambil informasi detail dokter berdasarkan ID
   */
  .get(
    "/doctors/:id",
    zValidator("param", adminDoctorParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID dokter tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const doctor = await adminService.getDoctorById(id);

      return c.json(
        {
          success: true,
          data: doctor,
        },
        200,
      );
    },
  )

  /**
   * POST /admin/doctors
   * Menambahkan dokter baru
   * Mendukung opsi:
   * 1. Membuat akun user baru (role DOCTOR) dengan hashing password & verifikasi email unik.
   * 2. Menautkan ke akun user yang sudah ada.
   * Wajib memilih poliklinik (poliId).
   */
  .post(
    "/doctors",
    zValidator("json", createDoctorSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Formulir pendaftaran dokter baru tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");

      const created = await adminService.createDoctor(user.id, input);

      return c.json(
        {
          success: true,
          message: `Data dokter '${created.name}' berhasil didaftarkan.`,
          data: created,
        },
        201,
      );
    },
  )

  /**
   * PUT /admin/doctors/:id
   * Memperbarui informasi data dokter (nama, email, password, poliId, specialization, isActive)
   */
  .put(
    "/doctors/:id",
    zValidator("param", adminDoctorParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID dokter tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", updateDoctorSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Formulir pembaruan dokter tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");

      const updated = await adminService.updateDoctor(user.id, id, input);

      return c.json(
        {
          success: true,
          message: `Data dokter '${updated.name}' berhasil diperbarui.`,
          data: updated,
        },
        200,
      );
    },
  )

  /**
   * PATCH /admin/doctors/:id/status
   * Mengubah status aktif/nonaktif dokter
   */
  .patch(
    "/doctors/:id/status",
    zValidator("param", adminDoctorParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID dokter tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", updateDoctorStatusSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Data status dokter tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const { isActive } = c.req.valid("json");

      const updated = await adminService.updateDoctorStatus(
        user.id,
        id,
        isActive,
      );

      return c.json(
        {
          success: true,
          message: `Status dokter '${updated.name}' berhasil diubah menjadi ${isActive ? "aktif" : "nonaktif"}.`,
          data: updated,
        },
        200,
      );
    },
  )

  /**
   * ==========================================
   * PENGELOLAAN AKUN PENGGUNA (USER MANAGEMENT)
   * ==========================================
   */

  /**
   * GET /admin/users
   * Mengambil daftar akun pengguna dengan filter role, status keaktifan, dan pencarian nama/email
   * Query: ?role=DOCTOR|PHARMACIST|ADMIN&search=...&isActive=true|false&page=1&limit=10
   */
  .get(
    "/users",
    zValidator("query", adminUserQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter filter pengguna tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const query = c.req.valid("query");
      const result = await adminService.getUsers(query);

      return c.json(
        {
          success: true,
          data: result.items,
          pagination: result.pagination,
        },
        200,
      );
    },
  )

  /**
   * POST /admin/users
   * Membuat akun pengguna baru (Dokter, Apoteker, atau Admin)
   * Body: { name, email, password, role: "DOCTOR" | "PHARMACIST" | "ADMIN", isActive? }
   */
  .post(
    "/users",
    zValidator("json", adminCreateUserSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Formulir pembuatan akun pengguna tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");

      const created = await adminService.createUser(user.id, input);

      return c.json(
        {
          success: true,
          message: `Akun pengguna '${created.name}' (${created.role}) berhasil dibuat.`,
          data: created,
        },
        201,
      );
    },
  )

  /**
   * PATCH /admin/users/:id/status
   * Mengubah status keaktifan akun pengguna (aktif/nonaktif)
   * Body: { isActive: boolean }
   */
  .patch(
    "/users/:id/status",
    zValidator("param", adminUserParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID pengguna tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", adminUpdateUserStatusSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Data status pengguna tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const { isActive } = c.req.valid("json");

      const updated = await adminService.updateUserStatus(
        user.id,
        id,
        isActive,
      );

      return c.json(
        {
          success: true,
          message: `Status akun pengguna '${updated.name}' berhasil diubah menjadi ${isActive ? "aktif" : "nonaktif"}.`,
          data: updated,
        },
        200,
      );
    },
  )

  /**
   * PATCH /admin/users/:id/password
   * Mereset password akun pengguna oleh Administrator
   * Body: { password: string }
   */
  .patch(
    "/users/:id/password",
    zValidator("param", adminUserParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID pengguna tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", adminResetUserPasswordSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Formulir reset password tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const { password } = c.req.valid("json");

      const result = await adminService.resetUserPassword(
        user.id,
        id,
        password,
      );

      return c.json(
        {
          success: true,
          message: result.message,
          data: { id: result.id },
        },
        200,
      );
    },
  )

  /**
   * ==========================================
   * CRUD MASTER OBAT (ADMIN PRIVILEGE)
   * ==========================================
   */

  /**
   * GET /admin/medicines
   * Mengambil katalog seluruh master data obat beserta status stok
   */
  .get(
    "/medicines",
    zValidator("query", pharmacistMedicineQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter filter obat tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const query = c.req.valid("query");
      const list = await adminService.getMedicines(query);

      return c.json(
        {
          success: true,
          data: list,
        },
        200,
      );
    },
  )

  /**
   * POST /admin/medicines
   * Menambahkan data obat baru ke sistem oleh Administrator
   * Body: { name, category, unit, minStock, currentStock, isActive? }
   */
  .post(
    "/medicines",
    zValidator("json", createMedicineSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Formulir pendaftaran obat baru tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");

      const created = await adminService.createMedicine(user.id, input);

      return c.json(
        {
          success: true,
          message: `Data obat '${created.name}' berhasil ditambahkan ke katalog.`,
          data: created,
        },
        201,
      );
    },
  )

  /**
   * PUT /admin/medicines/:id
   * Memperbarui informasi data obat dan/atau stok oleh Administrator
   */
  .put(
    "/medicines/:id",
    zValidator("param", medicineParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID obat tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", updateMedicineSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Formulir pembaruan obat tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");

      const updated = await adminService.updateMedicine(user.id, id, input);

      return c.json(
        {
          success: true,
          message: `Data obat '${updated.name}' berhasil diperbarui.`,
          data: updated,
        },
        200,
      );
    },
  )

  /**
   * PATCH /admin/medicines/:id/status
   * Mengubah status aktif/nonaktif master data obat oleh Administrator
   * Body: { isActive: boolean }
   */
  .patch(
    "/medicines/:id/status",
    zValidator("param", medicineParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID obat tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", updateMedicineStatusSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Data status obat tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const { isActive } = c.req.valid("json");

      const updated = await adminService.updateMedicineStatus(
        user.id,
        id,
        isActive,
      );

      return c.json(
        {
          success: true,
          message: `Status obat '${updated.name}' berhasil diubah menjadi ${isActive ? "aktif" : "nonaktif"}.`,
          data: updated,
        },
        200,
      );
    },
  );
