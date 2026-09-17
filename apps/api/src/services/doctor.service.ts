import { eq, and, inArray, ilike } from "drizzle-orm";
import { db } from "../lib/db";
import {
  doctors,
  queues,
  patients,
  polis,
  auditLogs,
  medicines,
  prescriptions,
  prescriptionItems,
} from "@omnimedix/db";
import type { CreatePrescriptionInput } from "@omnimedix/shared";
import { NotFoundError, BadRequestError, ForbiddenError } from "../lib/errors";

export interface DoctorQueuePatient {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  phone: string | null;
  nik: string | null;
}

export interface DoctorQueuePoli {
  id: string;
  name: string;
}

export interface DoctorQueueItem {
  id: string;
  queueNumber: string;
  bookingCode: string | null;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  queueDate: string;
  diagnosis: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: DoctorQueuePatient;
  poli: DoctorQueuePoli;
}

export interface PrescriptionItemDetail {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineCategory: string;
  unit: string;
  dosage: string | null;
  quantity: number;
  instructions: string;
  createdAt: Date;
}

export interface PrescriptionDetail {
  id: string;
  queueId: string | null;
  doctorId: string;
  doctorName?: string;
  patientId: string;
  patientFullName: string;
  status: "pending" | "preparing" | "ready" | "taken";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PrescriptionItemDetail[];
}

export interface ActiveMedicineItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  isActive: boolean;
}

// Aturan transisi status antrean klinis yang masuk akal
const ALLOWED_STATUS_TRANSITIONS: Record<
  "waiting" | "in_progress" | "completed" | "cancelled",
  Array<"waiting" | "in_progress" | "completed" | "cancelled">
> = {
  // Dari waiting: dokter memanggil (in_progress) atau pasien batal/tidak hadir (cancelled)
  waiting: ["in_progress", "cancelled"],

  // Dari in_progress: selesai periksa (completed), jeda kembali ke antrean (waiting), atau batal (cancelled)
  in_progress: ["completed", "waiting", "cancelled"],

  // Status final: tidak boleh diubah lagi
  completed: [],
  cancelled: [],
};

