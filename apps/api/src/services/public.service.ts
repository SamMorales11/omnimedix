import { eq, and, sql, type SQL } from "drizzle-orm";
import { db } from "../lib/db";
import {
  polis,
  doctors,
  users,
  queues,
  patients,
  auditLogs,
} from "@omnimedix/db";
import { NotFoundError, BadRequestError } from "../lib/errors";
import type {
  CreateBookingQueueInput,
  TrackQueueQueryInput,
} from "@omnimedix/shared";

export interface PublicPoli {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  activeDoctorsCount: number;
}

export interface DoctorQuota {
  total: number;
  booked: number;
  remaining: number;
}

export interface PublicDoctor {
  id: string;
  name: string;
  specialization: string;
  poliId: string;
  poliName: string;
  isActive: boolean;
  quota: DoctorQuota;
}

export interface BookingQueueResult {
  queueNumber: string;
  bookingCode: string;
  poliName: string;
  doctorName: string;
  estimasi: string | null;
  status: "waiting";
  queueDate: string;
  patient: {
    id: string;
    fullName: string;
  };
}

export interface TrackQueueResult {
  queueNumber: string;
  bookingCode: string | null;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  poliName: string;
  doctorName: string;
  patientName: string;
  queueDate: string;
  createdAt: Date;
  position: {
    peopleAhead: number;
    currentServing: string | null;
    estimatedWaitMinutes: number | null;
  };
}

// Kapasitas kuota antrean harian default per dokter poliklinik
const DEFAULT_DAILY_QUOTA = 30;

/**
 * Karakter alfabetik kode awalan nomor antrean berdasarkan nama poliklinik
 */
function getPoliPrefix(poliName: string): string {
  const upper = poliName.toUpperCase();
  if (upper.includes("UMUM")) return "A";
  if (upper.includes("GIGI")) return "B";
  if (upper.includes("ANAK") || upper.includes("PEDIATRI")) return "C";
  if (upper.includes("DALAM")) return "D";

  const match = upper.match(/[A-Z]/);
  return match ? match[0]! : "Q";
}

/**
 * Generate 6-karakter alfanumerik unik yang mudah dibaca & diketik
 * (menghindari karakter rancu seperti 0/O dan 1/I)
 */
function generateBookingCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${code}`;
}

/**
 * Menyamarkan nama pasien untuk privasi di monitor publik (contoh: "Ah*** F***")
 */
function maskPatientName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    const word = parts[0]!;
    if (word.length <= 2) return word;
    return `${word.slice(0, 2)}${"*".repeat(Math.min(4, word.length - 2))}`;
  }
  return parts
    .map((word, index) => {
      if (index === 0) {
        return word.length > 2 ? `${word.slice(0, 2)}***` : word;
      }
      return `${word.charAt(0)}***`;
    })
    .join(" ");
}

export class PublicService {
  /**
   * Mengambil daftar poliklinik aktif beserta jumlah dokter yang aktif praktik
   */
  async getActivePolis(): Promise<PublicPoli[]> {
    const activePolis = await db
      .select({
        id: polis.id,
        name: polis.name,
        description: polis.description,
        isActive: polis.isActive,
      })
      .from(polis)
      .where(eq(polis.isActive, true))
      .orderBy(polis.name);

    if (activePolis.length === 0) {
      return [];
    }

    const doctorCounts = await db
      .select({
        poliId: doctors.poliId,
        count: sql<number>`count(${doctors.id})::int`,
      })
      .from(doctors)
      .innerJoin(
        users,
        and(eq(users.id, doctors.userId), eq(users.isActive, true)),
      )
      .where(eq(doctors.isActive, true))
      .groupBy(doctors.poliId);

    const doctorCountMap = new Map<string, number>();
    for (const item of doctorCounts) {
      doctorCountMap.set(item.poliId, Number(item.count) || 0);
    }

    return activePolis.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isActive: p.isActive,
      activeDoctorsCount: doctorCountMap.get(p.id) ?? 0,
    }));
  }

  /**
   * Mengambil daftar dokter aktif pada suatu poli untuk hari ini/tanggal tertentu
   * Menampilkan nama dokter, spesialisasi, dan sisa kuota antrean
   */
  async getActiveDoctorsByPoli(
    poliId: string,
    queryDate?: string,
  ): Promise<PublicDoctor[]> {
    const [foundPoli] = await db
      .select({
        id: polis.id,
        name: polis.name,
        isActive: polis.isActive,
      })
      .from(polis)
      .where(eq(polis.id, poliId))
      .limit(1);

    if (!foundPoli) {
      throw new NotFoundError(
        `Poliklinik dengan ID '${poliId}' tidak ditemukan.`,
        "POLI_NOT_FOUND",
      );
    }

    if (!foundPoli.isActive) {
      throw new BadRequestError(
        `Poliklinik '${foundPoli.name}' saat ini sedang tidak aktif menerima pendaftaran antrean.`,
        "POLI_INACTIVE",
      );
    }

    const targetDate = queryDate || new Date().toISOString().split("T")[0]!;

    const doctorRows = await db
      .select({
        id: doctors.id,
        name: users.name,
        specialization: doctors.specialization,
        poliId: doctors.poliId,
        isActive: doctors.isActive,
      })
      .from(doctors)
      .innerJoin(
        users,
        and(eq(users.id, doctors.userId), eq(users.isActive, true)),
      )
      .where(and(eq(doctors.poliId, poliId), eq(doctors.isActive, true)))
      .orderBy(users.name);

    if (doctorRows.length === 0) {
      return [];
    }

    const queueCounts = await db
      .select({
        doctorId: queues.doctorId,
        booked: sql<number>`count(${queues.id})::int`,
      })
      .from(queues)
      .where(
        and(
          eq(queues.poliId, poliId),
          eq(queues.queueDate, targetDate),
          sql`${queues.status} != 'cancelled'`,
        ),
      )
      .groupBy(queues.doctorId);

    const bookedMap = new Map<string, number>();
    for (const q of queueCounts) {
      if (q.doctorId) {
        bookedMap.set(q.doctorId, Number(q.booked) || 0);
      }
    }

    return doctorRows.map((doc) => {
      const booked = bookedMap.get(doc.id) ?? 0;
      const remaining = Math.max(0, DEFAULT_DAILY_QUOTA - booked);

      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        poliId: doc.poliId,
        poliName: foundPoli.name,
        isActive: doc.isActive,
        quota: {
          total: DEFAULT_DAILY_QUOTA,
          booked,
          remaining,
        },
      };
    });
  }

  /**
   * Mendaftarkan antrean pasien baru secara publik (Booking Antrean)
   */
  async createBookingQueue(
    input: CreateBookingQueueInput,
  ): Promise<BookingQueueResult> {
    const todayStr = new Date().toISOString().split("T")[0]!;

    // 1. Validasi Poliklinik
    const [foundPoli] = await db
      .select()
      .from(polis)
      .where(eq(polis.id, input.poliId))
      .limit(1);

    if (!foundPoli) {
      throw new NotFoundError(
        "Poliklinik tujuan tidak ditemukan.",
        "POLI_NOT_FOUND",
      );
    }

    if (!foundPoli.isActive) {
      throw new BadRequestError(
        `Poliklinik '${foundPoli.name}' sedang tidak aktif menerima pendaftaran antrean.`,
        "POLI_INACTIVE",
      );
    }

    // 2. Validasi Dokter dan kesesuaian Poliklinik
    const [foundDoctor] = await db
      .select({
        id: doctors.id,
        poliId: doctors.poliId,
        isActive: doctors.isActive,
        userId: doctors.userId,
        specialization: doctors.specialization,
        userName: users.name,
        userIsActive: users.isActive,
      })
      .from(doctors)
      .innerJoin(users, eq(users.id, doctors.userId))
      .where(eq(doctors.id, input.doctorId))
      .limit(1);

    if (!foundDoctor) {
      throw new NotFoundError(
        "Dokter yang dipilih tidak ditemukan.",
        "DOCTOR_NOT_FOUND",
      );
    }

    if (!foundDoctor.isActive || !foundDoctor.userIsActive) {
      throw new BadRequestError(
        `Dokter '${foundDoctor.userName}' sedang tidak aktif praktik hari ini.`,
        "DOCTOR_INACTIVE",
      );
    }

    if (foundDoctor.poliId !== input.poliId) {
      throw new BadRequestError(
        `Dokter '${foundDoctor.userName}' tidak bertugas pada poliklinik '${foundPoli.name}'.`,
        "DOCTOR_POLI_MISMATCH",
      );
    }

    // 3. Cek kuota antrean dokter untuk hari ini
    const [doctorBookingCount] = await db
      .select({ count: sql<number>`count(${queues.id})::int` })
      .from(queues)
      .where(
        and(
          eq(queues.doctorId, input.doctorId),
          eq(queues.queueDate, todayStr),
          sql`${queues.status} != 'cancelled'`,
        ),
      );

    const currentDoctorBookings = Number(doctorBookingCount?.count) || 0;
    if (currentDoctorBookings >= DEFAULT_DAILY_QUOTA) {
      throw new BadRequestError(
        `Kuota antrean dokter '${foundDoctor.userName}' untuk hari ini sudah penuh (${DEFAULT_DAILY_QUOTA} pasien). Silakan pilih dokter atau hari lain.`,
        "QUOTA_EXCEEDED",
      );
    }

    // 4. Cari atau buat data pasien (Find or Create Patient)
    const normalizedGender: "MALE" | "FEMALE" =
      input.patient.gender === "L" || input.patient.gender === "MALE"
        ? "MALE"
        : "FEMALE";

    let finalDob: string;
    if (input.patient.dateOfBirth) {
      finalDob = input.patient.dateOfBirth;
    } else if (input.patient.age) {
      const birthYear = new Date().getFullYear() - input.patient.age;
      finalDob = `${birthYear}-01-01`;
    } else {
      finalDob = "1990-01-01";
    }

    const trimmedNik = input.patient.nik?.trim() || null;
    const trimmedPhone = input.patient.phone.trim();
    const trimmedFullName = input.patient.fullName.trim();

    let patientId: string;
    let patientName: string;

    let existingPatient = null;
    if (trimmedNik) {
      [existingPatient] = await db
        .select()
        .from(patients)
        .where(eq(patients.nik, trimmedNik))
        .limit(1);
    }

    if (!existingPatient) {
      const candidates = await db
        .select()
        .from(patients)
        .where(eq(patients.phone, trimmedPhone))
        .limit(5);

      existingPatient =
        candidates.find(
          (p) =>
            p.fullName.trim().toLowerCase() === trimmedFullName.toLowerCase(),
        ) || null;
    }

    if (existingPatient) {
      patientId = existingPatient.id;
      patientName = existingPatient.fullName;
    } else {
      const [newPatient] = await db
        .insert(patients)
        .values({
          fullName: trimmedFullName,
          dateOfBirth: finalDob,
          gender: normalizedGender,
          phone: trimmedPhone,
          nik: trimmedNik,
        })
        .returning();

      if (!newPatient) {
        throw new Error("Gagal menyimpan data pasien baru.");
      }

      patientId = newPatient.id;
      patientName = newPatient.fullName;
    }

    // 5. Generate nomor antrean harian per poliklinik (contoh: A-001, B-002, dst.)
    const prefix = getPoliPrefix(foundPoli.name);
    const [poliQueueCount] = await db
      .select({ count: sql<number>`count(${queues.id})::int` })
      .from(queues)
      .where(
        and(eq(queues.poliId, input.poliId), eq(queues.queueDate, todayStr)),
      );

    const sequence = (Number(poliQueueCount?.count) || 0) + 1;
    const queueNumber = `${prefix}-${String(sequence).padStart(3, "0")}`;

    // 6. Generate booking_code yang unik dan mudah diketik (contoh: BK-MEJFZQ)
    let bookingCode = generateBookingCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const [existingCode] = await db
        .select({ id: queues.id })
        .from(queues)
        .where(eq(queues.bookingCode, bookingCode))
        .limit(1);

      if (!existingCode) break;
      bookingCode = generateBookingCode();
    }

    // 7. Simpan data antrean ke tabel queues dengan status awal 'waiting'
    const [insertedQueue] = await db
      .insert(queues)
      .values({
        queueNumber,
        patientId,
        doctorId: input.doctorId,
        poliId: input.poliId,
        status: "waiting",
        bookingCode,
        queueDate: todayStr,
      })
      .returning();

    if (!insertedQueue) {
      throw new Error("Gagal menerbitkan tiket antrean.");
    }

    // 8. Catat audit log sederhana
    try {
      await db.insert(auditLogs).values({
        userId: null,
        action: "CREATE",
        entity: "QUEUE",
        entityId: insertedQueue.id,
        metadata: {
          queueNumber,
          bookingCode,
          poliId: input.poliId,
          poliName: foundPoli.name,
          doctorId: input.doctorId,
          doctorName: foundDoctor.userName,
          patientId,
          queueDate: todayStr,
          source: "PUBLIC_PORTAL",
        },
      });
    } catch (auditErr) {
      console.error("Gagal mencatat audit log antrean:", auditErr);
    }

    // 9. Kalkulasi estimasi waktu giliran
    const estimasi =
      sequence === 1
        ? "± 10 menit (Giliran pertama sesi)"
        : `± ${(sequence - 1) * 15} menit (Urutan ke-${sequence})`;

    return {
      queueNumber: insertedQueue.queueNumber,
      bookingCode: insertedQueue.bookingCode!,
      poliName: foundPoli.name,
      doctorName: foundDoctor.userName,
      estimasi,
      status: insertedQueue.status as "waiting",
      queueDate: insertedQueue.queueDate,
      patient: {
        id: patientId,
        fullName: patientName,
      },
    };
  }

  /**
   * Melacak status antrean berdasarkan kode booking atau kombinasi nomor antrean + tanggal
   */
  async trackQueue(query: TrackQueueQueryInput): Promise<TrackQueueResult> {
    let condition: SQL | undefined;
    const targetDate = query.date || new Date().toISOString().split("T")[0]!;

    if (query.code) {
      const trimmedCode = query.code.trim().toUpperCase();
      condition = eq(queues.bookingCode, trimmedCode);
    } else if (query.queueNumber) {
      const trimmedQueueNum = query.queueNumber.trim().toUpperCase();
      condition = and(
        eq(queues.queueNumber, trimmedQueueNum),
        eq(queues.queueDate, targetDate),
      );
    }

    if (!condition) {
      throw new BadRequestError(
        "Harap sertakan parameter kode booking ('code') atau nomor antrean ('queueNumber').",
        "INVALID_TRACK_QUERY",
      );
    }

    // 1. Query data antrean lengkap dengan relasi poliklinik, dokter, dan pasien
    const [foundQueue] = await db
      .select({
        id: queues.id,
        queueNumber: queues.queueNumber,
        bookingCode: queues.bookingCode,
        status: queues.status,
        queueDate: queues.queueDate,
        createdAt: queues.createdAt,
        poliId: queues.poliId,
        poliName: polis.name,
        doctorId: queues.doctorId,
        doctorName: users.name,
        patientFullName: patients.fullName,
      })
      .from(queues)
      .innerJoin(polis, eq(polis.id, queues.poliId))
      .innerJoin(patients, eq(patients.id, queues.patientId))
      .leftJoin(doctors, eq(doctors.id, queues.doctorId))
      .leftJoin(users, eq(users.id, doctors.userId))
      .where(condition)
      .limit(1);

    if (!foundQueue) {
      const searchRef = query.code
        ? `kode booking '${query.code}'`
        : `nomor antrean '${query.queueNumber}' untuk tanggal ${targetDate}`;

      throw new NotFoundError(
        `Data antrean untuk ${searchRef} tidak ditemukan. Silakan pastikan kode booking atau nomor antrean Anda sudah benar.`,
        "QUEUE_NOT_FOUND",
      );
    }

    // 2. Hitung jumlah antrean yang berada di depan (peopleAhead) jika masih waiting
    let peopleAhead = 0;
    if (foundQueue.status === "waiting") {
      const [aheadCount] = await db
        .select({ count: sql<number>`count(${queues.id})::int` })
        .from(queues)
        .where(
          and(
            eq(queues.poliId, foundQueue.poliId),
            eq(queues.queueDate, foundQueue.queueDate),
            eq(queues.status, "waiting"),
            sql`${queues.createdAt} < ${foundQueue.createdAt}`,
          ),
        );

      peopleAhead = Number(aheadCount?.count) || 0;
    }

    // 3. Ambil nomor antrean yang saat ini sedang aktif diperiksa di poli yang sama
    const [currentServing] = await db
      .select({ queueNumber: queues.queueNumber })
      .from(queues)
      .where(
        and(
          eq(queues.poliId, foundQueue.poliId),
          eq(queues.queueDate, foundQueue.queueDate),
          eq(queues.status, "in_progress"),
        ),
      )
      .limit(1);

    // 4. Hitung estimasi waktu tunggu (menit)
    let estimatedWaitMinutes: number | null = null;
    if (foundQueue.status === "waiting") {
      estimatedWaitMinutes = (peopleAhead + 1) * 12;
    } else if (foundQueue.status === "in_progress") {
      estimatedWaitMinutes = 0;
    }

    return {
      queueNumber: foundQueue.queueNumber,
      bookingCode: foundQueue.bookingCode,
      status: foundQueue.status as
        "waiting" | "in_progress" | "completed" | "cancelled",
      poliName: foundQueue.poliName,
      doctorName: foundQueue.doctorName || "Dokter Umum",
      patientName: maskPatientName(foundQueue.patientFullName),
      queueDate: foundQueue.queueDate,
      createdAt: foundQueue.createdAt,
      position: {
        peopleAhead,
        currentServing: currentServing?.queueNumber || null,
        estimatedWaitMinutes,
      },
    };
  }
}

export const publicService = new PublicService();
