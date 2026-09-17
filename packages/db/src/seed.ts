import { db } from "./client";
import { users, polis, doctors, medicines } from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const BCRYPT_SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function seed() {
  console.info("🌱 [Omnimedix DB Seed] Memulai proses seeding data awal...");

  try {
    // ----------------------------------------------------
    // 1. Seed Master Data: POLIKLINIK
    // ----------------------------------------------------
    console.info("\n🏥 1. Melakukan seeding master data Poliklinik...");

    const defaultPolis = [
      {
        name: "Poli Umum",
        description:
          "Pelayanan kesehatan primer dan pemeriksaan umum untuk seluruh kelompok usia.",
        isActive: true,
      },
      {
        name: "Poli Gigi & Mulut",
        description:
          "Pelayanan kesehatan gigi, penambalan, pencabutan, dan pembersihan karang gigi.",
        isActive: true,
      },
      {
        name: "Poli Anak (Pediatri)",
        description:
          "Pemeriksaan kesehatan bayi dan anak, pemantauan tumbuh kembang, serta imunisasi.",
        isActive: true,
      },
      {
        name: "Poli Penyakit Dalam",
        description:
          "Pelayanan subspesialistik diagnosis dan penanganan penyakit organ dalam non-bedah.",
        isActive: true,
      },
    ];

    const insertedPolis: Record<string, string> = {};

    for (const p of defaultPolis) {
      const [existingPoli] = await db
        .select()
        .from(polis)
        .where(eq(polis.name, p.name))
        .limit(1);

      if (existingPoli) {
        console.info(
          `   ℹ️ Poli "${p.name}" sudah ada (ID: ${existingPoli.id}).`,
        );
        insertedPolis[p.name] = existingPoli.id;
      } else {
        const [newPoli] = await db.insert(polis).values(p).returning();
        if (newPoli) {
          console.info(
            `   ✅ Berhasil membuat Poli "${newPoli.name}" (ID: ${newPoli.id}).`,
          );
          insertedPolis[p.name] = newPoli.id;
        }
      }
    }

    // ----------------------------------------------------
    // 2. Seed Master Data: PENGGUNA (USERS & DOCTORS)
    // ----------------------------------------------------
    console.info(
      "\n👥 2. Melakukan seeding data Pengguna (Admin, Dokter, Apoteker)...",
    );

    const defaultUsers = [
      {
        email: "admin@omnimedix.local",
        passwordRaw: "Admin123!",
        name: "Administrator Omnimedix",
        role: "ADMIN" as const,
      },
      {
        email: "dokter@omnimedix.local",
        passwordRaw: "Dokter123!",
        name: "dr. Budi Santoso, Sp.PD",
        role: "DOCTOR" as const,
        doctorInfo: {
          poliName: "Poli Umum",
          specialization: "Dokter Umum / Spesialis Penyakit Dalam",
        },
      },
      {
        email: "apoteker@omnimedix.local",
        passwordRaw: "Apoteker123!",
        name: "Siti Aminah, S.Farm., Apt.",
        role: "PHARMACIST" as const,
      },
    ];

    for (const u of defaultUsers) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, u.email))
        .limit(1);

      let userId = existingUser?.id;

      if (existingUser) {
        console.info(
          `   ℹ️ User "${u.email}" (${u.role}) sudah terdaftar (ID: ${existingUser.id}).`,
        );
      } else {
        const passwordHash = await hashPassword(u.passwordRaw);
        const [newUser] = await db
          .insert(users)
          .values({
            email: u.email,
            passwordHash,
            name: u.name,
            role: u.role,
            isActive: true,
          })
          .returning();

        if (newUser) {
          userId = newUser.id;
          console.info(
            `   ✅ Berhasil membuat User "${newUser.email}" - Role: ${newUser.role} (ID: ${newUser.id}).`,
          );
        }
      }

      // Jika role adalah DOCTOR, buat / periksa entri profil di tabel doctors
      if (u.role === "DOCTOR" && u.doctorInfo && userId) {
        const [existingDoctor] = await db
          .select()
          .from(doctors)
          .where(eq(doctors.userId, userId))
          .limit(1);

        if (existingDoctor) {
          console.info(
            `   ℹ️ Profil Dokter untuk user "${u.email}" sudah ada (Doctor ID: ${existingDoctor.id}).`,
          );
        } else {
          const targetPoliId =
            insertedPolis[u.doctorInfo.poliName] ||
            Object.values(insertedPolis)[0];
          if (targetPoliId) {
            const [newDoctor] = await db
              .insert(doctors)
              .values({
                userId,
                poliId: targetPoliId,
                specialization: u.doctorInfo.specialization,
                isActive: true,
              })
              .returning();

            if (newDoctor) {
              console.info(
                `   ✅ Profil Dokter berhasil dihubungkan ke "${u.doctorInfo.poliName}" (Doctor ID: ${newDoctor.id}).`,
              );
            }
          }
        }
      }
    }

    // ----------------------------------------------------
    // 3. Seed Master Data: OBAT-OBATAN (MEDICINES)
    // ----------------------------------------------------
    console.info(
      "\n💊 3. Melakukan seeding master data Obat & Stok Farmasi...",
    );

    const defaultMedicines = [
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
        minStock: 20,
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
        name: "Metformin 500mg",
        category: "Antidiabetes",
        unit: "Tablet",
        minStock: 30,
        currentStock: 180,
        isActive: true,
      },
      {
        name: "Amlodipine 5mg",
        category: "Antihipertensi",
        unit: "Tablet",
        minStock: 30,
        currentStock: 220,
        isActive: true,
      },
    ];

    for (const m of defaultMedicines) {
      const [existingMed] = await db
        .select()
        .from(medicines)
        .where(eq(medicines.name, m.name))
        .limit(1);

      if (existingMed) {
        console.info(
          `   ℹ️ Obat "${m.name}" sudah ada (Stok: ${existingMed.currentStock} ${existingMed.unit}).`,
        );
      } else {
        const [newMed] = await db.insert(medicines).values(m).returning();

        if (newMed) {
          console.info(
            `   ✅ Berhasil membuat Obat "${newMed.name}" (Stok: ${newMed.currentStock} ${newMed.unit}).`,
          );
        }
      }
    }

    console.info(
      "\n🎉 [Omnimedix DB Seed] Proses seeding selesai dengan sukses!",
    );
    console.info("===========================================================");
    console.info("Kredensial Akun Default:");
    console.info("  - Admin    : admin@omnimedix.local    / Admin123!");
    console.info("  - Dokter   : dokter@omnimedix.local   / Dokter123!");
    console.info("  - Apoteker : apoteker@omnimedix.local / Apoteker123!");
    console.info("===========================================================");
  } catch (error) {
    console.error(
      "❌ [Omnimedix DB Seed Error] Terjadi kesalahan saat seeding:",
      error,
    );
    process.exit(1);
  }
}

// Automatically execute when run as script
seed().then(() => {
  process.exit(0);
});
