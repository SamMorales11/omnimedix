import {
  eq,
  ne,
  and,
  or,
  inArray,
  desc,
  asc,
  sql,
  ilike,
  lte,
  gte,
  gt,
  type SQL,
} from "drizzle-orm";
import { db } from "../lib/db";
import {
  prescriptions,
  prescriptionItems,
  medicines,
  stockMovements,
  patients,
  doctors,
  users,
  queues,
  polis,
  auditLogs,
} from "@omnimedix/db";
import type {
  CreateMedicineInput,
  UpdateMedicineInput,
  PharmacistMedicineQueryInput,
  CreateStockMovementInput,
  PharmacistStockMovementsQueryInput,
  PharmacistStockReportQueryInput,
} from "@omnimedix/shared";
import { NotFoundError, BadRequestError } from "../lib/errors";

export interface PharmacistPrescriptionItem {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineCategory: string;
  unit: string;
  dosage: string | null;
  quantity: number;
  instructions: string;
  currentStock: number;
  createdAt: Date;
}

export interface PharmacistPrescriptionPatient {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  phone: string | null;
  nik: string | null;
}

export interface PharmacistPrescriptionDoctor {
  id: string;
  name: string;
  specialization: string;
  poliName: string;
}

export interface PharmacistPrescriptionQueue {
  id: string;
  queueNumber: string;
  bookingCode: string | null;
  queueDate: string;
  diagnosis: string | null;
  notes: string | null;
}

export interface PharmacistPrescriptionDetail {
  id: string;
  queueId: string | null;
  queue: PharmacistPrescriptionQueue | null;
  doctorId: string;
  doctor: PharmacistPrescriptionDoctor;
  patientId: string;
  patient: PharmacistPrescriptionPatient;
  status: "pending" | "preparing" | "ready" | "taken";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PharmacistPrescriptionItem[];
}

export interface GetPrescriptionsFilter {
  status?: "all" | "pending" | "preparing" | "ready" | "taken";
  search?: string;
}

// Aturan transisi status resep yang wajar dalam alur farmasi
export const ALLOWED_PRESCRIPTION_TRANSITIONS: Record<
  "pending" | "preparing" | "ready" | "taken",
  Array<"pending" | "preparing" | "ready" | "taken">
> = {
  // Dari pending: Apoteker mulai meracik/menyiapkan (preparing) atau langsung siap (ready)
  pending: ["preparing", "ready"],

  // Dari preparing: Selesai disiapkan (ready), atau dikembalikan ke pending jika tertunda
  preparing: ["ready", "pending"],

  // Dari ready: Obat diserahkan ke pasien (taken), atau dikembalikan ke preparing jika perlu revisi
  ready: ["taken", "preparing"],

  // Status final: Obat sudah diambil/diserahkan ke pasien, tidak dapat diubah lagi
  taken: [],
};

