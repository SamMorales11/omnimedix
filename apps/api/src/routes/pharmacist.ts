import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { Role } from "@omnimedix/shared";
import {
  updatePrescriptionStatusSchema,
  prescriptionParamSchema,
  pharmacistPrescriptionQuerySchema,
  createMedicineSchema,
  updateMedicineSchema,
  medicineParamSchema,
  pharmacistMedicineQuerySchema,
  createStockMovementSchema,
  pharmacistStockMovementsQuerySchema,
  pharmacistStockReportQuerySchema,
} from "@omnimedix/shared";
import { pharmacistService } from "../services/pharmacist.service";
import { requireAuth, type AppEnv } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";

export const pharmacistRoutes = new Hono<AppEnv>()
  // Lindungi seluruh endpoint di /pharmacist dengan auth + rbac (hanya role PHARMACIST)
  .use("*", requireAuth, requireRoles(Role.PHARMACIST))

  /**
   * GET /pharmacist/prescriptions
   * Mengembalikan daftar resep (default: yang masih pending dan preparing).
   * Bisa filter berdasarkan status (?status=pending|preparing|ready|taken|all).
   * Sertakan data pasien, dokter, items obat, dan waktu dibuat.
   * Urutkan dari yang paling prioritas atau terbaru.
   */
  .get(
    "/prescriptions",
    zValidator("query", pharmacistPrescriptionQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter filter daftar resep tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const query = c.req.valid("query");
      const prescriptionsList = await pharmacistService.getPrescriptions(query);

      return c.json(
        {
          success: true,
          data: prescriptionsList,
        },
        200,
      );
    },
  )

  /**
   * GET /pharmacist/prescriptions/:id
   * Detail lengkap satu resep beserta items obat, pasien, dokter, dan info antrean.
   */
  .get(
    "/prescriptions/:id",
    zValidator("param", prescriptionParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID resep tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const prescription = await pharmacistService.getPrescriptionById(id);

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
   * PATCH /pharmacist/prescriptions/:id/status
   * Body: { status: "pending" | "preparing" | "ready" | "taken" }
   * Validasi transisi status yang wajar dan pengurangan stok jika berstatus 'taken'.
   */
  .patch(
    "/prescriptions/:id/status",
    zValidator("param", prescriptionParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter ID resep tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    zValidator("json", updatePrescriptionStatusSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Format status resep tidak valid.",
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

      const updated = await pharmacistService.updatePrescriptionStatus(
        user.id,
        id,
        status,
      );

      return c.json(
        {
          success: true,
          message: `Status resep obat berhasil diperbarui menjadi '${status}'.`,
          data: updated,
        },
        200,
      );
    },
  )

  /**
   * ==========================================
   * MASTER DATA OBAT ENDPOINTS
   * ==========================================
   */

  /**
   * GET /pharmacist/medicines
   * Mengembalikan daftar obat + current_stock + status stok (normal / low / out).
   * Mendukung pencarian (?search=), filter stok rendah (?low_stock=true), status stok (?stock_status=), dan filter aktif (?is_active=).
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
      const medicinesList = await pharmacistService.getMedicines(query);

      return c.json(
        {
          success: true,
          data: medicinesList,
        },
        200,
      );
    },
  )

  /**
   * GET /pharmacist/medicines/:id
   * Mengambil detail satu data obat beserta status stok terhitung
   */
  .get(
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
    async (c) => {
      const { id } = c.req.valid("param");
      const medicine = await pharmacistService.getMedicineById(id);

      return c.json(
        {
          success: true,
          data: medicine,
        },
        200,
      );
    },
  )

  /**
   * POST /pharmacist/medicines
   * Menambahkan data obat baru ke master data apotek
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
              message: "Data formulir obat baru tidak valid.",
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

      const created = await pharmacistService.createMedicine(user.id, input);

      return c.json(
        {
          success: true,
          message: `Obat '${created.name}' berhasil ditambahkan ke master data.`,
          data: created,
        },
        201,
      );
    },
  )

  /**
   * PUT /pharmacist/medicines/:id
   * Memperbarui informasi data obat dan/atau stok
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
              message: "Data pembaruan obat tidak valid.",
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

      const updated = await pharmacistService.updateMedicine(
        user.id,
        id,
        input,
      );

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
   * DELETE /pharmacist/medicines/:id
   * Menghapus obat dari peredaran aktif secara aman (Soft Delete)
   */
  .delete(
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
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");

      const deleted = await pharmacistService.deleteMedicine(user.id, id);

      return c.json(
        {
          success: true,
          message: `Obat '${deleted.name}' berhasil dinonaktifkan dari katalog aktif.`,
          data: deleted,
        },
        200,
      );
    },
  )

  /**
   * ==========================================
   * PENCATATAN OBAT MASUK & MUTASI STOK
   * ==========================================
   */

  /**
   * POST /pharmacist/stock-movements
   * Mencatat obat masuk (atau keluar) ke sistem apotek
   * Body: { medicineId, type: "in" | "out", quantity, reason, reference? }
   */
  .post(
    "/stock-movements",
    zValidator("json", createStockMovementSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Data formulir mutasi stok tidak valid.",
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

      const movement = await pharmacistService.recordStockMovement(
        user.id,
        input,
      );

      const actionText = movement.type === "in" ? "masuk" : "keluar";

      return c.json(
        {
          success: true,
          message: `Pencatatan obat ${actionText} berhasil disimpan. Stok '${movement.medicineName}' saat ini: ${movement.currentStock} ${movement.unit}.`,
          data: movement,
        },
        201,
      );
    },
  )

  /**
   * GET /pharmacist/stock-movements
   * Mengambil riwayat pergerakan stok obat
   * Query: ?medicineId=xxx&type=in|out|all&limit=50
   */
  .get(
    "/stock-movements",
    zValidator("query", pharmacistStockMovementsQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter filter riwayat stok tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const query = c.req.valid("query");
      const movements = await pharmacistService.getStockMovements(query);

      return c.json(
        {
          success: true,
          data: movements,
        },
        200,
      );
    },
  )

  /**
   * ==========================================
   * LAPORAN STOK & DASHBOARD
   * ==========================================
   */

  /**
   * GET /pharmacist/reports/stock
   * Laporan stok sederhana:
   * - Ringkasan: total obat, jumlah stok rendah, jumlah stok habis, jumlah stok normal
   * - Daftar obat beserta current_stock, min_stock, dan status
   * Query: ?lowStockOnly=true|false&category=xxx
   */
  .get(
    "/reports/stock",
    zValidator("query", pharmacistStockReportQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter filter laporan stok tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const query = c.req.valid("query");
      const report = await pharmacistService.getStockReport(query);

      return c.json(
        {
          success: true,
          data: report,
        },
        200,
      );
    },
  )

  /**
   * GET /pharmacist/dashboard/summary
   * Ringkasan metrik operasional untuk Dashboard Apoteker:
   * - Metrik resep (pending, preparing, ready, taken today, total active)
   * - Metrik stok obat (total obat, stok normal, stok rendah, stok habis)
   * - Daftar resep antrean teratas yang butuh penanganan
   * - Riwayat mutasi stok obat terbaru
   */
  .get("/dashboard/summary", async (c) => {
    const summary = await pharmacistService.getDashboardSummary();

    return c.json(
      {
        success: true,
        data: summary,
      },
      200,
    );
  });
