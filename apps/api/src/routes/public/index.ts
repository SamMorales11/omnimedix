import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  getDoctorsQuerySchema,
  createBookingQueueSchema,
  trackQueueQuerySchema,
} from "@omnimedix/shared";
import { publicService } from "../../services/public.service";
import type { AppEnv } from "../../middleware/auth";

export const publicRoutes = new Hono<AppEnv>()
  /**
   * GET /public/polis
   * Mengembalikan daftar poliklinik aktif beserta jumlah dokter yang aktif praktik
   */
  .get("/polis", async (c) => {
    const polis = await publicService.getActivePolis();

    return c.json(
      {
        success: true,
        data: polis,
      },
      200,
    );
  })

  /**
   * GET /public/doctors?poliId=xxx&date=YYYY-MM-DD
   * Mengembalikan daftar dokter aktif pada poli tersebut untuk jadwal hari ini
   * Sertakan nama, spesialisasi, dan sisa kuota antrean
   */
  .get(
    "/doctors",
    zValidator("query", getDoctorsQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Parameter query pencarian dokter tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const { poliId, date } = c.req.valid("query");
      const doctors = await publicService.getActiveDoctorsByPoli(poliId, date);

      return c.json(
        {
          success: true,
          data: doctors,
        },
        200,
      );
    },
  )

  /**
   * POST /public/queues
   * Mendaftarkan antrean pasien baru (Booking Antrean)
   */
  .post(
    "/queues",
    zValidator("json", createBookingQueueSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Data formulir pendaftaran antrean tidak valid.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const input = c.req.valid("json");
      const result = await publicService.createBookingQueue(input);

      return c.json(
        {
          success: true,
          message: "Pendaftaran antrean berhasil.",
          data: result,
        },
        201,
      );
    },
  )

  /**
   * GET /public/queues/track?code=xxx OR ?queueNumber=xxx&date=YYYY-MM-DD
   * Melacak status antrean berdasarkan bookingCode atau kombinasi queueNumber + tanggal
   */
  .get(
    "/queues/track",
    zValidator("query", trackQueueQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message:
                "Parameter pencarian antrean tidak valid. Harap sertakan kode booking atau nomor antrean.",
              details: result.error.flatten(),
            },
          },
          400,
        );
      }
    }),
    async (c) => {
      const query = c.req.valid("query");
      const result = await publicService.trackQueue(query);

      return c.json(
        {
          success: true,
          data: result,
        },
        200,
      );
    },
  );
