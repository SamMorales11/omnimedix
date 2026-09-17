import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { Role } from "@omnimedix/shared";
import {
  updateQueueStatusSchema,
  queueParamSchema,
  updateDiagnosisSchema,
  createPrescriptionSchema,
} from "@omnimedix/shared";
import { doctorService } from "../services/doctor.service";
import { requireAuth, type AppEnv } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";

export const doctorRoutes = new Hono<AppEnv>()
  // Lindungi seluruh endpoint di /doctor dengan auth + rbac (hanya DOCTOR)
  .use("*", requireAuth, requireRoles(Role.DOCTOR))

  /**
   * GET /doctor/queues/today
   * Mengembalikan daftar antrean milik dokter yang sedang login untuk hari ini.
   * Urutkan berdasarkan queue_number ascending.
   * Sertakan data pasien, poli, status, dan waktu booking.
   */
  .get("/queues/today", async (c) => {
    const user = c.get("user");
    const dateQuery = c.req.query("date");
    const queues = await doctorService.getTodayQueues(user.id, dateQuery);

    return c.json(
      {
        success: true,
        data: queues,
      },
      200,
    );
  })

  /**
   * GET /doctor/queues/:id
   * Mengambil detail satu antrean pasien milik dokter yang sedang login
   */
  .get(
    "/queues/:id",
    zValidator("param", queueParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID antrean tidak valid.",
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

      const queue = await doctorService.getQueueById(user.id, id);

      return c.json(
        {
          success: true,
          data: queue,
        },
        200,
      );
    },
  )

  /**
   * PATCH /doctor/queues/:id/status
   * Body: { status: "waiting" | "in_progress" | "completed" | "cancelled" }
   * Hanya boleh mengubah antrean milik dokter tersebut.
   * Validasi transisi status yang masuk akal.
   */
  .patch(
    "/queues/:id/status",
    zValidator("param", queueParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID antrean tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", updateQueueStatusSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Format status antrean tidak valid.",
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
      const { status } = c.req.valid("json");

      const updated = await doctorService.updateQueueStatus(
        user.id,
        id,
        status,
      );

      return c.json(
        {
          success: true,
          message: `Status antrean berhasil diperbarui menjadi '${status}'.`,
          data: updated,
        },
        200,
      );
    },
  )

  /**
   * PATCH /doctor/queues/:id/diagnosis
   * POST /doctor/queues/:id/notes
   * Body: { diagnosis: string, notes?: string }
   * Mencatat diagnosis dan catatan medis pada antrean pasien milik dokter
   */
  .patch(
    "/queues/:id/diagnosis",
    zValidator("param", queueParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID antrean tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", updateDiagnosisSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Data formulir diagnosis tidak valid.",
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

      const updated = await doctorService.recordDiagnosis(user.id, id, input);

      return c.json(
        {
          success: true,
          message: "Diagnosis dan catatan medis pasien berhasil disimpan.",
          data: updated,
        },
        200,
      );
    },
  )
  .post(
    "/queues/:id/notes",
    zValidator("param", queueParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID antrean tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", updateDiagnosisSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Data formulir catatan medis tidak valid.",
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

      const updated = await doctorService.recordDiagnosis(user.id, id, input);

      return c.json(
        {
          success: true,
          message: "Diagnosis dan catatan medis pasien berhasil disimpan.",
          data: updated,
        },
        200,
      );
    },
  )

  /**
   * GET /doctor/medicines
   * Mengambil daftar obat aktif untuk keperluan penulisan resep oleh dokter
   */
  .get("/medicines", async (c) => {
    const search = c.req.query("search");
    const category = c.req.query("category");

    const medicinesList = await doctorService.getActiveMedicines({
      search,
      category,
    });

    return c.json(
      {
        success: true,
        data: medicinesList,
      },
      200,
    );
  })

  /**
   * GET /doctor/queues/:id/prescription
   * Mengambil resep untuk antrean tertentu milik dokter yang login
   */
  .get(
    "/queues/:id/prescription",
    zValidator("param", queueParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID antrean tidak valid.",
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

      const prescription = await doctorService.getPrescriptionByQueueId(
        user.id,
        id,
      );

      return c.json(
        {
          success: true,
          data: prescription,
        },
        200,
      );
    },
  )

  /**
   * POST /doctor/prescriptions
   * Body: {
   *   queueId: string,
   *   notes?: string,
   *   items: Array<{ medicineId: string, dosage: string, quantity: number, instructions: string }>
   * }
   * Membuat resep obat untuk antrean pasien yang diperiksa dokter
   */
  .post(
    "/prescriptions",
    zValidator("json", createPrescriptionSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Data formulir resep obat tidak valid.",
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

      const prescription = await doctorService.createPrescription(
        user.id,
        input,
      );

      return c.json(
        {
          success: true,
          message:
            "Resep obat berhasil dibuat dan diteruskan ke bagian Farmasi.",
          data: prescription,
        },
        201,
      );
    },
  );