export class PharmacistService {
  /**
   * Mengembalikan daftar resep obat untuk apoteker.
   * Default: Menampilkan resep dengan status 'pending' dan 'preparing'.
   * Bisa difilter berdasarkan status tertentu ('all' | 'pending' | 'preparing' | 'ready' | 'taken').
   * Diurutkan berdasarkan prioritas status (pending -> preparing -> ready -> taken) dan createdAt terbaru.
   */
  async getPrescriptions(
    filter?: GetPrescriptionsFilter,
  ): Promise<PharmacistPrescriptionDetail[]> {
    const conditions: SQL[] = [];

    // Filter status resep
    if (filter?.status && filter.status !== "all") {
      conditions.push(eq(prescriptions.status, filter.status));
    } else if (!filter?.status) {
      // Default: yang masih pending dan preparing
      conditions.push(inArray(prescriptions.status, ["pending", "preparing"]));
    }

    // Filter pencarian (nama pasien, nama dokter, nomor antrean, kode booking)
    if (filter?.search && filter.search.trim().length > 0) {
      const term = `%${filter.search.trim()}%`;
      const searchCondition = or(
        ilike(patients.fullName, term),
        ilike(users.name, term),
        ilike(queues.queueNumber, term),
        ilike(queues.bookingCode, term),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Urutan prioritas status resep: pending (1) -> preparing (2) -> ready (3) -> taken (4)
    const statusPrioritySql = sql<number>`
      CASE 
        WHEN ${prescriptions.status} = 'pending' THEN 1
        WHEN ${prescriptions.status} = 'preparing' THEN 2
        WHEN ${prescriptions.status} = 'ready' THEN 3
        WHEN ${prescriptions.status} = 'taken' THEN 4
        ELSE 5
      END
    `;

    const rows = await db
      .select({
        id: prescriptions.id,
        queueId: prescriptions.queueId,
        status: prescriptions.status,
        notes: prescriptions.notes,
        createdAt: prescriptions.createdAt,
        updatedAt: prescriptions.updatedAt,
        // Data Pasien
        patientId: patients.id,
        patientFullName: patients.fullName,
        patientDateOfBirth: patients.dateOfBirth,
        patientGender: patients.gender,
        patientPhone: patients.phone,
        patientNik: patients.nik,
        // Data Dokter
        doctorId: doctors.id,
        doctorName: users.name,
        doctorSpecialization: doctors.specialization,
        poliName: polis.name,
        // Data Antrean
        queueNumber: queues.queueNumber,
        bookingCode: queues.bookingCode,
        queueDate: queues.queueDate,
        queueDiagnosis: queues.diagnosis,
        queueNotes: queues.notes,
      })
      .from(prescriptions)
      .innerJoin(patients, eq(patients.id, prescriptions.patientId))
      .innerJoin(doctors, eq(doctors.id, prescriptions.doctorId))
      .innerJoin(users, eq(users.id, doctors.userId))
      .innerJoin(polis, eq(polis.id, doctors.poliId))
      .leftJoin(queues, eq(queues.id, prescriptions.queueId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(statusPrioritySql), desc(prescriptions.createdAt));

    if (rows.length === 0) {
      return [];
    }

    // Ambil item obat untuk semua resep yang ditemukan secara efisien
    const prescriptionIds = rows.map((r) => r.id);
    const items = await db
      .select({
        id: prescriptionItems.id,
        prescriptionId: prescriptionItems.prescriptionId,
        medicineId: prescriptionItems.medicineId,
        medicineName: medicines.name,
        medicineCategory: medicines.category,
        unit: medicines.unit,
        dosage: prescriptionItems.dosage,
        quantity: prescriptionItems.quantity,
        instructions: prescriptionItems.instructions,
        currentStock: medicines.currentStock,
        createdAt: prescriptionItems.createdAt,
      })
      .from(prescriptionItems)
      .innerJoin(medicines, eq(medicines.id, prescriptionItems.medicineId))
      .where(inArray(prescriptionItems.prescriptionId, prescriptionIds))
      .orderBy(prescriptionItems.createdAt);

    // Kelompokkan items berdasarkan prescriptionId
    const itemsMap = new Map<string, PharmacistPrescriptionItem[]>();
    for (const item of items) {
      const list = itemsMap.get(item.prescriptionId) ?? [];
      list.push({
        id: item.id,
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        medicineCategory: item.medicineCategory,
        unit: item.unit,
        dosage: item.dosage,
        quantity: item.quantity,
        instructions: item.instructions,
        currentStock: item.currentStock,
        createdAt: item.createdAt,
      });
      itemsMap.set(item.prescriptionId, list);
    }

    return rows.map((row) => ({
      id: row.id,
      queueId: row.queueId,
      queue: row.queueId
        ? {
            id: row.queueId,
            queueNumber: row.queueNumber ?? "-",
            bookingCode: row.bookingCode,
            queueDate: row.queueDate ?? "",
            diagnosis: row.queueDiagnosis,
            notes: row.queueNotes,
          }
        : null,
      doctorId: row.doctorId,
      doctor: {
        id: row.doctorId,
        name: row.doctorName,
        specialization: row.doctorSpecialization,
        poliName: row.poliName,
      },
      patientId: row.patientId,
      patient: {
        id: row.patientId,
        fullName: row.patientFullName,
        dateOfBirth: row.patientDateOfBirth,
        gender: row.patientGender,
        phone: row.patientPhone,
        nik: row.patientNik,
      },
      status: row.status as "pending" | "preparing" | "ready" | "taken",
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      items: itemsMap.get(row.id) ?? [],
    }));
  }

  /**
   * Mengembalikan detail lengkap satu resep obat berdasarkan ID
   */
  async getPrescriptionById(id: string): Promise<PharmacistPrescriptionDetail> {
    const [row] = await db
      .select({
        id: prescriptions.id,
        queueId: prescriptions.queueId,
        status: prescriptions.status,
        notes: prescriptions.notes,
        createdAt: prescriptions.createdAt,
        updatedAt: prescriptions.updatedAt,
        // Data Pasien
        patientId: patients.id,
        patientFullName: patients.fullName,
        patientDateOfBirth: patients.dateOfBirth,
        patientGender: patients.gender,
        patientPhone: patients.phone,
        patientNik: patients.nik,
        // Data Dokter
        doctorId: doctors.id,
        doctorName: users.name,
        doctorSpecialization: doctors.specialization,
        poliName: polis.name,
        // Data Antrean
        queueNumber: queues.queueNumber,
        bookingCode: queues.bookingCode,
        queueDate: queues.queueDate,
        queueDiagnosis: queues.diagnosis,
        queueNotes: queues.notes,
      })
      .from(prescriptions)
      .innerJoin(patients, eq(patients.id, prescriptions.patientId))
      .innerJoin(doctors, eq(doctors.id, prescriptions.doctorId))
      .innerJoin(users, eq(users.id, doctors.userId))
      .innerJoin(polis, eq(polis.id, doctors.poliId))
      .leftJoin(queues, eq(queues.id, prescriptions.queueId))
      .where(eq(prescriptions.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundError(
        "Data resep obat tidak ditemukan.",
        "PRESCRIPTION_NOT_FOUND",
      );
    }

    const items = await db
      .select({
        id: prescriptionItems.id,
        prescriptionId: prescriptionItems.prescriptionId,
        medicineId: prescriptionItems.medicineId,
        medicineName: medicines.name,
        medicineCategory: medicines.category,
        unit: medicines.unit,
        dosage: prescriptionItems.dosage,
        quantity: prescriptionItems.quantity,
        instructions: prescriptionItems.instructions,
        currentStock: medicines.currentStock,
        createdAt: prescriptionItems.createdAt,
      })
      .from(prescriptionItems)
      .innerJoin(medicines, eq(medicines.id, prescriptionItems.medicineId))
      .where(eq(prescriptionItems.prescriptionId, id))
      .orderBy(prescriptionItems.createdAt);

    return {
      id: row.id,
      queueId: row.queueId,
      queue: row.queueId
        ? {
            id: row.queueId,
            queueNumber: row.queueNumber ?? "-",
            bookingCode: row.bookingCode,
            queueDate: row.queueDate ?? "",
            diagnosis: row.queueDiagnosis,
            notes: row.queueNotes,
          }
        : null,
      doctorId: row.doctorId,
      doctor: {
        id: row.doctorId,
        name: row.doctorName,
        specialization: row.doctorSpecialization,
        poliName: row.poliName,
      },
      patientId: row.patientId,
      patient: {
        id: row.patientId,
        fullName: row.patientFullName,
        dateOfBirth: row.patientDateOfBirth,
        gender: row.patientGender,
        phone: row.patientPhone,
        nik: row.patientNik,
      },
      status: row.status as "pending" | "preparing" | "ready" | "taken",
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      items: items.map((it) => ({
        id: it.id,
        medicineId: it.medicineId,
        medicineName: it.medicineName,
        medicineCategory: it.medicineCategory,
        unit: it.unit,
        dosage: it.dosage,
        quantity: it.quantity,
        instructions: it.instructions,
        currentStock: it.currentStock,
        createdAt: it.createdAt,
      })),
    };
  }

  /**
   * Mengubah status resep obat oleh Apoteker.
   * Melakukan validasi transisi status:
   * - pending -> preparing | ready
   * - preparing -> ready | pending
   * - ready -> taken | preparing
   * - taken -> tidak dapat diubah lagi (final)
   *
   * Ketika status menjadi 'taken':
   * - Mengurangi stok obat di tabel `medicines` secara atomik
   * - Mencatat mutasi keluar pada tabel `stock_movements`
   * - Mencatat aktivitas ke `audit_logs`
   */
  async updatePrescriptionStatus(
    userId: string,
    id: string,
    newStatus: "pending" | "preparing" | "ready" | "taken",
  ): Promise<PharmacistPrescriptionDetail> {
    await db.transaction(async (tx) => {
      // 1. Ambil data resep saat ini
      const [current] = await tx
        .select({
          id: prescriptions.id,
          status: prescriptions.status,
          queueId: prescriptions.queueId,
          patientId: prescriptions.patientId,
          doctorId: prescriptions.doctorId,
        })
        .from(prescriptions)
        .where(eq(prescriptions.id, id))
        .limit(1);

      if (!current) {
        throw new NotFoundError(
          "Data resep obat tidak ditemukan.",
          "PRESCRIPTION_NOT_FOUND",
        );
      }

      const currentStatus = current.status as
        "pending" | "preparing" | "ready" | "taken";

      // 2. Cek apakah status yang diminta sama dengan status sekarang
      if (currentStatus === newStatus) {
        throw new BadRequestError(
          `Status resep saat ini sudah '${newStatus}'.`,
          "SAME_STATUS",
        );
      }

      // 3. Validasi transisi status yang wajar
      const allowedNextStatuses =
        ALLOWED_PRESCRIPTION_TRANSITIONS[currentStatus];
      if (!allowedNextStatuses || !allowedNextStatuses.includes(newStatus)) {
        throw new BadRequestError(
          `Perubahan status resep dari '${currentStatus}' ke '${newStatus}' tidak diizinkan.`,
          "INVALID_STATUS_TRANSITION",
        );
      }

      const now = new Date();

      // 4. Jika status berubah menjadi 'taken' (obat diserahkan ke pasien),
      // kurangi stok obat dan catat mutasi stok
      if (newStatus === "taken") {
        const items = await tx
          .select({
            id: prescriptionItems.id,
            medicineId: prescriptionItems.medicineId,
            quantity: prescriptionItems.quantity,
          })
          .from(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, id));

        for (const item of items) {
          // Kurangi stok obat secara atomik (tidak boleh negatif)
          await tx
            .update(medicines)
            .set({
              currentStock: sql`GREATEST(0, ${medicines.currentStock} - ${item.quantity})`,
              updatedAt: now,
            })
            .where(eq(medicines.id, item.medicineId));

          // Catat mutasi stok keluar
          await tx.insert(stockMovements).values({
            medicineId: item.medicineId,
            type: "out",
            quantity: item.quantity,
            reason: `Penyerahan resep obat #${id.slice(0, 8)}`,
            referenceId: id,
            createdAt: now,
          });
        }
      }

      // 5. Update status resep
      await tx
        .update(prescriptions)
        .set({
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(prescriptions.id, id));

      // 6. Catat audit log aksi apoteker
      try {
        await tx.insert(auditLogs).values({
          userId,
          action: "UPDATE",
          entity: "PRESCRIPTION",
          entityId: id,
          metadata: {
            action: "UPDATE_PRESCRIPTION_STATUS",
            prescriptionId: id,
            previousStatus: currentStatus,
            newStatus,
          },
          createdAt: now,
        });
      } catch (auditErr) {
        console.error(
          "Gagal mencatat audit log perubahan status resep:",
          auditErr,
        );
      }
    });

    // 7. Setelah transaksi di-commit, kembalikan detail resep terbaru
    return await this.getPrescriptionById(id);
  }

  /**
   * ==========================================
   * PENGELOLAAN MASTER DATA OBAT
   * ==========================================
   */

  /**
   * Mengembalikan daftar master data obat dengan status stok terhitung (normal / low / out).
   * Mendukung pencarian (nama & kategori), filter low_stock, filter stock_status, dan filter is_active.
   */
  async getMedicines(
    filter?: PharmacistMedicineQueryInput,
  ): Promise<PharmacistMedicineItem[]> {
    const conditions: SQL[] = [];

    // Filter status aktif
    if (filter?.is_active === true) {
      conditions.push(eq(medicines.isActive, true));
    } else if (filter?.is_active === false) {
      conditions.push(eq(medicines.isActive, false));
    } else if (filter?.is_active === undefined) {
      // Default: hanya obat yang berstatus aktif
      conditions.push(eq(medicines.isActive, true));
    }
    // Jika filter.is_active === "all", tidak menambahkan filter isActive

    // Filter pencarian nama atau kategori
    if (filter?.search && filter.search.trim().length > 0) {
      const term = `%${filter.search.trim()}%`;
      const searchCond = or(
        ilike(medicines.name, term),
        ilike(medicines.category, term),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    // Filter kategori obat
    if (filter?.category && filter.category.trim().length > 0) {
      conditions.push(eq(medicines.category, filter.category.trim()));
    }

    // Filter low stock (currentStock <= minStock)
    if (filter?.low_stock === true) {
      conditions.push(lte(medicines.currentStock, medicines.minStock));
    }

    // Filter status stok spesifik ('normal' | 'low' | 'out')
    if (filter?.stock_status && filter.stock_status !== "all") {
      if (filter.stock_status === "out") {
        conditions.push(lte(medicines.currentStock, 0));
      } else if (filter.stock_status === "low") {
        conditions.push(
          and(
            gt(medicines.currentStock, 0),
            lte(medicines.currentStock, medicines.minStock),
          )!,
        );
      } else if (filter.stock_status === "normal") {
        conditions.push(gt(medicines.currentStock, medicines.minStock));
      }
    }

    const rows = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        category: medicines.category,
        unit: medicines.unit,
        minStock: medicines.minStock,
        currentStock: medicines.currentStock,
        isActive: medicines.isActive,
        createdAt: medicines.createdAt,
        updatedAt: medicines.updatedAt,
      })
      .from(medicines)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(medicines.name));

    return rows.map((row) => ({
      ...row,
      stockStatus: computeStockStatus(row.currentStock, row.minStock),
    }));
  }

  /**
   * Mengambil detail satu data obat berdasarkan ID
   */
  async getMedicineById(id: string): Promise<PharmacistMedicineItem> {
    const [row] = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        category: medicines.category,
        unit: medicines.unit,
        minStock: medicines.minStock,
        currentStock: medicines.currentStock,
        isActive: medicines.isActive,
        createdAt: medicines.createdAt,
        updatedAt: medicines.updatedAt,
      })
      .from(medicines)
      .where(eq(medicines.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundError(
        "Data obat tidak ditemukan.",
        "MEDICINE_NOT_FOUND",
      );
    }

    return {
      ...row,
      stockStatus: computeStockStatus(row.currentStock, row.minStock),
    };
  }

  /**
   * Menambahkan data obat baru ke katalog apotek
   */
  async createMedicine(
    userId: string,
    input: CreateMedicineInput,
  ): Promise<PharmacistMedicineItem> {
    const trimmedName = input.name.trim();

    // Validasi apakah nama obat sudah terdaftar
    const [existing] = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        isActive: medicines.isActive,
      })
      .from(medicines)
      .where(ilike(medicines.name, trimmedName))
      .limit(1);

    if (existing) {
      if (existing.isActive) {
        throw new BadRequestError(
          `Obat dengan nama '${existing.name}' sudah terdaftar dalam sistem.`,
          "MEDICINE_ALREADY_EXISTS",
        );
      } else {
        throw new BadRequestError(
          `Obat dengan nama '${existing.name}' sudah ada dalam arsip (non-aktif). Anda dapat mengaktifkannya kembali melalui update.`,
          "MEDICINE_EXISTS_INACTIVE",
        );
      }
    }

    const now = new Date();
    let createdId = "";

    await db.transaction(async (tx) => {
      const [newMed] = await tx
        .insert(medicines)
        .values({
          name: trimmedName,
          category: input.category.trim(),
          unit: input.unit.trim(),
          minStock: input.minStock,
          currentStock: input.currentStock,
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!newMed) {
        throw new BadRequestError(
          "Gagal menambahkan data obat baru.",
          "CREATE_MEDICINE_FAILED",
        );
      }

      createdId = newMed.id;

      // Catat mutasi stok awal jika ada
      if (input.currentStock > 0) {
        await tx.insert(stockMovements).values({
          medicineId: newMed.id,
          type: "in",
          quantity: input.currentStock,
          reason: "Stok awal pengadaan master data obat baru",
          referenceId: newMed.id,
          createdAt: now,
        });
      }

      // Catat audit log
      try {
        await tx.insert(auditLogs).values({
          userId,
          action: "CREATE",
          entity: "MEDICINE",
          entityId: newMed.id,
          metadata: {
            action: "CREATE_MEDICINE",
            name: newMed.name,
            category: newMed.category,
            unit: newMed.unit,
            minStock: newMed.minStock,
            currentStock: newMed.currentStock,
          },
          createdAt: now,
        });
      } catch (auditErr) {
        console.error("Gagal mencatat audit log penambahan obat:", auditErr);
      }
    });

    return await this.getMedicineById(createdId);
  }

  /**
   * Memperbarui informasi data obat dan/atau stok
   */
  async updateMedicine(
    userId: string,
    id: string,
    input: UpdateMedicineInput,
  ): Promise<PharmacistMedicineItem> {
    const [existing] = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        currentStock: medicines.currentStock,
        minStock: medicines.minStock,
        isActive: medicines.isActive,
      })
      .from(medicines)
      .where(eq(medicines.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(
        "Data obat tidak ditemukan.",
        "MEDICINE_NOT_FOUND",
      );
    }

    // Jika nama diubah, pastikan tidak konflik dengan obat lain
    if (
      input.name &&
      input.name.trim().toLowerCase() !== existing.name.toLowerCase()
    ) {
      const trimmedName = input.name.trim();
      const [duplicate] = await db
        .select({ id: medicines.id })
        .from(medicines)
        .where(and(ilike(medicines.name, trimmedName), ne(medicines.id, id)))
        .limit(1);

      if (duplicate) {
        throw new BadRequestError(
          `Obat dengan nama '${trimmedName}' sudah terdaftar pada obat lain.`,
          "MEDICINE_NAME_CONFLICT",
        );
      }
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      // Catat mutasi penyesuaian stok jika currentStock diubah
      if (
        input.currentStock !== undefined &&
        input.currentStock !== existing.currentStock
      ) {
        const diff = input.currentStock - existing.currentStock;
        if (diff > 0) {
          await tx.insert(stockMovements).values({
            medicineId: id,
            type: "in",
            quantity: diff,
            reason: "Penyesuaian stok masuk (Manual Adjustment)",
            referenceId: id,
            createdAt: now,
          });
        } else if (diff < 0) {
          await tx.insert(stockMovements).values({
            medicineId: id,
            type: "out",
            quantity: Math.abs(diff),
            reason: "Penyesuaian stok keluar (Manual Adjustment)",
            referenceId: id,
            createdAt: now,
          });
        }
      }

      const updateData: Partial<typeof medicines.$inferInsert> = {
        updatedAt: now,
      };

      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.category !== undefined)
        updateData.category = input.category.trim();
      if (input.unit !== undefined) updateData.unit = input.unit.trim();
      if (input.minStock !== undefined) updateData.minStock = input.minStock;
      if (input.currentStock !== undefined)
        updateData.currentStock = input.currentStock;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await tx.update(medicines).set(updateData).where(eq(medicines.id, id));

      try {
        await tx.insert(auditLogs).values({
          userId,
          action: "UPDATE",
          entity: "MEDICINE",
          entityId: id,
          metadata: {
            action: "UPDATE_MEDICINE",
            updatedFields: Object.keys(input),
            previousStock: existing.currentStock,
            newStock: input.currentStock,
          },
          createdAt: now,
        });
      } catch (auditErr) {
        console.error("Gagal mencatat audit log pembaruan obat:", auditErr);
      }
    });

    return await this.getMedicineById(id);
  }

  /**
   * Menghapus obat dari peredaran aktif (Soft Delete)
   */
  async deleteMedicine(
    userId: string,
    id: string,
  ): Promise<PharmacistMedicineItem> {
    const [existing] = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        isActive: medicines.isActive,
      })
      .from(medicines)
      .where(eq(medicines.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(
        "Data obat tidak ditemukan.",
        "MEDICINE_NOT_FOUND",
      );
    }

    if (!existing.isActive) {
      throw new BadRequestError(
        `Obat '${existing.name}' sudah dalam status non-aktif.`,
        "MEDICINE_ALREADY_INACTIVE",
      );
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      // Soft delete: set isActive = false
      await tx
        .update(medicines)
        .set({
          isActive: false,
          updatedAt: now,
        })
        .where(eq(medicines.id, id));

      try {
        await tx.insert(auditLogs).values({
          userId,
          action: "DELETE",
          entity: "MEDICINE",
          entityId: id,
          metadata: {
            action: "SOFT_DELETE_MEDICINE",
            name: existing.name,
          },
          createdAt: now,
        });
      } catch (auditErr) {
        console.error("Gagal mencatat audit log penghapusan obat:", auditErr);
      }
    });

    return await this.getMedicineById(id);
  }

  /**
   * ==========================================
   * PENCATATAN OBAT MASUK & MUTASI STOK
   * ==========================================
   */

  /**
   * Mencatat mutasi obat masuk (atau keluar) ke tabel stock_movements
   * Memperbarui current_stock di tabel medicines secara atomik
   * Menyimpan log aktivitas ke audit_logs
   */
  async recordStockMovement(
    userId: string,
    input: CreateStockMovementInput,
  ): Promise<PharmacistStockMovementRecord> {
    const [medicine] = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        category: medicines.category,
        unit: medicines.unit,
        minStock: medicines.minStock,
        currentStock: medicines.currentStock,
        isActive: medicines.isActive,
      })
      .from(medicines)
      .where(eq(medicines.id, input.medicineId))
      .limit(1);

    if (!medicine) {
      throw new NotFoundError(
        "Data obat tidak ditemukan.",
        "MEDICINE_NOT_FOUND",
      );
    }

    if (!medicine.isActive) {
      throw new BadRequestError(
        `Tidak dapat mencatat mutasi stok untuk obat '${medicine.name}' yang berstatus non-aktif.`,
        "MEDICINE_INACTIVE",
      );
    }

    if (input.type === "out" && medicine.currentStock < input.quantity) {
      throw new BadRequestError(
        `Stok obat '${medicine.name}' tidak mencukupi (Tersedia: ${medicine.currentStock}, Diminta: ${input.quantity}).`,
        "INSUFFICIENT_STOCK",
      );
    }

    const now = new Date();
    const newStock =
      input.type === "in"
        ? medicine.currentStock + input.quantity
        : Math.max(0, medicine.currentStock - input.quantity);

    let createdMovementId = "";
    let formattedReason = input.reason.trim();
    if (input.reference && input.reference.trim().length > 0) {
      formattedReason = `${formattedReason} [Ref: ${input.reference.trim()}]`;
    }
    if (formattedReason.length > 255) {
      formattedReason = formattedReason.slice(0, 255);
    }

    await db.transaction(async (tx) => {
      // 1. Update current_stock di tabel medicines
      await tx
        .update(medicines)
        .set({
          currentStock: newStock,
          updatedAt: now,
        })
        .where(eq(medicines.id, input.medicineId));

      // 2. Insert record ke stock_movements
      const [movement] = await tx
        .insert(stockMovements)
        .values({
          medicineId: input.medicineId,
          type: input.type,
          quantity: input.quantity,
          reason: formattedReason,
          createdAt: now,
        })
        .returning();

      if (!movement) {
        throw new BadRequestError(
          "Gagal mencatat mutasi stok obat.",
          "STOCK_MOVEMENT_FAILED",
        );
      }

      createdMovementId = movement.id;

      // 3. Catat ke audit_logs
      try {
        await tx.insert(auditLogs).values({
          userId,
          action: "CREATE",
          entity: "STOCK_MOVEMENT",
          entityId: movement.id,
          metadata: {
            action: input.type === "in" ? "STOCK_IN" : "STOCK_OUT",
            medicineId: medicine.id,
            medicineName: medicine.name,
            type: input.type,
            quantity: input.quantity,
            previousStock: medicine.currentStock,
            newStock,
            reason: input.reason,
            reference: input.reference,
          },
          createdAt: now,
        });
      } catch (auditErr) {
        console.error("Gagal mencatat audit log mutasi stok:", auditErr);
      }
    });

    return {
      id: createdMovementId,
      medicineId: medicine.id,
      medicineName: medicine.name,
      medicineCategory: medicine.category,
      unit: medicine.unit,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason.trim(),
      reference: input.reference ? input.reference.trim() : null,
      createdAt: now,
      currentStock: newStock,
      stockStatus: computeStockStatus(newStock, medicine.minStock),
    };
  }

  /**
   * Mengambil riwayat pergerakan stok obat (bisa difilter per medicineId atau tipe)
   */
  async getStockMovements(
    filter?: PharmacistStockMovementsQueryInput,
  ): Promise<PharmacistStockMovementRecord[]> {
    const conditions: SQL[] = [];

    if (filter?.medicineId) {
      conditions.push(eq(stockMovements.medicineId, filter.medicineId));
    }

    if (filter?.type && filter.type !== "all") {
      conditions.push(eq(stockMovements.type, filter.type));
    }

    const rows = await db
      .select({
        id: stockMovements.id,
        medicineId: stockMovements.medicineId,
        medicineName: medicines.name,
        medicineCategory: medicines.category,
        unit: medicines.unit,
        minStock: medicines.minStock,
        currentStock: medicines.currentStock,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        rawReason: stockMovements.reason,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(medicines, eq(medicines.id, stockMovements.medicineId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(stockMovements.createdAt))
      .limit(filter?.limit ?? 50);

    return rows.map((row) => {
      // Ekstrak referensi dari teks reason jika ada format [Ref: ...]
      let cleanReason = row.rawReason ?? "";
      let extractedRef: string | null = null;
      const refMatch = cleanReason.match(/\[Ref:\s*([^\]]+)\]/);
      if (refMatch && refMatch[1]) {
        extractedRef = refMatch[1].trim();
        cleanReason = cleanReason.replace(/\[Ref:\s*[^\]]+\]/, "").trim();
      }

      return {
        id: row.id,
        medicineId: row.medicineId,
        medicineName: row.medicineName,
        medicineCategory: row.medicineCategory,
        unit: row.unit,
        type: row.type,
        quantity: row.quantity,
        reason: cleanReason,
        reference: extractedRef,
        createdAt: row.createdAt,
        currentStock: row.currentStock,
        stockStatus: computeStockStatus(row.currentStock, row.minStock),
      };
    });
  }

  /**
   * ==========================================
   * LAPORAN STOK & DASHBOARD SUMMARY
   * ==========================================
   */

  /**
   * Mengembalikan laporan stok obat sederhana beserta ringkasan metrik:
   * - Total obat
   * - Jumlah obat dengan stok rendah (currentStock <= minStock dan > 0)
   * - Jumlah obat dengan stok habis (currentStock <= 0)
   * - Jumlah obat dengan stok normal (currentStock > minStock)
   * Mendukung filter opsional: lowStockOnly (boolean) dan category (string).
   */
  async getStockReport(
    filter?: PharmacistStockReportQueryInput,
  ): Promise<PharmacistStockReportResponse> {
    const conditions: SQL[] = [eq(medicines.isActive, true)];

    if (filter?.category && filter.category.trim().length > 0) {
      conditions.push(eq(medicines.category, filter.category.trim()));
    }

    const rows = await db
      .select({
        id: medicines.id,
        name: medicines.name,
        category: medicines.category,
        unit: medicines.unit,
        minStock: medicines.minStock,
        currentStock: medicines.currentStock,
        isActive: medicines.isActive,
        updatedAt: medicines.updatedAt,
      })
      .from(medicines)
      .where(and(...conditions))
      .orderBy(asc(medicines.name));

    let outOfStockCount = 0;
    let lowStockCount = 0;
    let normalStockCount = 0;

    const allMapped: PharmacistStockReportItem[] = rows.map((row) => {
      const status = computeStockStatus(row.currentStock, row.minStock);
      if (status === "out") {
        outOfStockCount++;
      } else if (status === "low") {
        lowStockCount++;
      } else {
        normalStockCount++;
      }

      return {
        id: row.id,
        name: row.name,
        category: row.category,
        unit: row.unit,
        minStock: row.minStock,
        currentStock: row.currentStock,
        stockStatus: status,
        isActive: row.isActive,
        updatedAt: row.updatedAt,
      };
    });

    const isLowStockOnly = filter?.lowStockOnly || filter?.low_stock_only;
    const filteredMedicines = isLowStockOnly
      ? allMapped.filter(
          (m) => m.stockStatus === "low" || m.stockStatus === "out",
        )
      : allMapped;

    return {
      summary: {
        totalMedicines: rows.length,
        lowStockCount,
        outOfStockCount,
        normalStockCount,
      },
      medicines: filteredMedicines,
    };
  }

  /**
   * Mengembalikan ringkasan data penting untuk Pharmacist Dashboard:
   * - Metrik resep (pending, preparing, ready, taken today)
   * - Metrik stok (total obat, stok normal, stok rendah, stok habis)
   * - Daftar resep aktif terbaru yang butuh perhatian
   * - Riwayat mutasi stok terbaru
   */
  async getDashboardSummary(): Promise<PharmacistDashboardSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      prescriptionRows,
      takenTodayRows,
      medicineRows,
      recentPrescriptions,
      recentStockMovements,
    ] = await Promise.all([
      // 1. Status resep aktif
      db
        .select({
          status: prescriptions.status,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(prescriptions)
        .where(inArray(prescriptions.status, ["pending", "preparing", "ready"]))
        .groupBy(prescriptions.status),

      // 2. Resep yang diserahkan hari ini
      db
        .select({
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.status, "taken"),
            gte(prescriptions.updatedAt, today),
          ),
        ),

      // 3. Stok obat aktif
      db
        .select({
          currentStock: medicines.currentStock,
          minStock: medicines.minStock,
        })
        .from(medicines)
        .where(eq(medicines.isActive, true)),

      // 4. Daftar resep pending
      this.getPrescriptions({ status: "pending" }),

      // 5. Riwayat mutasi stok terbaru
      this.getStockMovements({ limit: 5 }),
    ]);

    let pendingCount = 0;
    let preparingCount = 0;
    let readyCount = 0;

    for (const row of prescriptionRows) {
      if (row.status === "pending") pendingCount = Number(row.count);
      else if (row.status === "preparing") preparingCount = Number(row.count);
      else if (row.status === "ready") readyCount = Number(row.count);
    }

    const takenTodayCount = Number(takenTodayRows[0]?.count ?? 0);

    let outOfStock = 0;
    let lowStock = 0;
    let normalStock = 0;

    for (const med of medicineRows) {
      const status = computeStockStatus(med.currentStock, med.minStock);
      if (status === "out") outOfStock++;
      else if (status === "low") lowStock++;
      else normalStock++;
    }

    return {
      metrics: {
        prescriptions: {
          pending: pendingCount,
          preparing: preparingCount,
          ready: readyCount,
          takenToday: takenTodayCount,
          totalActive: pendingCount + preparingCount,
        },
        stock: {
          totalMedicines: medicineRows.length,
          normalStock,
          lowStock,
          outOfStock,
        },
      },
      recentPrescriptions: recentPrescriptions.slice(0, 5),
      recentStockMovements,
    };
  }
}

