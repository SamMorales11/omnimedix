import {
  db,
  queues,
  patients,
  doctors,
  medicines,
  prescriptions,
  auditLogs,
  users,
  polis,
} from "@omnimedix/db";
import {
  eq,
  ne,
  and,
  or,
  desc,
  sql,
  ilike,
  inArray,
  type SQL,
} from "drizzle-orm";
import type {
  AdminDashboardSummaryResponse,
  AdminPatientItem,
  AdminPatientQueryInput,
  CreatePatientInput,
  PaginatedPatientResponse,
  UpdatePatientInput,
  AdminDoctorItem,
  AdminDoctorQueryInput,
  CreateDoctorInput,
  PaginatedDoctorResponse,
  UpdateDoctorInput,
  AdminUserItem,
  AdminUserQueryInput,
  AdminCreateUserInput,
  PaginatedUserResponse,
  CreateMedicineInput,
  UpdateMedicineInput,
  PharmacistMedicineQueryInput,
} from "@omnimedix/shared";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  AppError,
} from "../lib/errors";
import { hashPassword } from "../lib/auth";
import {
  pharmacistService,
  computeStockStatus,
  type PharmacistMedicineItem,
} from "./pharmacist.service";

export class AdminService {
  /**
   * Mengambil data ringkasan metrik operasional terpadu untuk Dashboard Admin:
   * 1. Antrean hari ini (total, waiting, in_progress, completed, cancelled)
   * 2. Jumlah pasien terdaftar
   * 3. Jumlah dokter aktif dan total dokter
   * 4. Ringkasan stok obat (total, stok normal, stok rendah, stok habis)
   * 5. Ringkasan resep (pending, preparing, ready, taken, total aktif)
   * 6. 10 aktivitas log terbaru dari audit_logs beserta user terkait
   *
   * Seluruh kueri dieksekusi secara konkuren via Promise.all tanpa N+1 query.
   */
  async getDashboardSummary(
    date?: string,
  ): Promise<AdminDashboardSummaryResponse> {
    const todayStr = date || new Date().toISOString().split("T")[0]!;

    const [
      queueRows,
      patientRows,
      doctorRows,
      [medicineStats],
      [prescriptionStats],
      recentAuditRows,
    ] = await Promise.all([
      // 1. Antrean hari ini digrupkan per status
      db
        .select({
          status: queues.status,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(queues)
        .where(eq(queues.queueDate, todayStr))
        .groupBy(queues.status),

      // 2. Total pasien terdaftar
      db
        .select({
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(patients),

      // 3. Status dokter (aktif vs total)
      db
        .select({
          isActive: doctors.isActive,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(doctors)
        .groupBy(doctors.isActive),

      // 4. Agregasi stok obat aktif dalam 1 query efisien
      db
        .select({
          total: sql<number>`cast(count(*) as integer)`,
          normal: sql<number>`cast(count(*) filter (where ${medicines.currentStock} > ${medicines.minStock}) as integer)`,
          low: sql<number>`cast(count(*) filter (where ${medicines.currentStock} > 0 and ${medicines.currentStock} <= ${medicines.minStock}) as integer)`,
          out: sql<number>`cast(count(*) filter (where ${medicines.currentStock} <= 0) as integer)`,
        })
        .from(medicines)
        .where(eq(medicines.isActive, true)),

      // 5. Agregasi status resep dalam 1 query efisien
      db
        .select({
          pending: sql<number>`cast(count(*) filter (where ${prescriptions.status} = 'pending') as integer)`,
          preparing: sql<number>`cast(count(*) filter (where ${prescriptions.status} = 'preparing') as integer)`,
          ready: sql<number>`cast(count(*) filter (where ${prescriptions.status} = 'ready') as integer)`,
          taken: sql<number>`cast(count(*) filter (where ${prescriptions.status} = 'taken') as integer)`,
          totalActive: sql<number>`cast(count(*) filter (where ${prescriptions.status} in ('pending', 'preparing')) as integer)`,
        })
        .from(prescriptions),

      // 6. 10 Aktivitas terbaru dengan JOIN pengguna untuk mencegah N+1
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity: auditLogs.entity,
          entityId: auditLogs.entityId,
          userId: auditLogs.userId,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(10),
    ]);

    // Kalkulasi ringkasan antrean hari ini
    let waiting = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;

    for (const row of queueRows) {
      if (row.status === "waiting") waiting = Number(row.count);
      else if (row.status === "in_progress") inProgress = Number(row.count);
      else if (row.status === "completed") completed = Number(row.count);
      else if (row.status === "cancelled") cancelled = Number(row.count);
    }

    const todayTotal = waiting + inProgress + completed + cancelled;

    // Kalkulasi dokter aktif vs total
    let activeDoctors = 0;
    let totalDoctors = 0;

    for (const row of doctorRows) {
      const countNum = Number(row.count);
      totalDoctors += countNum;
      if (row.isActive) {
        activeDoctors += countNum;
      }
    }

    return {
      today: todayStr,
      queues: {
        todayTotal,
        waiting,
        inProgress,
        completed,
        cancelled,
      },
      patients: {
        total: Number(patientRows[0]?.count ?? 0),
      },
      doctors: {
        totalActive: activeDoctors,
        total: totalDoctors,
      },
      medicines: {
        total: Number(medicineStats?.total ?? 0),
        normalStock: Number(medicineStats?.normal ?? 0),
        lowStock: Number(medicineStats?.low ?? 0),
        outOfStock: Number(medicineStats?.out ?? 0),
      },
      prescriptions: {
        pending: Number(prescriptionStats?.pending ?? 0),
        preparing: Number(prescriptionStats?.preparing ?? 0),
        ready: Number(prescriptionStats?.ready ?? 0),
        taken: Number(prescriptionStats?.taken ?? 0),
        totalActive: Number(prescriptionStats?.totalActive ?? 0),
      },
      recentActivities: recentAuditRows.map((row) => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        userRole: row.userRole,
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Mengambil daftar pasien dengan pencarian nama/telepon/NIK dan pagination sederhana
   */
  async getPatients(
    query?: AdminPatientQueryInput,
  ): Promise<PaginatedPatientResponse> {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit =
      query?.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    // Filter keaktifan pasien (jika ditentukan)
    if (query?.isActive !== undefined) {
      conditions.push(eq(patients.isActive, query.isActive));
    }

    // Filter pencarian nama, telepon, atau NIK
    if (query?.search && query.search.trim().length > 0) {
      const term = `%${query.search.trim()}%`;
      const searchCond = or(
        ilike(patients.fullName, term),
        ilike(patients.phone, term),
        ilike(patients.nik, term),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [[countRow], rows] = await Promise.all([
      db
        .select({
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(patients)
        .where(whereClause),
      db
        .select()
        .from(patients)
        .where(whereClause)
        .orderBy(desc(patients.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: rows.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        phone: p.phone,
        nik: p.nik,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Mengambil detail lengkap satu pasien berdasarkan ID
   */
  async getPatientById(id: string): Promise<AdminPatientItem> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!patient) {
      throw new NotFoundError(
        `Data pasien dengan ID '${id}' tidak ditemukan.`,
        "PATIENT_NOT_FOUND",
      );
    }

    return {
      id: patient.id,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      nik: patient.nik,
      isActive: patient.isActive,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    };
  }

  /**
   * Mendaftarkan data pasien baru oleh Administrator
   * Mencatat aktivitas ke audit_logs
   */
  async createPatient(
    userId: string,
    input: CreatePatientInput,
  ): Promise<AdminPatientItem> {
    // Validasi keunikan NIK jika disertakan
    if (input.nik && input.nik.trim().length > 0) {
      const [existingNik] = await db
        .select({ id: patients.id, fullName: patients.fullName })
        .from(patients)
        .where(eq(patients.nik, input.nik.trim()))
        .limit(1);

      if (existingNik) {
        throw new ConflictError(
          `Pasien dengan NIK '${input.nik}' sudah terdaftar (${existingNik.fullName}).`,
          "NIK_ALREADY_EXISTS",
        );
      }
    }

    const [created] = await db
      .insert(patients)
      .values({
        fullName: input.fullName.trim(),
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        phone: input.phone ? input.phone.trim() : null,
        nik: input.nik && input.nik.trim().length > 0 ? input.nik.trim() : null,
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!created) {
      throw new AppError("Gagal menyimpan data pasien baru.");
    }

    // Catat log audit aktivitas admin
    await db.insert(auditLogs).values({
      userId,
      action: "CREATE",
      entity: "PATIENT",
      entityId: created.id,
      metadata: {
        action: "CREATE_PATIENT",
        fullName: created.fullName,
        gender: created.gender,
        phone: created.phone,
      },
    });

    return {
      id: created.id,
      fullName: created.fullName,
      dateOfBirth: created.dateOfBirth,
      gender: created.gender,
      phone: created.phone,
      nik: created.nik,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Memperbarui informasi data pasien oleh Administrator
   * Mencatat aktivitas ke audit_logs
   */
  async updatePatient(
    userId: string,
    id: string,
    input: UpdatePatientInput,
  ): Promise<AdminPatientItem> {
    const [existing] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(
        `Data pasien dengan ID '${id}' tidak ditemukan.`,
        "PATIENT_NOT_FOUND",
      );
    }

    // Validasi keunikan NIK jika diubah
    if (
      input.nik &&
      input.nik.trim().length > 0 &&
      input.nik.trim() !== existing.nik
    ) {
      const [existingNik] = await db
        .select({ id: patients.id, fullName: patients.fullName })
        .from(patients)
        .where(and(eq(patients.nik, input.nik.trim()), ne(patients.id, id)))
        .limit(1);

      if (existingNik) {
        throw new ConflictError(
          `Pasien lain dengan NIK '${input.nik}' sudah terdaftar (${existingNik.fullName}).`,
          "NIK_ALREADY_EXISTS",
        );
      }
    }

    const updateValues: Partial<typeof patients.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.fullName !== undefined)
      updateValues.fullName = input.fullName.trim();
    if (input.dateOfBirth !== undefined)
      updateValues.dateOfBirth = input.dateOfBirth;
    if (input.gender !== undefined) updateValues.gender = input.gender;
    if (input.phone !== undefined)
      updateValues.phone = input.phone ? input.phone.trim() : null;
    if (input.nik !== undefined)
      updateValues.nik =
        input.nik && input.nik.trim().length > 0 ? input.nik.trim() : null;
    if (input.isActive !== undefined) updateValues.isActive = input.isActive;

    const [updated] = await db
      .update(patients)
      .set(updateValues)
      .where(eq(patients.id, id))
      .returning();

    if (!updated) {
      throw new AppError("Gagal memperbarui data pasien.");
    }

    // Catat log audit pembaruan
    await db.insert(auditLogs).values({
      userId,
      action: "UPDATE",
      entity: "PATIENT",
      entityId: id,
      metadata: {
        action: "UPDATE_PATIENT",
        updatedFields: Object.keys(input),
        previousFullName: existing.fullName,
        newFullName: updated.fullName,
      },
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      dateOfBirth: updated.dateOfBirth,
      gender: updated.gender,
      phone: updated.phone,
      nik: updated.nik,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Menonaktifkan data pasien (Soft Delete) oleh Administrator
   * Mencegah pemutusan relasi riwayat antrean atau resep medis
   */
  async deletePatient(userId: string, id: string): Promise<AdminPatientItem> {
    const [existing] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(
        `Data pasien dengan ID '${id}' tidak ditemukan.`,
        "PATIENT_NOT_FOUND",
      );
    }

    // Soft delete: tandai isActive = false
    const [deleted] = await db
      .update(patients)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, id))
      .returning();

    if (!deleted) {
      throw new AppError("Gagal menonaktifkan data pasien.");
    }

    // Catat log audit penghapusan/nonaktif
    await db.insert(auditLogs).values({
      userId,
      action: "DELETE",
      entity: "PATIENT",
      entityId: id,
      metadata: {
        action: "SOFT_DELETE_PATIENT",
        fullName: existing.fullName,
        phone: existing.phone,
        nik: existing.nik,
      },
    });

    return {
      id: deleted.id,
      fullName: deleted.fullName,
      dateOfBirth: deleted.dateOfBirth,
      gender: deleted.gender,
      phone: deleted.phone,
      nik: deleted.nik,
      isActive: deleted.isActive,
      createdAt: deleted.createdAt.toISOString(),
      updatedAt: deleted.updatedAt.toISOString(),
    };
  }

  /**
   * ==========================================
   * PENGELOLAAN DATA DOKTER
   * ==========================================
   */

  /**
   * Mengambil daftar dokter dengan join data akun user & poliklinik
   * Support filter berdasarkan poli, status aktif, dan kata kunci pencarian (nama/email/spesialisasi)
   * Password hash tidak disertakan.
   */
  async getDoctors(
    query?: AdminDoctorQueryInput,
  ): Promise<PaginatedDoctorResponse> {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit =
      query?.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    // Filter keaktifan dokter jika ditentukan
    if (query?.isActive !== undefined) {
      conditions.push(eq(doctors.isActive, query.isActive));
    }

    // Filter berdasarkan poliklinik jika ditentukan
    if (query?.poliId !== undefined) {
      conditions.push(eq(doctors.poliId, query.poliId));
    }

    // Filter pencarian nama dokter, email, atau spesialisasi
    if (query?.search && query.search.trim().length > 0) {
      const term = `%${query.search.trim()}%`;
      const searchCond = or(
        ilike(users.name, term),
        ilike(users.email, term),
        ilike(doctors.specialization, term),
        ilike(polis.name, term),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [[countRow], rows] = await Promise.all([
      db
        .select({
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(doctors)
        .innerJoin(users, eq(users.id, doctors.userId))
        .innerJoin(polis, eq(polis.id, doctors.poliId))
        .where(whereClause),
      db
        .select({
          id: doctors.id,
          userId: doctors.userId,
          name: users.name,
          email: users.email,
          role: users.role,
          poliId: doctors.poliId,
          poliName: polis.name,
          specialization: doctors.specialization,
          isActive: doctors.isActive,
          createdAt: doctors.createdAt,
          updatedAt: doctors.updatedAt,
        })
        .from(doctors)
        .innerJoin(users, eq(users.id, doctors.userId))
        .innerJoin(polis, eq(polis.id, doctors.poliId))
        .where(whereClause)
        .orderBy(desc(doctors.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: rows.map((d) => ({
        id: d.id,
        userId: d.userId,
        name: d.name,
        email: d.email,
        role: d.role as "DOCTOR",
        poliId: d.poliId,
        poli: {
          id: d.poliId,
          name: d.poliName,
        },
        specialization: d.specialization,
        isActive: d.isActive,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Mengambil detail satu data dokter beserta akun user dan poli
   * Password hash tidak disertakan.
   */
  async getDoctorById(id: string): Promise<AdminDoctorItem> {
    const [row] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        name: users.name,
        email: users.email,
        role: users.role,
        poliId: doctors.poliId,
        poliName: polis.name,
        specialization: doctors.specialization,
        isActive: doctors.isActive,
        createdAt: doctors.createdAt,
        updatedAt: doctors.updatedAt,
      })
      .from(doctors)
      .innerJoin(users, eq(users.id, doctors.userId))
      .innerJoin(polis, eq(polis.id, doctors.poliId))
      .where(eq(doctors.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundError(
        `Data dokter dengan ID '${id}' tidak ditemukan.`,
        "DOCTOR_NOT_FOUND",
      );
    }

    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      email: row.email,
      role: row.role as "DOCTOR",
      poliId: row.poliId,
      poli: {
        id: row.poliId,
        name: row.poliName,
      },
      specialization: row.specialization,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Menambahkan dokter baru:
   * 1. Validasi poli ada.
   * 2. Bisa membuat user account baru (role DOCTOR) atau mengaitkan user yang sudah ada.
   * 3. Validasi email unik & password di-hash jika membuat user baru.
   * 4. Mencatat log aktivitas ke audit_logs.
   * 5. Password hash tidak pernah dikembalikan di response.
   */
  async createDoctor(
    adminUserId: string,
    input: CreateDoctorInput,
  ): Promise<AdminDoctorItem> {
    // 1. Validasi keberadaan poliklinik
    const [existingPoli] = await db
      .select({ id: polis.id, name: polis.name })
      .from(polis)
      .where(eq(polis.id, input.poliId))
      .limit(1);

    if (!existingPoli) {
      throw new NotFoundError(
        `Poliklinik dengan ID '${input.poliId}' tidak ditemukan.`,
        "POLI_NOT_FOUND",
      );
    }

    let targetUserId: string;
    let createdNewUser = false;

    // 2. Tangani opsi akun user (existing vs baru)
    if (input.userId) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!existingUser) {
        throw new NotFoundError(
          `User dengan ID '${input.userId}' tidak ditemukan.`,
          "USER_NOT_FOUND",
        );
      }

      // Pastikan user belum terdaftar sebagai dokter di record lain
      const [alreadyDoctor] = await db
        .select({ id: doctors.id })
        .from(doctors)
        .where(eq(doctors.userId, input.userId))
        .limit(1);

      if (alreadyDoctor) {
        throw new ConflictError(
          `User '${existingUser.name}' sudah terdaftar sebagai dokter dengan ID '${alreadyDoctor.id}'.`,
          "USER_ALREADY_DOCTOR",
        );
      }

      targetUserId = existingUser.id;

      // Pastikan role user adalah DOCTOR
      if (existingUser.role !== "DOCTOR") {
        await db
          .update(users)
          .set({ role: "DOCTOR", updatedAt: new Date() })
          .where(eq(users.id, existingUser.id));
      }
    } else {
      // Pembuatan user akun dokter baru
      if (!input.name || !input.email || !input.password) {
        throw new BadRequestError(
          "Nama, email, dan password wajib diisi untuk membuat akun user dokter baru.",
          "MISSING_REQUIRED_FIELDS",
        );
      }

      const normalizedEmail = input.email.toLowerCase().trim();

      // Validasi keunikan email
      const [duplicateEmail] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (duplicateEmail) {
        throw new ConflictError(
          `Email '${normalizedEmail}' sudah terdaftar pada pengguna lain.`,
          "EMAIL_ALREADY_EXISTS",
        );
      }

      // Hash password
      const passwordHash = await hashPassword(input.password);

      const [newUser] = await db
        .insert(users)
        .values({
          name: input.name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "DOCTOR",
          isActive: input.isActive ?? true,
        })
        .returning();

      if (!newUser) {
        throw new AppError("Gagal membuat akun user dokter baru.");
      }

      targetUserId = newUser.id;
      createdNewUser = true;
    }

    // 3. Simpan entri dokter baru
    const [newDoctor] = await db
      .insert(doctors)
      .values({
        userId: targetUserId,
        poliId: input.poliId,
        specialization: input.specialization.trim(),
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!newDoctor) {
      throw new AppError("Gagal menyimpan data dokter.");
    }

    // 4. Catat log audit aktivitas admin
    await db.insert(auditLogs).values({
      userId: adminUserId,
      action: "CREATE",
      entity: "DOCTOR",
      entityId: newDoctor.id,
      metadata: {
        action: "CREATE_DOCTOR",
        createdNewUser,
        targetUserId,
        poliId: input.poliId,
        poliName: existingPoli.name,
        specialization: newDoctor.specialization,
        isActive: newDoctor.isActive,
      },
    });

    // 5. Kembalikan detail dokter lengkap tanpa password hash
    return this.getDoctorById(newDoctor.id);
  }

  /**
   * Memperbarui informasi dokter (nama, email, password, poliId, specialization, isActive)
   * Validasi keunikan email jika diubah.
   * Password di-hash jika disediakan.
   * Password hash tidak pernah dikembalikan.
   */
  async updateDoctor(
    adminUserId: string,
    id: string,
    input: UpdateDoctorInput,
  ): Promise<AdminDoctorItem> {
    const [existing] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        poliId: doctors.poliId,
        specialization: doctors.specialization,
        isActive: doctors.isActive,
        userName: users.name,
        userEmail: users.email,
      })
      .from(doctors)
      .innerJoin(users, eq(users.id, doctors.userId))
      .where(eq(doctors.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(
        `Data dokter dengan ID '${id}' tidak ditemukan.`,
        "DOCTOR_NOT_FOUND",
      );
    }

    // Validasi poli jika diubah
    if (input.poliId && input.poliId !== existing.poliId) {
      const [targetPoli] = await db
        .select({ id: polis.id })
        .from(polis)
        .where(eq(polis.id, input.poliId))
        .limit(1);

      if (!targetPoli) {
        throw new NotFoundError(
          `Poliklinik dengan ID '${input.poliId}' tidak ditemukan.`,
          "POLI_NOT_FOUND",
        );
      }
    }

    // Validasi keunikan email jika diubah
    if (input.email) {
      const normalizedEmail = input.email.toLowerCase().trim();
      if (normalizedEmail !== existing.userEmail.toLowerCase()) {
        const [duplicateEmail] = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.email, normalizedEmail),
              ne(users.id, existing.userId),
            ),
          )
          .limit(1);

        if (duplicateEmail) {
          throw new ConflictError(
            `Email '${normalizedEmail}' sudah digunakan akun lain.`,
            "EMAIL_ALREADY_EXISTS",
          );
        }
      }
    }

    // Pembaruan data akun user (name, email, password, isActive)
    const userUpdates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) userUpdates.name = input.name.trim();
    if (input.email !== undefined)
      userUpdates.email = input.email.toLowerCase().trim();
    if (input.password !== undefined && input.password.length > 0) {
      userUpdates.passwordHash = await hashPassword(input.password);
    }
    if (input.isActive !== undefined) userUpdates.isActive = input.isActive;

    if (
      input.name !== undefined ||
      input.email !== undefined ||
      input.password !== undefined ||
      input.isActive !== undefined
    ) {
      await db
        .update(users)
        .set(userUpdates)
        .where(eq(users.id, existing.userId));
    }

    // Pembaruan data dokter (poliId, specialization, isActive)
    const doctorUpdates: Partial<typeof doctors.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.poliId !== undefined) doctorUpdates.poliId = input.poliId;
    if (input.specialization !== undefined)
      doctorUpdates.specialization = input.specialization.trim();
    if (input.isActive !== undefined) doctorUpdates.isActive = input.isActive;

    await db.update(doctors).set(doctorUpdates).where(eq(doctors.id, id));

    // Catat log audit aktivitas admin
    await db.insert(auditLogs).values({
      userId: adminUserId,
      action: "UPDATE",
      entity: "DOCTOR",
      entityId: id,
      metadata: {
        action: "UPDATE_DOCTOR",
        updatedFields: Object.keys(input),
      },
    });

    return this.getDoctorById(id);
  }

  /**
   * Mengubah status keaktifan dokter (aktif/nonaktif)
   * Menyinkronkan status keaktifan record user dokter terkait
   */
  async updateDoctorStatus(
    adminUserId: string,
    id: string,
    isActive: boolean,
  ): Promise<AdminDoctorItem> {
    const [existing] = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        isActive: doctors.isActive,
        name: users.name,
      })
      .from(doctors)
      .innerJoin(users, eq(users.id, doctors.userId))
      .where(eq(doctors.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(
        `Data dokter dengan ID '${id}' tidak ditemukan.`,
        "DOCTOR_NOT_FOUND",
      );
    }

    // Update status di tabel doctors
    await db
      .update(doctors)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(doctors.id, id));

    // Sinkronkan status login di tabel users
    await db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.userId));

    // Catat log audit aktivitas status
    await db.insert(auditLogs).values({
      userId: adminUserId,
      action: "UPDATE",
      entity: "DOCTOR",
      entityId: id,
      metadata: {
        action: "UPDATE_DOCTOR_STATUS",
        doctorName: existing.name,
        previousStatus: existing.isActive,
        newStatus: isActive,
      },
    });

    return this.getDoctorById(id);
  }

  /**
   * ==========================================
   * PENGELOLAAN AKUN PENGGUNA (USER MANAGEMENT)
   * ==========================================
   */

  /**
   * Mengambil daftar akun pengguna terdaftar
   * Support filter berdasarkan role (DOCTOR, PHARMACIST, ADMIN), keaktifan (isActive), dan pencarian nama/email
   * Kolom password_hash tidak disertakan.
   */
  async getUsers(
    query?: AdminUserQueryInput,
  ): Promise<PaginatedUserResponse> {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit =
      query?.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (query?.role) {
      conditions.push(eq(users.role, query.role));
    }

    if (query?.isActive !== undefined) {
      conditions.push(eq(users.isActive, query.isActive));
    }

    if (query?.search && query.search.trim().length > 0) {
      const term = `%${query.search.trim()}%`;
      const searchCond = or(
        ilike(users.name, term),
        ilike(users.email, term),
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [[countRow], rows] = await Promise.all([
      db
        .select({
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(users)
        .where(whereClause),
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const total = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as "ADMIN" | "DOCTOR" | "PHARMACIST",
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Menambahkan akun pengguna baru (Dokter, Apoteker, Admin)
   * Validasi email unik & password di-hash
   * Password hash tidak dikembalikan di response.
   */
  async createUser(
    adminUserId: string,
    input: AdminCreateUserInput,
  ): Promise<AdminUserItem> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Validasi keunikan email
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      throw new ConflictError(
        `Email '${normalizedEmail}' sudah terdaftar pada akun lain.`,
        "EMAIL_ALREADY_EXISTS",
      );
    }

    const passwordHash = await hashPassword(input.password);
    const now = new Date();

    const [newUser] = await db
      .insert(users)
      .values({
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: input.role,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!newUser) {
      throw new AppError("Gagal membuat akun pengguna baru.");
    }

    // Catat log audit aktivitas admin
    await db.insert(auditLogs).values({
      userId: adminUserId,
      action: "CREATE",
      entity: "USER",
      entityId: newUser.id,
      metadata: {
        action: "CREATE_USER",
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
      },
      createdAt: now,
    });

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role as "ADMIN" | "DOCTOR" | "PHARMACIST",
      isActive: newUser.isActive,
      createdAt: newUser.createdAt.toISOString(),
      updatedAt: newUser.updatedAt.toISOString(),
    };
  }

  /**
   * Mengubah status aktif/nonaktif akun pengguna
   * Jika pengguna adalah Dokter, menyinkronkan status ke tabel doctors
   */
  async updateUserStatus(
    adminUserId: string,
    id: string,
    isActive: boolean,
  ): Promise<AdminUserItem> {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(
        `Pengguna dengan ID '${id}' tidak ditemukan.`,
        "USER_NOT_FOUND",
      );
    }

    const now = new Date();

    const [updated] = await db
      .update(users)
      .set({
        isActive,
        updatedAt: now,
      })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      throw new AppError("Gagal memperbarui status pengguna.");
    }

    // Jika pengguna adalah dokter, sinkronkan juga status di tabel doctors
    if (existing.role === "DOCTOR") {
      await db
        .update(doctors)
        .set({
          isActive,
          updatedAt: now,
        })
        .where(eq(doctors.userId, id));
    }

    // Catat log audit aktivitas admin
    await db.insert(auditLogs).values({
      userId: adminUserId,
      action: "UPDATE",
      entity: "USER",
      entityId: id,
      metadata: {
        action: "UPDATE_USER_STATUS",
        userName: existing.name,
        userEmail: existing.email,
        role: existing.role,
        previousStatus: existing.isActive,
        newStatus: isActive,
      },
      createdAt: now,
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role as "ADMIN" | "DOCTOR" | "PHARMACIST",
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Mereset password akun pengguna
   * Password baru di-hash dan disimpan secara aman
   */
  async resetUserPassword(
    adminUserId: string,
    id: string,
    newPassword: string,
  ): Promise<{ id: string; message: string }> {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(
        `Pengguna dengan ID '${id}' tidak ditemukan.`,
        "USER_NOT_FOUND",
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const now = new Date();

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: now,
      })
      .where(eq(users.id, id));

    // Catat log audit reset password
    await db.insert(auditLogs).values({
      userId: adminUserId,
      action: "UPDATE",
      entity: "USER",
      entityId: id,
      metadata: {
        action: "RESET_USER_PASSWORD",
        userName: existing.name,
        userEmail: existing.email,
        role: existing.role,
      },
      createdAt: now,
    });

    return {
      id,
      message: `Password untuk akun '${existing.email}' berhasil direset.`,
    };
  }

  /**
   * ==========================================
   * CRUD MASTER OBAT (ADMIN PRIVILEGE)
   * ==========================================
   */

  /**
   * Mengambil daftar master data obat dengan status stok
   */
  async getMedicines(
    filter?: PharmacistMedicineQueryInput,
  ): Promise<PharmacistMedicineItem[]> {
    return pharmacistService.getMedicines(filter);
  }

  /**
   * Menambahkan obat baru oleh Admin
   */
  async createMedicine(
    adminUserId: string,
    input: CreateMedicineInput,
  ): Promise<PharmacistMedicineItem> {
    return pharmacistService.createMedicine(adminUserId, input);
  }

  /**
   * Memperbarui master data obat oleh Admin
   */
  async updateMedicine(
    adminUserId: string,
    id: string,
    input: UpdateMedicineInput,
  ): Promise<PharmacistMedicineItem> {
    return pharmacistService.updateMedicine(adminUserId, id, input);
  }

  /**
   * Mengubah status aktif/nonaktif master data obat oleh Admin
   */
  async updateMedicineStatus(
    adminUserId: string,
    id: string,
    isActive: boolean,
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

    const now = new Date();

    const [updated] = await db
      .update(medicines)
      .set({
        isActive,
        updatedAt: now,
      })
      .where(eq(medicines.id, id))
      .returning();

    if (!updated) {
      throw new AppError("Gagal memperbarui status obat.");
    }

    // Catat log audit aktivitas admin
    await db.insert(auditLogs).values({
      userId: adminUserId,
      action: "UPDATE",
      entity: "MEDICINE",
      entityId: id,
      metadata: {
        action: "UPDATE_MEDICINE_STATUS",
        name: existing.name,
        previousStatus: existing.isActive,
        newStatus: isActive,
      },
      createdAt: now,
    });

    return {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      unit: updated.unit,
      minStock: updated.minStock,
      currentStock: updated.currentStock,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      stockStatus: computeStockStatus(updated.currentStock, updated.minStock),
    };
  }
}

export const adminService = new AdminService();


