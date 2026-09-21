import "dotenv/config";
import { db } from "./client";
import {
  users,
  polis,
  doctors,
  patients,
  medicines,
  queues,
  prescriptions,
  prescriptionItems,
  stockMovements,
  auditLogs,
} from "./schema";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";

const BCRYPT_SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

// Helper date formatting YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function seed() {
  const isFresh =
    process.argv.includes("--fresh") ||
    process.argv.includes("--clean") ||
    process.env.CLEAR_DB === "true";

  console.info("===========================================================");
  console.info("🌱 [Omnimedix DB Seed] Memulai proses seeding database...");
  if (isFresh) {
    console.info("⚡ Mode: FRESH (Membersihkan data lama terlebih dahulu)");
  } else {
    console.info("🛡️ Mode: IDEMPOTENT (Insert data jika belum ada)");
  }
  console.info("===========================================================");

  try {
    // ----------------------------------------------------
    // 0. PEMBERSIHAN DATA (JIKA MODE FRESH)
    // ----------------------------------------------------
    if (isFresh) {
      console.info("\n🧹 0. Menghapus data lama sesuai urutan dependensi foreign key...");
      await db.delete(auditLogs);
      await db.delete(stockMovements);
      await db.delete(prescriptionItems);
      await db.delete(prescriptions);
      await db.delete(queues);
      await db.delete(patients);
      await db.delete(doctors);
      await db.delete(users);
      await db.delete(medicines);
      await db.delete(polis);
      console.info("   ✅ Database berhasil dibersihkan.");
    }

    // ----------------------------------------------------
    // 1. SEED MASTER DATA: POLIKLINIK (4 POLI)
    // ----------------------------------------------------
    console.info("\n🏥 1. Melakukan seeding master data Poliklinik...");

    const defaultPolis = [
      {
        name: "Poli Umum",
        description:
          "Pelayanan kesehatan primer, pemeriksaan umum, dan pengobatan dasar untuk segala usia.",
        isActive: true,
      },
      {
        name: "Poli Gigi & Mulut",
        description:
          "Pelayanan kesehatan gigi, penambalan, pencabutan, scalling karang gigi, dan bedah mulut minor.",
        isActive: true,
      },
      {
        name: "Poli Anak (Pediatri)",
        description:
          "Pemeriksaan kesehatan bayi dan anak, pemantauan tumbuh kembang, serta program imunisasi.",
        isActive: true,
      },
      {
        name: "Poli Penyakit Dalam",
        description:
          "Diagnosis dan penanganan penyakit organ dalam komprehensif non-bedah (diabetes, hipertensi, dll).",
        isActive: true,
      },
    ];

    const poliMap: Record<string, string> = {};

    for (const p of defaultPolis) {
      const [existing] = await db
        .select()
        .from(polis)
        .where(eq(polis.name, p.name))
        .limit(1);

      if (existing) {
        poliMap[p.name] = existing.id;
        console.info(`   ℹ️ Poli "${p.name}" sudah ada.`);
      } else {
        const [inserted] = await db.insert(polis).values(p).returning();
        if (inserted) {
          poliMap[p.name] = inserted.id;
          console.info(`   ✅ Berhasil membuat Poli "${inserted.name}".`);
        }
      }
    }

    // ----------------------------------------------------
    // 2. SEED AKUN PENGGUNA & DOKTER
    // ----------------------------------------------------
    console.info("\n👥 2. Melakukan seeding Pengguna (Admin, Dokter, Apoteker)...");

    const [adminHash, dokterHash, apotekerHash] = await Promise.all([
      hashPassword("Admin123!"),
      hashPassword("Dokter123!"),
      hashPassword("Apoteker123!"),
    ]);

    const defaultUsers = [
      // Admins (2 Akun)
      {
        email: "admin@omnimedix.local",
        passwordHash: adminHash,
        name: "Administrator Omnimedix",
        role: "ADMIN" as const,
      },
      {
        email: "admin.klinik@omnimedix.local",
        passwordHash: adminHash,
        name: "Rizka Amelia, S.Kom (Admin RS)",
        role: "ADMIN" as const,
      },

      // Dokter (6 Dokter tersebar di semua poli)
      {
        email: "dokter@omnimedix.local",
        passwordHash: dokterHash,
        name: "dr. Budi Santoso, Sp.PD",
        role: "DOCTOR" as const,
        doctor: {
          poliName: "Poli Umum",
          specialization: "Dokter Umum & Penyakit Dalam",
        },
      },
      {
        email: "dr.farhan@omnimedix.local",
        passwordHash: dokterHash,
        name: "dr. Farhan Maulana",
        role: "DOCTOR" as const,
        doctor: {
          poliName: "Poli Umum",
          specialization: "Dokter Layanan Primer",
        },
      },
      {
        email: "dr.nadia@omnimedix.local",
        passwordHash: dokterHash,
        name: "drg. Nadia Sarah, Sp.KG",
        role: "DOCTOR" as const,
        doctor: {
          poliName: "Poli Gigi & Mulut",
          specialization: "Dokter Gigi Konservasi",
        },
      },
      {
        email: "drg.rizky@omnimedix.local",
        passwordHash: dokterHash,
        name: "drg. Rizky Pratama",
        role: "DOCTOR" as const,
        doctor: {
          poliName: "Poli Gigi & Mulut",
          specialization: "Dokter Gigi Umum & Estetika",
        },
      },
      {
        email: "dr.anisa@omnimedix.local",
        passwordHash: dokterHash,
        name: "dr. Anisa Rahmawati, Sp.A",
        role: "DOCTOR" as const,
        doctor: {
          poliName: "Poli Anak (Pediatri)",
          specialization: "Spesialis Kesehatan Anak",
        },
      },
      {
        email: "dr.hendra@omnimedix.local",
        passwordHash: dokterHash,
        name: "dr. Hendra Gunawan, Sp.PD",
        role: "DOCTOR" as const,
        doctor: {
          poliName: "Poli Penyakit Dalam",
          specialization: "Spesialis Penyakit Dalam (Internist)",
        },
      },

      // Apoteker (4 Apoteker)
      {
        email: "apoteker@omnimedix.local",
        passwordHash: apotekerHash,
        name: "Siti Aminah, S.Farm., Apt.",
        role: "PHARMACIST" as const,
      },
      {
        email: "apoteker.rahmat@omnimedix.local",
        passwordHash: apotekerHash,
        name: "Rahmat Hidayat, S.Farm., Apt.",
        role: "PHARMACIST" as const,
      },
      {
        email: "apoteker.diana@omnimedix.local",
        passwordHash: apotekerHash,
        name: "Diana Kusuma, S.Farm., Apt.",
        role: "PHARMACIST" as const,
      },
      {
        email: "apoteker.fajar@omnimedix.local",
        passwordHash: apotekerHash,
        name: "Fajar Ramadhan, S.Farm.",
        role: "PHARMACIST" as const,
      },
    ];

    const doctorMap: Record<string, string> = {}; // key: doctor user email or doctorId

    for (const u of defaultUsers) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, u.email))
        .limit(1);

      let userId = existingUser?.id;

      if (existingUser) {
        console.info(`   ℹ️ User "${u.email}" (${u.role}) sudah ada.`);
      } else {
        const [newUser] = await db
          .insert(users)
          .values({
            email: u.email,
            passwordHash: u.passwordHash,
            name: u.name,
            role: u.role,
            isActive: true,
          })
          .returning();
        if (newUser) {
          userId = newUser.id;
          console.info(`   ✅ User "${newUser.email}" (${newUser.role}) berhasil dibuat.`);
        }
      }

      // Hubungkan data dokter jika role = DOCTOR
      if (u.role === "DOCTOR" && u.doctor && userId) {
        const [existingDoctor] = await db
          .select()
          .from(doctors)
          .where(eq(doctors.userId, userId))
          .limit(1);

        if (existingDoctor) {
          doctorMap[u.email] = existingDoctor.id;
          console.info(`   ℹ️ Profil Dokter "${u.name}" sudah ada.`);
        } else {
          const targetPoliId = poliMap[u.doctor.poliName] || Object.values(poliMap)[0];
          if (targetPoliId) {
            const [newDoc] = await db
              .insert(doctors)
              .values({
                userId: userId as string,
                poliId: targetPoliId,
                specialization: u.doctor.specialization,
                isActive: true,
              })
              .returning();
            if (newDoc) {
              doctorMap[u.email] = newDoc.id;
              console.info(
                `   ✅ Profil Dokter "${u.name}" di "${u.doctor.poliName}" berhasil dibuat.`,
              );
            }
          }
        }
      }
    }

    // ----------------------------------------------------
    // 3. SEED MASTER DATA: PASIEN (12 PASIEN REALISTIS)
    // ----------------------------------------------------
    console.info("\n👨‍👩‍👧 3. Melakukan seeding data Pasien (12 Profil Pasien)...");

    const defaultPatients = [
      {
        fullName: "Bambang Pamungkas",
        dateOfBirth: "1985-03-15",
        gender: "MALE" as const,
        phone: "081298765432",
        nik: "3171011503850001",
        isActive: true,
      },
      {
        fullName: "Dewi Lestari",
        dateOfBirth: "1990-08-12",
        gender: "FEMALE" as const,
        phone: "081311223344",
        nik: "3171025208900002",
        isActive: true,
      },
      {
        fullName: "Ahmad Fauzi",
        dateOfBirth: "1978-06-10",
        gender: "MALE" as const,
        phone: "081288990011",
        nik: "3172031006780003",
        isActive: true,
      },
      {
        fullName: "Rina Marlina",
        dateOfBirth: "1995-09-25",
        gender: "FEMALE" as const,
        phone: "085712345678",
        nik: "3173046509950004",
        isActive: true,
      },
      {
        fullName: "Hendra Wijaya",
        dateOfBirth: "1965-11-20",
        gender: "MALE" as const,
        phone: "081198761234",
        nik: "3174052011650005",
        isActive: true,
      },
      {
        fullName: "Sri Wahyuni",
        dateOfBirth: "1972-04-04",
        gender: "FEMALE" as const,
        phone: "081399887766",
        nik: "3175064404720006",
        isActive: true,
      },
      {
        fullName: "Eko Prasetyo",
        dateOfBirth: "1988-12-12",
        gender: "MALE" as const,
        phone: "081234567891",
        nik: "3201071212880007",
        isActive: true,
      },
      {
        fullName: "Nurul Hidayah",
        dateOfBirth: "1992-01-20",
        gender: "FEMALE" as const,
        phone: "085678901234",
        nik: "3201086001920008",
        isActive: true,
      },
      {
        fullName: "Agus Setiawan",
        dateOfBirth: "1960-07-18",
        gender: "MALE" as const,
        phone: "081801234567",
        nik: "3275091807600009",
        isActive: true,
      },
      {
        fullName: "Maya Kartika",
        dateOfBirth: "2001-05-15",
        gender: "FEMALE" as const,
        phone: "087812349876",
        nik: "3275105505010010",
        isActive: true,
      },
      {
        fullName: "Muhammad Al-Fatih (Anak)",
        dateOfBirth: "2018-06-01",
        gender: "MALE" as const,
        phone: "081299112233",
        nik: "3171010106180011",
        isActive: true,
      },
      {
        fullName: "Clarissa Aurelia (Anak)",
        dateOfBirth: "2020-09-05",
        gender: "FEMALE" as const,
        phone: "081388776655",
        nik: "3171024509200012",
        isActive: true,
      },
    ];

    const patientMap: Record<string, string> = {};

    for (const pat of defaultPatients) {
      const [existing] = await db
        .select()
        .from(patients)
        .where(eq(patients.nik, pat.nik))
        .limit(1);

      if (existing) {
        patientMap[pat.fullName] = existing.id;
      } else {
        const [inserted] = await db.insert(patients).values(pat).returning();
        if (inserted) {
          patientMap[pat.fullName] = inserted.id;
        }
      }
    }
    console.info(`   ✅ Berhasil memuat ${Object.keys(patientMap).length} data Pasien.`);

    // ----------------------------------------------------
    // 4. SEED MASTER DATA: OBAT & STOK (20 OBAT DENGAN VARIASI STOK)
    // ----------------------------------------------------
    console.info("\n💊 4. Melakukan seeding master data Obat (Normal, Low, Kritis)...");

    const defaultMedicines = [
      // 1. Normal Stocks
      {
        name: "Paracetamol 500mg",
        category: "Analgesik & Antipiretik",
        unit: "Tablet",
        minStock: 50,
        currentStock: 500,
        isActive: true,
      },
      {
        name: "Amoxicillin 500mg",
        category: "Antibiotik",
        unit: "Kapsul",
        minStock: 30,
        currentStock: 300,
        isActive: true,
      },
      {
        name: "Cetirizine 10mg",
        category: "Antihistamin",
        unit: "Tablet",
        minStock: 25,
        currentStock: 200,
        isActive: true,
      },
      {
        name: "Antasida Doen",
        category: "Antasida & Antiulkus",
        unit: "Tablet Kunyah",
        minStock: 40,
        currentStock: 400,
        isActive: true,
      },
      {
        name: "Ibuprofen 400mg",
        category: "Anti-inflamasi Non-Steroid (OAINS)",
        unit: "Tablet",
        minStock: 30,
        currentStock: 250,
        isActive: true,
      },
      {
        name: "Vitamin C 500mg",
        category: "Vitamin & Suplemen",
        unit: "Tablet",
        minStock: 50,
        currentStock: 600,
        isActive: true,
      },
      {
        name: "Vitamin B Complex",
        category: "Vitamin & Suplemen",
        unit: "Tablet",
        minStock: 40,
        currentStock: 350,
        isActive: true,
      },
      {
        name: "Metformin 500mg",
        category: "Antidiabetes",
        unit: "Tablet",
        minStock: 30,
        currentStock: 220,
        isActive: true,
      },
      {
        name: "Omeprazole 20mg",
        category: "Antasida & Antiulkus",
        unit: "Kapsul",
        minStock: 30,
        currentStock: 180,
        isActive: true,
      },
      {
        name: "Captopril 25mg",
        category: "Antihipertensi",
        unit: "Tablet",
        minStock: 30,
        currentStock: 200,
        isActive: true,
      },
      {
        name: "Domperidone 10mg",
        category: "Antiemetik",
        unit: "Tablet",
        minStock: 25,
        currentStock: 150,
        isActive: true,
      },
      {
        name: "Ambroxol 30mg",
        category: "Mukolitik & Ekspektoran",
        unit: "Tablet",
        minStock: 30,
        currentStock: 220,
        isActive: true,
      },

      // 2. Low Stocks (Mendekati / Pas di Batas Minimum)
      {
        name: "Asam Mefenamat 500mg",
        category: "Analgesik & Anti-inflamasi",
        unit: "Tablet",
        minStock: 30,
        currentStock: 28,
        isActive: true,
      },
      {
        name: "Cefixime 100mg",
        category: "Antibiotik Sefalosforin",
        unit: "Kapsul",
        minStock: 25,
        currentStock: 20,
        isActive: true,
      },
      {
        name: "Lansoprazole 30mg",
        category: "Antasida & Antiulkus",
        unit: "Kapsul",
        minStock: 25,
        currentStock: 18,
        isActive: true,
      },
      {
        name: "Candesartan 8mg",
        category: "Antihipertensi",
        unit: "Tablet",
        minStock: 20,
        currentStock: 15,
        isActive: true,
      },
      {
        name: "Glimepiride 2mg",
        category: "Antidiabetes",
        unit: "Tablet",
        minStock: 25,
        currentStock: 16,
        isActive: true,
      },

      // 3. Critical Stocks (Hampir Habis / Di Bawah Batas Minimum)
      {
        name: "Amlodipine 5mg",
        category: "Antihipertensi",
        unit: "Tablet",
        minStock: 30,
        currentStock: 6,
        isActive: true,
      },
      {
        name: "Azithromycin 500mg",
        category: "Antibiotik Makrolida",
        unit: "Kaplet",
        minStock: 20,
        currentStock: 4,
        isActive: true,
      },
      {
        name: "Loratadine 10mg",
        category: "Antihistamin",
        unit: "Tablet",
        minStock: 20,
        currentStock: 5,
        isActive: true,
      },
      {
        name: "Salbutamol 2mg",
        category: "Bronkodilator (Asma)",
        unit: "Tablet",
        minStock: 25,
        currentStock: 7,
        isActive: true,
      },
    ];

    const medicineMap: Record<string, string> = {};

    for (const m of defaultMedicines) {
      const [existing] = await db
        .select()
        .from(medicines)
        .where(eq(medicines.name, m.name))
        .limit(1);

      if (existing) {
        medicineMap[m.name] = existing.id;
        // Update stock agar variasi normal/low/kritis selalu konsisten
        await db
          .update(medicines)
          .set({ minStock: m.minStock, currentStock: m.currentStock })
          .where(eq(medicines.id, existing.id));
      } else {
        const [inserted] = await db.insert(medicines).values(m).returning();
        if (inserted) {
          medicineMap[m.name] = inserted.id;
        }
      }
    }
    console.info(`   ✅ Berhasil memuat ${Object.keys(medicineMap).length} data Obat.`);

    // ----------------------------------------------------
    // 5. SEED ANTREAN (QUEUES): 28 ANTREAN
    // Tersebar: Hari Ini, Kemarin, 2 Hari Lalu, 3 Hari Lalu
    // Status: waiting, in_progress, completed, cancelled
    // ----------------------------------------------------
    console.info("\n🎫 5. Melakukan seeding data Antrean (28 Antrean Realistis)...");

    const now = new Date();
    const todayStr = formatDate(now);
    const yesterdayStr = formatDate(new Date(now.getTime() - 86400000));
    const twoDaysAgoStr = formatDate(new Date(now.getTime() - 2 * 86400000));
    const threeDaysAgoStr = formatDate(new Date(now.getTime() - 3 * 86400000));

    const patientNames = Object.keys(patientMap);

    const queueTemplates = [
      // --- HARI INI (TODAY) --- 14 Antrean
      // Poli Umum (Prefix A)
      {
        date: todayStr,
        poli: "Poli Umum",
        docEmail: "dokter@omnimedix.local",
        patientName: patientNames[0]!, // Bambang Pamungkas
        queueNum: "A-001",
        status: "completed" as const,
        bookingCode: "BK-UM01TODAY",
        diagnosis: "Rhinofaringitis Akut (Common Cold) & Demam",
        notes: "Diberikan antipiretik, dekongestan, dan vitamin. Istirahat 3 hari.",
      },
      {
        date: todayStr,
        poli: "Poli Umum",
        docEmail: "dr.farhan@omnimedix.local",
        patientName: patientNames[1]!, // Dewi Lestari
        queueNum: "A-002",
        status: "completed" as const,
        bookingCode: "BK-UM02TODAY",
        diagnosis: "Gastritis Akut / Dispepsia Fungsional",
        notes: "Nyeri epigastrium post makan pedas. Hindari kafein dan asam.",
      },
      {
        date: todayStr,
        poli: "Poli Umum",
        docEmail: "dokter@omnimedix.local",
        patientName: patientNames[2]!, // Ahmad Fauzi
        queueNum: "A-003",
        status: "in_progress" as const,
        bookingCode: "BK-UM03TODAY",
        diagnosis: "Susp. Tension-type Headache",
        notes: "Sedang dilakukan pemeriksaan tanda vital dan anamnesis mendalam.",
      },
      {
        date: todayStr,
        poli: "Poli Umum",
        docEmail: "dr.farhan@omnimedix.local",
        patientName: patientNames[3]!, // Rina Marlina
        queueNum: "A-004",
        status: "waiting" as const,
        bookingCode: "BK-UM04TODAY",
        diagnosis: null,
        notes: "Keluhan batuk berdahak 4 hari.",
      },
      {
        date: todayStr,
        poli: "Poli Umum",
        docEmail: "dokter@omnimedix.local",
        patientName: patientNames[4]!, // Hendra Wijaya
        queueNum: "A-005",
        status: "waiting" as const,
        bookingCode: "BK-UM05TODAY",
        diagnosis: null,
        notes: "Konsultasi kelelahan fisik dan lemas.",
      },
      {
        date: todayStr,
        poli: "Poli Umum",
        docEmail: "dr.farhan@omnimedix.local",
        patientName: patientNames[5]!, // Sri Wahyuni
        queueNum: "A-006",
        status: "cancelled" as const,
        bookingCode: "BK-UM06TODAY",
        diagnosis: null,
        notes: "Pasien membatalkan antrean karena ada keperluan mendesak.",
      },

      // Poli Gigi & Mulut (Prefix B)
      {
        date: todayStr,
        poli: "Poli Gigi & Mulut",
        docEmail: "dr.nadia@omnimedix.local",
        patientName: patientNames[6]!, // Eko Prasetyo
        queueNum: "B-001",
        status: "completed" as const,
        bookingCode: "BK-GG01TODAY",
        diagnosis: "Pulpitis Reversibel Gigi Molar 1 Bawah",
        notes: "Pembersihan kavitas, penambalan sementara, resep analgesik.",
      },
      {
        date: todayStr,
        poli: "Poli Gigi & Mulut",
        docEmail: "drg.rizky@omnimedix.local",
        patientName: patientNames[7]!, // Nurul Hidayah
        queueNum: "B-002",
        status: "in_progress" as const,
        bookingCode: "BK-GG02TODAY",
        diagnosis: "Gingivitis Marginalis & Kalkulus Dentalis",
        notes: "Sedang dilakukan prosedur pembersihan karang gigi (scalling).",
      },
      {
        date: todayStr,
        poli: "Poli Gigi & Mulut",
        docEmail: "dr.nadia@omnimedix.local",
        patientName: patientNames[8]!, // Agus Setiawan
        queueNum: "B-003",
        status: "waiting" as const,
        bookingCode: "BK-GG03TODAY",
        diagnosis: null,
        notes: "Keluhan gusi sering berdarah saat menyikat gigi.",
      },

      // Poli Anak / Pediatri (Prefix C)
      {
        date: todayStr,
        poli: "Poli Anak (Pediatri)",
        docEmail: "dr.anisa@omnimedix.local",
        patientName: patientNames[10]!, // Muhammad Al-Fatih (Anak)
        queueNum: "C-001",
        status: "completed" as const,
        bookingCode: "BK-AN01TODAY",
        diagnosis: "Faringitis Akut & Febris Hari ke-2",
        notes: "Suhu 38.2C, tonsil hiperemis T1-T1. Minum air putih hangat cukup.",
      },
      {
        date: todayStr,
        poli: "Poli Anak (Pediatri)",
        docEmail: "dr.anisa@omnimedix.local",
        patientName: patientNames[11]!, // Clarissa Aurelia (Anak)
        queueNum: "C-002",
        status: "waiting" as const,
        bookingCode: "BK-AN02TODAY",
        diagnosis: null,
        notes: "Jadwal imunisasi ulangan & kontrol berat badan.",
      },

      // Poli Penyakit Dalam (Prefix D)
      {
        date: todayStr,
        poli: "Poli Penyakit Dalam",
        docEmail: "dr.hendra@omnimedix.local",
        patientName: patientNames[4]!, // Hendra Wijaya
        queueNum: "D-001",
        status: "completed" as const,
        bookingCode: "BK-PD01TODAY",
        diagnosis: "Hipertensi Primer Stadium 2 & Diabetes Mellitus Tipe 2 Terkontrol",
        notes: "TD 155/95 mmHg, GDS 145 mg/dL. Lanjutkan terapi rutin antihipertensi.",
      },
      {
        date: todayStr,
        poli: "Poli Penyakit Dalam",
        docEmail: "dr.hendra@omnimedix.local",
        patientName: patientNames[8]!, // Agus Setiawan
        queueNum: "D-002",
        status: "in_progress" as const,
        bookingCode: "BK-PD02TODAY",
        diagnosis: "Sindrom Dispepsia & Fatty Liver Grade 1",
        notes: "Konsultasi hasil lab profil lipid dan USG abdomen.",
      },
      {
        date: todayStr,
        poli: "Poli Penyakit Dalam",
        docEmail: "dr.hendra@omnimedix.local",
        patientName: patientNames[9]!, // Maya Kartika
        queueNum: "D-003",
        status: "waiting" as const,
        bookingCode: "BK-PD03TODAY",
        diagnosis: null,
        notes: "Keluhan sering pusing berkunang-kunang dan mudah lelah.",
      },

      // --- KEMARIN (YESTERDAY) --- 6 Antrean
      {
        date: yesterdayStr,
        poli: "Poli Umum",
        docEmail: "dokter@omnimedix.local",
        patientName: patientNames[2]!, // Ahmad Fauzi
        queueNum: "A-001",
        status: "completed" as const,
        bookingCode: "BK-UM01YEST",
        diagnosis: "Mialgia Akut regio Lumbal",
        notes: "Nyeri pinggang akibat salah posisi angkat beban berat.",
      },
      {
        date: yesterdayStr,
        poli: "Poli Umum",
        docEmail: "dr.farhan@omnimedix.local",
        patientName: patientNames[3]!, // Rina Marlina
        queueNum: "A-002",
        status: "completed" as const,
        bookingCode: "BK-UM02YEST",
        diagnosis: "Alergi Rhinitis Seasonal",
        notes: "Bersin-bersin di pagi hari dan hidung gatal berair.",
      },
      {
        date: yesterdayStr,
        poli: "Poli Gigi & Mulut",
        docEmail: "dr.nadia@omnimedix.local",
        patientName: patientNames[9]!, // Maya Kartika
        queueNum: "B-001",
        status: "completed" as const,
        bookingCode: "BK-GG01YEST",
        diagnosis: "Impaksi Gigi Bungsu M3 Bawah Kanan",
        notes: "Direncanakan odontektomi minggu depan, saat ini premedikasi.",
      },
      {
        date: yesterdayStr,
        poli: "Poli Anak (Pediatri)",
        docEmail: "dr.anisa@omnimedix.local",
        patientName: patientNames[11]!, // Clarissa Aurelia
        queueNum: "C-001",
        status: "completed" as const,
        bookingCode: "BK-AN01YEST",
        diagnosis: "Diare Akut Dehidrasi Ringan",
        notes: "BAB cair 4x, nafsu makan menurun. Edukasi oralit dan zinc.",
      },
      {
        date: yesterdayStr,
        poli: "Poli Penyakit Dalam",
        docEmail: "dr.hendra@omnimedix.local",
        patientName: patientNames[0]!, // Bambang Pamungkas
        queueNum: "D-001",
        status: "completed" as const,
        bookingCode: "BK-PD01YEST",
        diagnosis: "Hiperurisemia Asimtomatik (Asam Urat Tinggi)",
        notes: "Kadar asam urat darah 8.9 mg/dL. Edukasi diet rendah purin.",
      },
      {
        date: yesterdayStr,
        poli: "Poli Umum",
        docEmail: "dr.farhan@omnimedix.local",
        patientName: patientNames[7]!, // Nurul Hidayah
        queueNum: "A-003",
        status: "cancelled" as const,
        bookingCode: "BK-UM03YEST",
        diagnosis: null,
        notes: "Pasien tidak hadir saat panggilan ke-3 (No Show).",
      },

      // --- 2 HARI LALU (H-2) --- 4 Antrean
      {
        date: twoDaysAgoStr,
        poli: "Poli Umum",
        docEmail: "dokter@omnimedix.local",
        patientName: patientNames[5]!, // Sri Wahyuni
        queueNum: "A-001",
        status: "completed" as const,
        bookingCode: "BK-UM01H2",
        diagnosis: "Migrain Tanpa Aura",
        notes: "Nyeri kepala berdenyut unilateral kiri disertai fotofobia.",
      },
      {
        date: twoDaysAgoStr,
        poli: "Poli Gigi & Mulut",
        docEmail: "drg.rizky@omnimedix.local",
        patientName: patientNames[0]!, // Bambang Pamungkas
        queueNum: "B-001",
        status: "completed" as const,
        bookingCode: "BK-GG01H2",
        diagnosis: "Karies Gigi Superfisialis",
        notes: "Penambalan komposit gigi premolar atas.",
      },
      {
        date: twoDaysAgoStr,
        poli: "Poli Anak (Pediatri)",
        docEmail: "dr.anisa@omnimedix.local",
        patientName: patientNames[10]!, // Muhammad Al-Fatih
        queueNum: "C-001",
        status: "completed" as const,
        bookingCode: "BK-AN01H2",
        diagnosis: "Dermatitis Atopik",
        notes: "Gatal kemerahan di lipatan siku. Diberikan emolien & antihistamin.",
      },
      {
        date: twoDaysAgoStr,
        poli: "Poli Penyakit Dalam",
        docEmail: "dr.hendra@omnimedix.local",
        patientName: patientNames[6]!, // Eko Prasetyo
        queueNum: "D-001",
        status: "completed" as const,
        bookingCode: "BK-PD01H2",
        diagnosis: "Gastroesophageal Reflux Disease (GERD)",
        notes: "Sensasi terbakar di dada (heartburn) dan regurgitasi asam.",
      },

      // --- 3 HARI LALU (H-3) --- 4 Antrean
      {
        date: threeDaysAgoStr,
        poli: "Poli Umum",
        docEmail: "dr.farhan@omnimedix.local",
        patientName: patientNames[1]!, // Dewi Lestari
        queueNum: "A-001",
        status: "completed" as const,
        bookingCode: "BK-UM01H3",
        diagnosis: "Insomnia Sekunder & Stres Kerja",
        notes: "Edukasi sleep hygiene dan relaksasi.",
      },
      {
        date: threeDaysAgoStr,
        poli: "Poli Penyakit Dalam",
        docEmail: "dr.hendra@omnimedix.local",
        patientName: patientNames[4]!, // Hendra Wijaya
        queueNum: "D-001",
        status: "completed" as const,
        bookingCode: "BK-PD01H3",
        diagnosis: "Dislipidemia Campuran",
        notes: "Kolesterol total 240 mg/dL, Trigliserida 210 mg/dL. Edukasi olahraga.",
      },
      {
        date: threeDaysAgoStr,
        poli: "Poli Gigi & Mulut",
        docEmail: "dr.nadia@omnimedix.local",
        patientName: patientNames[2]!, // Ahmad Fauzi
        queueNum: "B-001",
        status: "completed" as const,
        bookingCode: "BK-GG01H3",
        diagnosis: "Gingivitis Akut",
        notes: "Diberikan antiseptik kumur dan antibiotik oral.",
      },
      {
        date: threeDaysAgoStr,
        poli: "Poli Anak (Pediatri)",
        docEmail: "dr.anisa@omnimedix.local",
        patientName: patientNames[11]!, // Clarissa Aurelia
        queueNum: "C-001",
        status: "completed" as const,
        bookingCode: "BK-AN01H3",
        diagnosis: "Batuk Alergi Anak",
        notes: "Diberikan sirup mukolitik & antialergi.",
      },
    ];

    const insertedQueues: Record<string, string> = {}; // key: bookingCode -> queueId

    for (const q of queueTemplates) {
      const targetPatientId = patientMap[q.patientName];
      const targetDoctorId = doctorMap[q.docEmail];
      const targetPoliId = poliMap[q.poli];

      if (!targetPatientId || !targetDoctorId || !targetPoliId) {
        continue;
      }

      const [existing] = await db
        .select()
        .from(queues)
        .where(eq(queues.bookingCode, q.bookingCode))
        .limit(1);

      if (existing) {
        insertedQueues[q.bookingCode] = existing.id;
        // Update status & diagnosis jika perlu
        await db
          .update(queues)
          .set({
            status: q.status,
            diagnosis: q.diagnosis,
            notes: q.notes,
            queueDate: q.date,
          })
          .where(eq(queues.id, existing.id));
      } else {
        const [newQueue] = await db
          .insert(queues)
          .values({
            queueNumber: q.queueNum,
            patientId: targetPatientId,
            doctorId: targetDoctorId,
            poliId: targetPoliId,
            status: q.status,
            bookingCode: q.bookingCode,
            queueDate: q.date,
            diagnosis: q.diagnosis,
            notes: q.notes,
          })
          .returning();
        if (newQueue) {
          insertedQueues[q.bookingCode] = newQueue.id;
        }
      }
    }
    console.info(
      `   ✅ Berhasil memuat ${Object.keys(insertedQueues).length} data Antrean pasien.`,
    );

    // ----------------------------------------------------
    // 6. SEED RESEP (PRESCRIPTIONS) & ITEMS
    // Status: pending, preparing, ready, taken
    // ----------------------------------------------------
    console.info("\n📋 6. Melakukan seeding Resep Obat & Prescription Items...");

    const prescriptionTemplates = [
      // 1. Status PENDING (Dokter baru selesai meresepkan, apoteker belum mulai)
      {
        bookingCode: "BK-UM01TODAY",
        status: "pending" as const,
        notes: "Resep rawat jalan infeksi saluran pernapasan atas. Pastikan antibiotik dihabiskan.",
        items: [
          {
            medName: "Paracetamol 500mg",
            dosage: "500 mg",
            quantity: 10,
            instructions: "3 x 1 tablet sehari sesudah makan bila demam/nyeri",
          },
          {
            medName: "Amoxicillin 500mg",
            dosage: "500 mg",
            quantity: 15,
            instructions: "3 x 1 kapsul sehari tiap 8 jam (Wajib dihabiskan)",
          },
          {
            medName: "Vitamin C 500mg",
            dosage: "500 mg",
            quantity: 10,
            instructions: "1 x 1 tablet sehari pagi hari sesudah makan",
          },
        ],
      },

      // 2. Status PREPARING (Apoteker sedang meracik / menyiapkan etiket obat)
      {
        bookingCode: "BK-UM02TODAY",
        status: "preparing" as const,
        notes: "Resep dispepsia akut. Pasien alergi terhadap obat golongan sulfa.",
        items: [
          {
            medName: "Antasida Doen",
            dosage: "1 tablet",
            quantity: 12,
            instructions: "3 x 1 tablet kunyah sehari 1 jam sebelum makan",
          },
          {
            medName: "Omeprazole 20mg",
            dosage: "20 mg",
            quantity: 14,
            instructions: "2 x 1 kapsul sehari 30 menit sebelum makan pagi & malam",
          },
          {
            medName: "Domperidone 10mg",
            dosage: "10 mg",
            quantity: 10,
            instructions: "3 x 1 tablet sehari 15 menit sebelum makan",
          },
        ],
      },

      // 3. Status READY (Obat sudah disiapkan dalam kemasan rapi, siap dipanggil di loket)
      {
        bookingCode: "BK-GG01TODAY",
        status: "ready" as const,
        notes: "Resep pasca penanganan kavitas gigi molar. Minum analgesik jika berdenyut.",
        items: [
          {
            medName: "Asam Mefenamat 500mg",
            dosage: "500 mg",
            quantity: 10,
            instructions: "3 x 1 tablet sehari sesudah makan jika timbul nyeri gigi",
          },
          {
            medName: "Amoxicillin 500mg",
            dosage: "500 mg",
            quantity: 15,
            instructions: "3 x 1 kapsul sehari tiap 8 jam teratur sampai habis",
          },
        ],
      },

      // 4. Status READY (Obat anak siap diambil)
      {
        bookingCode: "BK-AN01TODAY",
        status: "ready" as const,
        notes: "Resep pediatri febris faringitis. Perhatikan takaran sendok obat anak.",
        items: [
          {
            medName: "Paracetamol 500mg",
            dosage: "250 mg (1/2 tab)",
            quantity: 8,
            instructions: "3 x 1/2 tablet digerus sesudah makan jika demam > 38C",
          },
          {
            medName: "Cetirizine 10mg",
            dosage: "5 mg (1/2 tab)",
            quantity: 6,
            instructions: "1 x 1/2 tablet sehari sebelum tidur malam",
          },
        ],
      },

      // 5. Status TAKEN (Obat sudah diambil oleh pasien hari ini)
      {
        bookingCode: "BK-PD01TODAY",
        status: "taken" as const,
        notes: "Obat rutin 30 hari pasien hipertensi kronis & diabetes mellitus.",
        items: [
          {
            medName: "Amlodipine 5mg",
            dosage: "5 mg",
            quantity: 30,
            instructions: "1 x 1 tablet sehari pada pagi hari sesudah sarapan",
          },
          {
            medName: "Metformin 500mg",
            dosage: "500 mg",
            quantity: 60,
            instructions: "2 x 1 tablet sehari bersamaan saat makan pagi & malam",
          },
          {
            medName: "Vitamin B Complex",
            dosage: "1 tablet",
            quantity: 30,
            instructions: "1 x 1 tablet sehari pada siang hari",
          },
        ],
      },

      // 6. Status TAKEN (Kemarin - Hipertensi & Mialgia)
      {
        bookingCode: "BK-UM01YEST",
        status: "taken" as const,
        notes: "Terapi mialgia & relaksan otot pasca cidera angkat beban.",
        items: [
          {
            medName: "Ibuprofen 400mg",
            dosage: "400 mg",
            quantity: 10,
            instructions: "3 x 1 tablet sehari sesudah makan kenyang",
          },
          {
            medName: "Vitamin B Complex",
            dosage: "1 tablet",
            quantity: 10,
            instructions: "1 x 1 tablet sehari untuk neurotropik otot",
          },
        ],
      },

      // 7. Status TAKEN (Kemarin - Alergi Rhinitis)
      {
        bookingCode: "BK-UM02YEST",
        status: "taken" as const,
        notes: "Terapi rhinitis alergi musiman.",
        items: [
          {
            medName: "Cetirizine 10mg",
            dosage: "10 mg",
            quantity: 10,
            instructions: "1 x 1 tablet sehari malam hari sebelum tidur",
          },
          {
            medName: "Vitamin C 500mg",
            dosage: "500 mg",
            quantity: 10,
            instructions: "1 x 1 tablet sehari pagi hari",
          },
        ],
      },

      // 8. Status TAKEN (H-2 - GERD)
      {
        bookingCode: "BK-PD01H2",
        status: "taken" as const,
        notes: "Terapi supresi asam lambung & prokinetik GERD 14 hari.",
        items: [
          {
            medName: "Lansoprazole 30mg",
            dosage: "30 mg",
            quantity: 14,
            instructions: "1 x 1 kapsul sehari pagi hari 30 menit sebelum makan",
          },
          {
            medName: "Antasida Doen",
            dosage: "1 tablet",
            quantity: 15,
            instructions: "3 x 1 tablet kunyah bila timbul sensasi perih terbakar",
          },
        ],
      },
    ];

    let totalPrescriptions = 0;
    let totalItems = 0;

    for (const p of prescriptionTemplates) {
      const queueId = insertedQueues[p.bookingCode];
      if (!queueId) continue;

      // Ambil dokterId dan patientId dari record queue
      const [queueRecord] = await db
        .select()
        .from(queues)
        .where(eq(queues.id, queueId))
        .limit(1);

      if (!queueRecord || !queueRecord.doctorId) continue;

      const [existingPrescription] = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.queueId, queueId))
        .limit(1);

      let presId = existingPrescription?.id;

      if (existingPrescription) {
        await db
          .update(prescriptions)
          .set({ status: p.status, notes: p.notes })
          .where(eq(prescriptions.id, existingPrescription.id));
      } else {
        const [newPres] = await db
          .insert(prescriptions)
          .values({
            queueId,
            doctorId: queueRecord.doctorId,
            patientId: queueRecord.patientId,
            status: p.status,
            notes: p.notes,
          })
          .returning();
        if (newPres) {
          presId = newPres.id;
          totalPrescriptions++;
        }
      }

      // Masukkan item resep
      if (presId) {
        for (const it of p.items) {
          const medId = medicineMap[it.medName];
          if (!medId) continue;

          const [existingItem] = await db
            .select()
            .from(prescriptionItems)
            .where(
              and(
                eq(prescriptionItems.prescriptionId, presId),
                eq(prescriptionItems.medicineId, medId),
              ),
            )
            .limit(1);

          if (!existingItem) {
            await db.insert(prescriptionItems).values({
              prescriptionId: presId,
              medicineId: medId,
              dosage: it.dosage,
              quantity: it.quantity,
              instructions: it.instructions,
            });
            totalItems++;
          }
        }
      }
    }
    console.info(
      `   ✅ Berhasil memuat ${prescriptionTemplates.length} Resep beserta ${totalItems} detail Item Obat.`,
    );

    // ----------------------------------------------------
    // 7. SEED MUTASI STOK OBAT (STOCK MOVEMENTS)
    // ----------------------------------------------------
    console.info("\n📦 7. Melakukan seeding data Riwayat Mutasi Stok (Stock Movements)...");

    const stockMovementTemplates = [
      {
        medName: "Paracetamol 500mg",
        type: "in" as const,
        quantity: 200,
        reason: "Penerimaan Faktur PBF Kimia Farma No. KF/2026/089",
      },
      {
        medName: "Amoxicillin 500mg",
        type: "in" as const,
        quantity: 150,
        reason: "Penerimaan Faktur PBF Enseval No. ENS/IX/442",
      },
      {
        medName: "Vitamin C 500mg",
        type: "in" as const,
        quantity: 300,
        reason: "Pengadaan Suplemen Kesehatan Rutin Triwulan",
      },
      {
        medName: "Antasida Doen",
        type: "in" as const,
        quantity: 150,
        reason: "Penerimaan Faktur PBF Anugerah Pharmindo",
      },
      {
        medName: "Amlodipine 5mg",
        type: "out" as const,
        quantity: 30,
        reason: "Penyerahan Resep Hipertensi Pasien Rawat Jalan",
      },
      {
        medName: "Metformin 500mg",
        type: "out" as const,
        quantity: 60,
        reason: "Penyerahan Resep DM Kronis Pasien Rawat Jalan",
      },
      {
        medName: "Omeprazole 20mg",
        type: "out" as const,
        quantity: 28,
        reason: "Dispensing Resep Poli Penyakit Dalam",
      },
      {
        medName: "Lansoprazole 30mg",
        type: "out" as const,
        quantity: 14,
        reason: "Dispensing Resep Poli Umum Pasien GERD",
      },
    ];

    let totalMovements = 0;
    for (const sm of stockMovementTemplates) {
      const medId = medicineMap[sm.medName];
      if (!medId) continue;

      const [existing] = await db
        .select()
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.medicineId, medId),
            eq(stockMovements.reason, sm.reason),
          ),
        )
        .limit(1);

      if (!existing) {
        await db.insert(stockMovements).values({
          medicineId: medId,
          type: sm.type,
          quantity: sm.quantity,
          reason: sm.reason,
        });
        totalMovements++;
      }
    }
    console.info(`   ✅ Berhasil memuat ${totalMovements} riwayat Mutasi Stok Obat.`);

    // ----------------------------------------------------
    // 8. RINGKASAN DATA SEED & KREDENSIAL
    // ----------------------------------------------------
    console.info("\n🎉 [Omnimedix DB Seed] Proses seeding selesai dengan sukses!");
    console.info("===========================================================");
    console.info("📊 RINGKASAN DATA SEED OMNIMEDIX:");
    console.info(`  - Poliklinik     : ${Object.keys(poliMap).length} poli aktif`);
    console.info(`  - Akun Pengguna  : ${defaultUsers.length} akun (2 Admin, 6 Dokter, 4 Apoteker)`);
    console.info(`  - Data Pasien    : ${Object.keys(patientMap).length} profil pasien`);
    console.info(`  - Katalog Obat   : ${Object.keys(medicineMap).length} jenis (Normal, Low, Kritis)`);
    console.info(`  - Antrean Pasien : ${Object.keys(insertedQueues).length} antrean (Waiting, In Progress, Completed, Cancelled)`);
    console.info(`  - Resep Obat     : ${prescriptionTemplates.length} resep (Pending, Preparing, Ready, Taken)`);
    console.info(`  - Mutasi Stok    : ${stockMovementTemplates.length} riwayat mutasi obat masuk & keluar`);
    console.info("===========================================================");
    console.info("🔑 KREDENSIAL LOGIN TESTING UTAMA:");
    console.info("  1. Administrator :");
    console.info("     Email    : admin@omnimedix.local");
    console.info("     Password : Admin123!");
    console.info("  2. Dokter Poliklinik :");
    console.info("     Email    : dokter@omnimedix.local (Poli Umum / Penyakit Dalam)");
    console.info("     Email    : dr.nadia@omnimedix.local (Poli Gigi & Mulut)");
    console.info("     Email    : dr.anisa@omnimedix.local (Poli Anak)");
    console.info("     Email    : dr.hendra@omnimedix.local (Poli Penyakit Dalam)");
    console.info("     Password : Dokter123!");
    console.info("  3. Staf Apoteker / Farmasi :");
    console.info("     Email    : apoteker@omnimedix.local (Kepala Farmasi)");
    console.info("     Email    : apoteker.rahmat@omnimedix.local");
    console.info("     Password : Apoteker123!");
    console.info("===========================================================");
    console.info("💡 TIPS: Jalankan 'pnpm db:seed --fresh' untuk reset dan seed ulang.");
    console.info("===========================================================");
  } catch (error) {
    console.error("❌ [Omnimedix DB Seed Error] Gagal menjalankan seeding:", error);
    process.exit(1);
  }
}

// Eksekusi otomatis jika dipanggil langsung
seed().then(() => {
  process.exit(0);
});