export type MedicineStockStatus = "normal" | "low" | "out";

export interface PharmacistMedicineItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  currentStock: number;
  stockStatus: MedicineStockStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PharmacistStockMovementRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineCategory: string;
  unit: string;
  type: "in" | "out";
  quantity: number;
  reason: string | null;
  reference: string | null;
  createdAt: Date;
  currentStock: number;
  stockStatus: MedicineStockStatus;
}

export interface PharmacistStockReportSummary {
  totalMedicines: number;
  lowStockCount: number;
  outOfStockCount: number;
  normalStockCount: number;
}

export interface PharmacistStockReportItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  currentStock: number;
  stockStatus: MedicineStockStatus;
  isActive: boolean;
  updatedAt: Date;
}

export interface PharmacistStockReportResponse {
  summary: PharmacistStockReportSummary;
  medicines: PharmacistStockReportItem[];
}

export interface PharmacistDashboardMetrics {
  prescriptions: {
    pending: number;
    preparing: number;
    ready: number;
    takenToday: number;
    totalActive: number;
  };
  stock: {
    totalMedicines: number;
    normalStock: number;
    lowStock: number;
    outOfStock: number;
  };
}

export interface PharmacistDashboardSummary {
  metrics: PharmacistDashboardMetrics;
  recentPrescriptions: PharmacistPrescriptionDetail[];
  recentStockMovements: PharmacistStockMovementRecord[];
}

export function computeStockStatus(
  currentStock: number,
  minStock: number,
): MedicineStockStatus {
  if (currentStock <= 0) {
    return "out";
  }
  if (currentStock <= minStock) {
    return "low";
  }
  return "normal";
}

export const pharmacistService = new PharmacistService();