export class DoctorService {
  /**
   * Mengambil profil dokter berdasarkan user ID dari sesi login
   */
  async getDoctorProfileByUserId(userId: string) {
    const [doctor] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        poliId: doctors.poliId,
        specialization: doctors.specialization,
        isActive: doctors.isActive,
      })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    if (!doctor) {
      throw new NotFoundError(
        "Profil data dokter untuk akun ini tidak ditemukan.",
        "DOCTOR_PROFILE_NOT_FOUND",
      );
    }

    if (!doctor.isActive) {
      throw new BadRequestError(
        "Status praktik akun dokter Anda saat ini sedang dinonaktifkan.",
        "DOCTOR_INACTIVE",
      );
    }

    return doctor;
  }

  /**
   * Mengambil daftar antrean hari ini milik dokter yang sedang login
   * Diurutkan berdasarkan queue_number ascending
   */
  async getTodayQueues(
    userId: string,
    date?: string,
  ): Promise<DoctorQueueItem[]> {
    const doctor = await this.getDoctorProfileByUserId(userId);
    const targetDate = date || new Date().toISOString().split("T")[0]!;

    const rows = await db
      .select({
        id: queues.id,
        queueNumber: queues.queueNumber,
        bookingCode: queues.bookingCode,
        status: queues.status,
        queueDate: queues.queueDate,
        diagnosis: queues.diagnosis,
        notes: queues.notes,
        createdAt: queues.createdAt,
        updatedAt: queues.updatedAt,
        patientId: patients.id,
        patientFullName: patients.fullName,
        patientDob: patients.dateOfBirth,
        patientGender: patients.gender,
        patientPhone: patients.phone,
        patientNik: patients.nik,
        poliId: polis.id,
        poliName: polis.name,
      })
      .from(queues)
      .innerJoin(patients, eq(patients.id, queues.patientId))
      .innerJoin(polis, eq(polis.id, queues.poliId))
      .where(
        and(eq(queues.doctorId, doctor.id), eq(queues.queueDate, targetDate)),
      )
      .orderBy(queues.queueNumber);

    return rows.map((row) => ({
      id: row.id,
      queueNumber: row.queueNumber,
      bookingCode: row.bookingCode,
      status: row.status as
        "waiting" | "in_progress" | "completed" | "cancelled",
      queueDate: row.queueDate,
      diagnosis: row.diagnosis,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: {
        id: row.patientId,
        fullName: row.patientFullName,
        dateOfBirth: row.patientDob,
        gender: row.patientGender as "MALE" | "FEMALE",
        phone: row.patientPhone,
        nik: row.patientNik,
      },
      poli: {
        id: row.poliId,
        name: row.poliName,
      },
    }));
  }

  /**
   * Mengambil detail satu antrean berdasarkan ID
   * Memvalidasi kepemilikan antrean oleh dokter yang sedang login
   */
  async getQueueById(
    userId: string,
    queueId: string,
  ): Promise<DoctorQueueItem> {
    const doctor = await this.getDoctorProfileByUserId(userId);

    const [row] = await db
      .select({
        id: queues.id,
        queueNumber: queues.queueNumber,
        bookingCode: queues.bookingCode,
        status: queues.status,
        queueDate: queues.queueDate,
        diagnosis: queues.diagnosis,
        notes: queues.notes,
        createdAt: queues.createdAt,
        updatedAt: queues.updatedAt,
        doctorId: queues.doctorId,
        patientId: patients.id,
        patientFullName: patients.fullName,
        patientDob: patients.dateOfBirth,
        patientGender: patients.gender,
        patientPhone: patients.phone,
        patientNik: patients.nik,
        poliId: polis.id,
        poliName: polis.name,
      })
      .from(queues)
      .innerJoin(patients, eq(patients.id, queues.patientId))
      .innerJoin(polis, eq(polis.id, queues.poliId))
      .where(eq(queues.id, queueId))
      .limit(1);

    if (!row) {
      throw new NotFoundError(
        "Data antrean tidak ditemukan.",
        "QUEUE_NOT_FOUND",
      );
    }

    if (row.doctorId !== doctor.id) {
      throw new ForbiddenError(
        "Akses ditolak. Anda hanya diperbolehkan mengakses antrean milik Anda sendiri.",
        "FORBIDDEN_QUEUE_ACCESS",
      );
    }

    return {
      id: row.id,
      queueNumber: row.queueNumber,
      bookingCode: row.bookingCode,
      status: row.status as
        "waiting" | "in_progress" | "completed" | "cancelled",
      queueDate: row.queueDate,
      diagnosis: row.diagnosis,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: {
        id: row.patientId,
        fullName: row.patientFullName,
        dateOfBirth: row.patientDob,
        gender: row.patientGender as "MALE" | "FEMALE",
        phone: row.patientPhone,
        nik: row.patientNik,
      },
      poli: {
        id: row.poliId,
        name: row.poliName,
      },
    };
  }

  /**
   * Mengubah status antrean pasien milik dokter yang sedang login
   * Memvalidasi kepemilikan dan transisi status yang valid
   */
  async updateQueueStatus(
    userId: string,
    queueId: string,
    nextStatus: "waiting" | "in_progress" | "completed" | "cancelled",
  ): Promise<DoctorQueueItem> {
    const doctor = await this.getDoctorProfileByUserId(userId);

    // Cari data antrean
    const [existingQueue] = await db
      .select({
        id: queues.id,
        doctorId: queues.doctorId,
        status: queues.status,
        queueNumber: queues.queueNumber,
        bookingCode: queues.bookingCode,
        queueDate: queues.queueDate,
        diagnosis: queues.diagnosis,
        notes: queues.notes,
        createdAt: queues.createdAt,
        updatedAt: queues.updatedAt,
        patientId: patients.id,
        patientFullName: patients.fullName,
        patientDob: patients.dateOfBirth,
        patientGender: patients.gender,
        patientPhone: patients.phone,
        patientNik: patients.nik,
        poliId: polis.id,
        poliName: polis.name,
      })
      .from(queues)
      .innerJoin(patients, eq(patients.id, queues.patientId))
      .innerJoin(polis, eq(polis.id, queues.poliId))
      .where(eq(queues.id, queueId))
      .limit(1);

    if (!existingQueue) {
      throw new NotFoundError(
        "Data antrean tidak ditemukan.",
        "QUEUE_NOT_FOUND",
      );
    }

    // Pastikan dokter hanya dapat mengubah antrean miliknya sendiri
    if (existingQueue.doctorId !== doctor.id) {
      throw new ForbiddenError(
        "Akses ditolak. Anda hanya diperbolehkan mengelola antrean milik Anda sendiri.",
        "FORBIDDEN_QUEUE_ACCESS",
      );
    }

    const currentStatus = existingQueue.status as
      "waiting" | "in_progress" | "completed" | "cancelled";

    // Jika status yang diminta sama dengan status saat ini, kembalikan data langsung (idempotent)
    if (currentStatus === nextStatus) {
      return {
        id: existingQueue.id,
        queueNumber: existingQueue.queueNumber,
        bookingCode: existingQueue.bookingCode,
        status: currentStatus,
        queueDate: existingQueue.queueDate,
        diagnosis: existingQueue.diagnosis,
        notes: existingQueue.notes,
        createdAt: existingQueue.createdAt,
        updatedAt: existingQueue.updatedAt,
        patient: {
          id: existingQueue.patientId,
          fullName: existingQueue.patientFullName,
          dateOfBirth: existingQueue.patientDob,
          gender: existingQueue.patientGender as "MALE" | "FEMALE",
          phone: existingQueue.patientPhone,
          nik: existingQueue.patientNik,
        },
        poli: {
          id: existingQueue.poliId,
          name: existingQueue.poliName,
        },
      };
    }

    // Validasi transisi status
    const allowedTargets = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(nextStatus)) {
      if (currentStatus === "completed") {
        throw new BadRequestError(
          "Antrean yang sudah berstatus 'completed' (selesai) tidak dapat diubah kembali.",
          "INVALID_STATUS_TRANSITION",
        );
      }
      if (currentStatus === "cancelled") {
        throw new BadRequestError(
          "Antrean yang sudah berstatus 'cancelled' (dibatalkan) tidak dapat diaktifkan kembali.",
          "INVALID_STATUS_TRANSITION",
        );
      }
      throw new BadRequestError(
        `Perubahan status antrean dari '${currentStatus}' menjadi '${nextStatus}' tidak diperbolehkan. Status yang diizinkan berikutnya: ${allowedTargets.join(", ")}.`,
        "INVALID_STATUS_TRANSITION",
      );
    }

    // Update status antrean
    const now = new Date();
    await db
      .update(queues)
      .set({
        status: nextStatus,
        updatedAt: now,
      })
      .where(eq(queues.id, queueId));

    // Catat ke audit log
    try {
      await db.insert(auditLogs).values({
        userId,
        action: "UPDATE",
        entity: "QUEUE",
        entityId: queueId,
        metadata: {
          action: "UPDATE_STATUS",
          previousStatus: currentStatus,
          newStatus: nextStatus,
          queueNumber: existingQueue.queueNumber,
          doctorId: doctor.id,
        },
      });
    } catch (auditErr) {
      console.error("Gagal mencatat audit log dokter:", auditErr);
    }

    return {
      id: existingQueue.id,
      queueNumber: existingQueue.queueNumber,
      bookingCode: existingQueue.bookingCode,
      status: nextStatus,
      queueDate: existingQueue.queueDate,
      diagnosis: existingQueue.diagnosis,
      notes: existingQueue.notes,
      createdAt: existingQueue.createdAt,
      updatedAt: now,
      patient: {
        id: existingQueue.patientId,
        fullName: existingQueue.patientFullName,
        dateOfBirth: existingQueue.patientDob,
        gender: existingQueue.patientGender as "MALE" | "FEMALE",
        phone: existingQueue.patientPhone,
        nik: existingQueue.patientNik,
      },
      poli: {
        id: existingQueue.poliId,
        name: existingQueue.poliName,
      },
    };
  }

  /**
   * Menyimpan pencatatan diagnosis dan catatan medis oleh dokter pemeriksa
   */
  async recordDiagnosis(
    userId: string,
    queueId: string,
    input: { diagnosis: string; notes?: string | null },
  ): Promise<DoctorQueueItem> {
    const doctor = await this.getDoctorProfileByUserId(userId);

    // Cari antrean
    const [existingQueue] = await db
      .select({
        id: queues.id,
        doctorId: queues.doctorId,
        status: queues.status,
        queueNumber: queues.queueNumber,
        bookingCode: queues.bookingCode,
        queueDate: queues.queueDate,
        diagnosis: queues.diagnosis,
        notes: queues.notes,
        createdAt: queues.createdAt,
        updatedAt: queues.updatedAt,
        patientId: patients.id,
        patientFullName: patients.fullName,
        patientDob: patients.dateOfBirth,
        patientGender: patients.gender,
        patientPhone: patients.phone,
        patientNik: patients.nik,
        poliId: polis.id,
        poliName: polis.name,
      })
      .from(queues)
      .innerJoin(patients, eq(patients.id, queues.patientId))
      .innerJoin(polis, eq(polis.id, queues.poliId))
      .where(eq(queues.id, queueId))
      .limit(1);

    if (!existingQueue) {
      throw new NotFoundError(
        "Data antrean tidak ditemukan.",
        "QUEUE_NOT_FOUND",
      );
    }

    // Pastikan antrean milik dokter yang login
    if (existingQueue.doctorId !== doctor.id) {
      throw new ForbiddenError(
        "Akses ditolak. Anda hanya diperbolehkan mencatat diagnosis pada antrean milik Anda sendiri.",
        "FORBIDDEN_QUEUE_ACCESS",
      );
    }

    // Validasi status: tidak bisa mencatat diagnosis pada antrean yang sudah dibatalkan
    if (existingQueue.status === "cancelled") {
      throw new BadRequestError(
        "Tidak dapat mencatat diagnosis pada antrean yang telah dibatalkan.",
        "CANNOT_DIAGNOSE_CANCELLED_QUEUE",
      );
    }

    const trimmedDiagnosis = input.diagnosis.trim();
    const trimmedNotes = input.notes ? input.notes.trim() || null : null;
    const now = new Date();

    await db
      .update(queues)
      .set({
        diagnosis: trimmedDiagnosis,
        notes: trimmedNotes,
        updatedAt: now,
      })
      .where(eq(queues.id, queueId));

    // Catat ke audit log
    try {
      await db.insert(auditLogs).values({
        userId,
        action: "UPDATE",
        entity: "QUEUE",
        entityId: queueId,
        metadata: {
          action: "RECORD_DIAGNOSIS",
          queueNumber: existingQueue.queueNumber,
          doctorId: doctor.id,
          diagnosisSnippet:
            trimmedDiagnosis.length > 50
              ? `${trimmedDiagnosis.slice(0, 50)}...`
              : trimmedDiagnosis,
          hasNotes: Boolean(trimmedNotes),
        },
      });
    } catch (auditErr) {
      console.error("Gagal mencatat audit log diagnosis:", auditErr);
    }

    return {
      id: existingQueue.id,
      queueNumber: existingQueue.queueNumber,
      bookingCode: existingQueue.bookingCode,
      status: existingQueue.status as
        "waiting" | "in_progress" | "completed" | "cancelled",
      queueDate: existingQueue.queueDate,
      diagnosis: trimmedDiagnosis,
      notes: trimmedNotes,
      createdAt: existingQueue.createdAt,
      updatedAt: now,
      patient: {
        id: existingQueue.patientId,
        fullName: existingQueue.patientFullName,
        dateOfBirth: existingQueue.patientDob,
        gender: existingQueue.patientGender as "MALE" | "FEMALE",
        phone: existingQueue.patientPhone,
        nik: existingQueue.patientNik,
      },
      poli: {
        id: existingQueue.poliId,
        name: existingQueue.poliName,
      },
    };
  }

  /**
   * Membuat resep obat untuk antrean pasien yang diperiksa dokter
   * Menggunakan transaksi database agar data prescription & prescription_items konsisten
   */
  async createPrescription(
    userId: string,
    input: CreatePrescriptionInput,
  ): Promise<PrescriptionDetail> {
    const doctor = await this.getDoctorProfileByUserId(userId);

    return await db.transaction(async (tx) => {
      // 1. Validasi antrean & kepemilikan dokter
      const [queue] = await tx
        .select({
          id: queues.id,
          doctorId: queues.doctorId,
          patientId: queues.patientId,
          status: queues.status,
          queueNumber: queues.queueNumber,
          patientFullName: patients.fullName,
        })
        .from(queues)
        .innerJoin(patients, eq(patients.id, queues.patientId))
        .where(eq(queues.id, input.queueId))
        .limit(1);

      if (!queue) {
        throw new NotFoundError(
          "Data antrean tidak ditemukan.",
          "QUEUE_NOT_FOUND",
        );
      }

      if (queue.doctorId !== doctor.id) {
        throw new ForbiddenError(
          "Akses ditolak. Anda hanya diperbolehkan menulis resep untuk pasien dalam antrean Anda sendiri.",
          "FORBIDDEN_QUEUE_ACCESS",
        );
      }

      if (queue.status === "cancelled") {
        throw new BadRequestError(
          "Tidak dapat membuat resep untuk antrean yang telah dibatalkan.",
          "CANNOT_PRESCRIBE_CANCELLED_QUEUE",
        );
      }

      if (queue.status === "completed") {
        throw new BadRequestError(
          "Tidak dapat membuat resep untuk antrean yang sudah selesai.",
          "QUEUE_ALREADY_COMPLETED",
        );
      }

      // 2. Cek apakah resep untuk antrean ini sudah pernah dibuat sebelumnya
      const [existingPrescription] = await tx
        .select({ id: prescriptions.id })
        .from(prescriptions)
        .where(eq(prescriptions.queueId, input.queueId))
        .limit(1);

      if (existingPrescription) {
        throw new BadRequestError(
          "Resep obat untuk antrean ini sudah pernah dibuat sebelumnya.",
          "PRESCRIPTION_ALREADY_EXISTS",
        );
      }

      // 3. Validasi semua medicineId ada dan berstatus aktif
      const uniqueMedicineIds = Array.from(
        new Set(input.items.map((i) => i.medicineId)),
      );

      const foundMedicines = await tx
        .select({
          id: medicines.id,
          name: medicines.name,
          category: medicines.category,
          unit: medicines.unit,
          isActive: medicines.isActive,
          currentStock: medicines.currentStock,
        })
        .from(medicines)
        .where(inArray(medicines.id, uniqueMedicineIds));

      const activeMedicineMap = new Map(
        foundMedicines.filter((m) => m.isActive).map((m) => [m.id, m]),
      );

      const invalidIds = uniqueMedicineIds.filter(
        (id) => !activeMedicineMap.has(id),
      );
      if (invalidIds.length > 0) {
        throw new BadRequestError(
          `Satu atau lebih obat tidak ditemukan atau sedang tidak aktif (ID: ${invalidIds.join(", ")}).`,
          "INVALID_OR_INACTIVE_MEDICINE",
        );
      }

      // 4. Buat record resep di tabel prescriptions (status awal: "pending")
      const trimmedNotes = input.notes ? input.notes.trim() || null : null;
      const now = new Date();

      const [newPrescription] = await tx
        .insert(prescriptions)
        .values({
          queueId: queue.id,
          doctorId: doctor.id,
          patientId: queue.patientId,
          status: "pending",
          notes: trimmedNotes,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!newPrescription) {
        throw new BadRequestError(
          "Gagal membuat data resep obat.",
          "PRESCRIPTION_CREATION_FAILED",
        );
      }

      // 5. Buat record di prescription_items
      const insertedItems = await tx
        .insert(prescriptionItems)
        .values(
          input.items.map((item) => ({
            prescriptionId: newPrescription.id,
            medicineId: item.medicineId,
            dosage: item.dosage.trim(),
            quantity: item.quantity,
            instructions: item.instructions.trim(),
            createdAt: now,
          })),
        )
        .returning();

      // 6. Update status antrean jika masih waiting menjadi in_progress
      if (queue.status === "waiting") {
        await tx
          .update(queues)
          .set({
            status: "in_progress",
            updatedAt: now,
          })
          .where(eq(queues.id, queue.id));
      }

      // 7. Catat ke audit log
      try {
        await tx.insert(auditLogs).values({
          userId,
          action: "CREATE",
          entity: "PRESCRIPTION",
          entityId: newPrescription.id,
          metadata: {
            action: "CREATE_PRESCRIPTION",
            prescriptionId: newPrescription.id,
            queueId: queue.id,
            queueNumber: queue.queueNumber,
            doctorId: doctor.id,
            patientId: queue.patientId,
            itemCount: input.items.length,
            medicines: input.items.map((it) => ({
              medicineId: it.medicineId,
              name: activeMedicineMap.get(it.medicineId)?.name,
              quantity: it.quantity,
              dosage: it.dosage,
            })),
          },
        });
      } catch (auditErr) {
        console.error("Gagal mencatat audit log resep obat:", auditErr);
      }

      // 8. Bentuk response lengkap beserta detail items dan obat
      return {
        id: newPrescription.id,
        queueId: newPrescription.queueId,
        doctorId: newPrescription.doctorId,
        patientId: newPrescription.patientId,
        patientFullName: queue.patientFullName,
        status: newPrescription.status as
          "pending" | "preparing" | "ready" | "taken",
        notes: newPrescription.notes,
        createdAt: newPrescription.createdAt,
        updatedAt: newPrescription.updatedAt,
        items: insertedItems.map((item) => {
          const med = activeMedicineMap.get(item.medicineId);
          return {
            id: item.id,
            medicineId: item.medicineId,
            medicineName: med?.name ?? "",
            medicineCategory: med?.category ?? "",
            unit: med?.unit ?? "",
            dosage: item.dosage,
            quantity: item.quantity,
            instructions: item.instructions,
            createdAt: item.createdAt,
          };
        }),
      };
    });
  }

  /**
   * Mengambil resep untuk antrean tertentu (jika ada) milik dokter yang login
   */
  async getPrescriptionByQueueId(
    userId: string,
    queueId: string,
  ): Promise<PrescriptionDetail | null> {
    const doctor = await this.getDoctorProfileByUserId(userId);

    const [queue] = await db
      .select({
        id: queues.id,
        doctorId: queues.doctorId,
        patientFullName: patients.fullName,
      })
      .from(queues)
      .innerJoin(patients, eq(patients.id, queues.patientId))
      .where(eq(queues.id, queueId))
      .limit(1);

    if (!queue) {
      throw new NotFoundError(
        "Data antrean tidak ditemukan.",
        "QUEUE_NOT_FOUND",
      );
    }

    if (queue.doctorId !== doctor.id) {
      throw new ForbiddenError(
        "Akses ditolak. Anda hanya diperbolehkan melihat resep untuk antrean Anda sendiri.",
        "FORBIDDEN_QUEUE_ACCESS",
      );
    }

    const [prescription] = await db
      .select({
        id: prescriptions.id,
        queueId: prescriptions.queueId,
        doctorId: prescriptions.doctorId,
        patientId: prescriptions.patientId,
        status: prescriptions.status,
        notes: prescriptions.notes,
        createdAt: prescriptions.createdAt,
        updatedAt: prescriptions.updatedAt,
      })
      .from(prescriptions)
      .where(eq(prescriptions.queueId, queueId))
      .limit(1);

    if (!prescription) {
      return null;
    }

    const items = await db
      .select({
        id: prescriptionItems.id,
        medicineId: prescriptionItems.medicineId,
        medicineName: medicines.name,
        medicineCategory: medicines.category,
        unit: medicines.unit,
        dosage: prescriptionItems.dosage,
        quantity: prescriptionItems.quantity,
        instructions: prescriptionItems.instructions,
        createdAt: prescriptionItems.createdAt,
      })
      .from(prescriptionItems)
      .innerJoin(medicines, eq(medicines.id, prescriptionItems.medicineId))
      .where(eq(prescriptionItems.prescriptionId, prescription.id))
      .orderBy(prescriptionItems.createdAt);

    return {
      id: prescription.id,
      queueId: prescription.queueId,
      doctorId: prescription.doctorId,
      patientId: prescription.patientId,
      patientFullName: queue.patientFullName,
      status: prescription.status as
        "pending" | "preparing" | "ready" | "taken",
      notes: prescription.notes,
      createdAt: prescription.createdAt,
      updatedAt: prescription.updatedAt,
      items: items.map((it) => ({
        id: it.id,
        medicineId: it.medicineId,
        medicineName: it.medicineName,
        medicineCategory: it.medicineCategory,
        unit: it.unit,
        dosage: it.dosage,
        quantity: it.quantity,
        instructions: it.instructions,
        createdAt: it.createdAt,
      })),
    };
  }

  /**
   * Mengambil daftar obat aktif untuk keperluan penulisan resep oleh dokter
   */
  async getActiveMedicines(options?: {
    search?: string;
    category?: string;
  }): Promise<ActiveMedicineItem[]> {
    const rows = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        category: medicines.category,
        unit: medicines.unit,
        currentStock: medicines.currentStock,
        minStock: medicines.minStock,
        isActive: medicines.isActive,
      })
      .from(medicines)
      .where(eq(medicines.isActive, true))
      .orderBy(medicines.name);

    let result = rows;

    if (options?.search) {
      const s = options.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(s) ||
          m.category.toLowerCase().includes(s),
      );
    }

    if (options?.category) {
      const c = options.category.toLowerCase();
      result = result.filter((m) => m.category.toLowerCase() === c);
    }

    return result;
  }
}

export const doctorService = new DoctorService();
