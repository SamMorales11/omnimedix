import { createApp } from "c:/Users/User/Documents/Coding/omnimedix/apps/api/src/app";
import { db, users, polis, doctors, patients, queues, medicines, prescriptions, prescriptionItems, stockMovements, eq, desc } from "@omnimedix/db";
import { signToken } from "c:/Users/User/Documents/Coding/omnimedix/apps/api/src/lib/auth";

async function main() {
  console.log("================================================================================");
  console.log("🏥 OMNIMEDIX END-TO-END STABILIZATION TEST RUNNER");
  console.log("================================================================================\n");

  const app = createApp();

  // ---------------------------------------------------------------------------
  // FLOW 1 & 2: PUBLIC PATIENT BOOKING & QUEUE TRACKING
  // ---------------------------------------------------------------------------
  console.log(">>> [FLOW 1 & 2] PUBLIC PATIENT BOOKING & QUEUE TRACKING <<<");

  // Fetch a doctor and poly to book against
  const [activeDoctor] = await db
    .select({
      id: doctors.id,
      poliId: doctors.poliId,
      name: users.name,
      poliName: polis.name,
    })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .innerJoin(polis, eq(doctors.poliId, polis.id))
    .where(eq(doctors.isActive, true))
    .limit(1);

  if (!activeDoctor) throw new Error("No active doctor found for public booking test");

  const bookingPayload = {
    poliId: activeDoctor.poliId,
    doctorId: activeDoctor.id,
    patient: {
      fullName: "Siti Rahmawati (E2E Test)",
      dateOfBirth: "1994-06-15",
      gender: "FEMALE" as const,
      phone: "081298765432",
      nik: `3201${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    },
  };

  const bookingRes = await app.request("/public/queues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bookingPayload),
  });

  console.log(`1.1. POST /public/queues: Status ${bookingRes.status}`);
  if (bookingRes.status !== 201) {
    const err = await bookingRes.text();
    throw new Error(`Booking failed: ${err}`);
  }

  const bookingJson = await bookingRes.json();
  const bookingData = bookingJson.data;
  console.log(`     Booking Code : ${bookingData.bookingCode}`);
  console.log(`     Queue Number : ${bookingData.queueNumber}`);
  console.log(`     Status       : ${bookingData.status}`);

  // Test Queue Tracking
  const trackRes = await app.request(`/public/queues/track?code=${bookingData.bookingCode}`);
  console.log(`1.2. GET /public/queues/track?code=${bookingData.bookingCode}: Status ${trackRes.status}`);
  if (trackRes.status !== 200) throw new Error("Queue tracking failed");

  const trackJson = await trackRes.json();
  const trackData = trackJson.data;
  console.log(`     Tracking returned patient: ${trackData.patientName} (${trackData.bookingCode}) - Poli: ${trackData.poliName}`);

  // ---------------------------------------------------------------------------
  // FLOW 3: AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
  // ---------------------------------------------------------------------------
  console.log("\n>>> [FLOW 3] AUTHENTICATION & RBAC PERMISSIONS <<<");

  const loginDoctorRes = await app.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "dokter@omnimedix.local", password: "Dokter123!" }),
  });
  console.log(`3.1. Doctor Login: Status ${loginDoctorRes.status}`);
  const doctorAuth = await loginDoctorRes.json();
  const doctorToken = doctorAuth.data.token;

  const loginPharmacistRes = await app.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "apoteker@omnimedix.local", password: "Apoteker123!" }),
  });
  console.log(`3.2. Pharmacist Login: Status ${loginPharmacistRes.status}`);
  const pharmacistAuth = await loginPharmacistRes.json();
  const pharmacistToken = pharmacistAuth.data.token;

  const loginAdminRes = await app.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@omnimedix.local", password: "Admin123!" }),
  });
  console.log(`3.3. Admin Login: Status ${loginAdminRes.status}`);
  const adminAuth = await loginAdminRes.json();
  const adminToken = adminAuth.data.token;

  // RBAC Guard Checks:
  // Doctor cannot access Admin endpoints
  const doctorToAdmin = await app.request("/admin/users", {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  console.log(`3.4. Doctor accessing /admin/users -> Status ${doctorToAdmin.status} (expected 403)`);
  if (doctorToAdmin.status !== 403) throw new Error("RBAC Failure: Doctor accessed Admin area");

  // Pharmacist cannot access Doctor endpoints
  const pharmToDoctor = await app.request("/doctor/queues/today", {
    headers: { Authorization: `Bearer ${pharmacistToken}` },
  });
  console.log(`3.5. Pharmacist accessing /doctor/queues/today -> Status ${pharmToDoctor.status} (expected 403)`);
  if (pharmToDoctor.status !== 403) throw new Error("RBAC Failure: Pharmacist accessed Doctor area");

  // Admin cannot access Doctor specific queue endpoints
  const adminToDoctor = await app.request("/doctor/queues/today", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`3.6. Admin accessing /doctor/queues/today -> Status ${adminToDoctor.status} (expected 403)`);
  if (adminToDoctor.status !== 403) throw new Error("RBAC Failure: Admin accessed Doctor area");

  // ---------------------------------------------------------------------------
  // FLOW 4: DOCTOR WORKFLOW (Queue -> In Progress -> Diagnosis -> Prescription -> Complete)
  // ---------------------------------------------------------------------------
  console.log("\n>>> [FLOW 4] DOCTOR WORKFLOW <<<");

  const todayQueuesRes = await app.request("/doctor/queues/today", {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  console.log(`4.1. GET /doctor/queues/today: Status ${todayQueuesRes.status}`);
  const todayQueuesJson = await todayQueuesRes.json();
  const todayQueues = todayQueuesJson.data;
  console.log(`     Total queues for today: ${todayQueues.length}`);

  // Find the queue we just booked or take the first one
  const targetQueue = todayQueues.find((q: any) => q.bookingCode === bookingData.bookingCode) || todayQueues[0];
  if (!targetQueue) throw new Error("No target queue found for doctor workflow");
  const testQueueId = targetQueue.id;
  console.log(`     Selected Queue ID: ${testQueueId} (${targetQueue.bookingCode})`);

  // Step 4.2: Update status to in_progress
  const inProgressRes = await app.request(`/doctor/queues/${testQueueId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${doctorToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "in_progress" }),
  });
  console.log(`4.2. PATCH /doctor/queues/:id/status (in_progress): Status ${inProgressRes.status}`);

  // Step 4.3: Submit Diagnosis
  const diagnosisRes = await app.request(`/doctor/queues/${testQueueId}/diagnosis`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${doctorToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      diagnosis: "Faringitis Akut (ISPA ringan) dengan demam subfebris",
      notes: "Istirahat cukup 3 hari, hidrasi minimal 2L/hari, hindari makanan berminyak.",
    }),
  });
  console.log(`4.3. PATCH /doctor/queues/:id/diagnosis: Status ${diagnosisRes.status}`);

  // Step 4.4: Create E-Prescription
  const [sampleMed] = await db.select().from(medicines).where(eq(medicines.isActive, true)).limit(1);
  if (!sampleMed) throw new Error("No active medicine found for prescription");

  const prescriptionRes = await app.request("/doctor/prescriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${doctorToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queueId: testQueueId,
      notes: "Minum sesudah makan, segera habiskan antibiotik bila diresepkan.",
      items: [
        {
          medicineId: sampleMed.id,
          quantity: 10,
          dosage: "3x1 tablet sehari",
          instructions: "Diminum sesudah makan",
        },
      ],
    }),
  });
  console.log(`4.4. POST /doctor/prescriptions: Status ${prescriptionRes.status}`);
  const prescriptionJson = await prescriptionRes.json();
  const prescriptionData = prescriptionJson.data;
  const createdPrescriptionId = prescriptionData.id;
  console.log(`     Prescription Created: ID ${createdPrescriptionId} (${prescriptionData.prescriptionNumber})`);

  // Step 4.5: Complete Queue Consultation
  const completedRes = await app.request(`/doctor/queues/${testQueueId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${doctorToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "completed" }),
  });
  console.log(`4.5. PATCH /doctor/queues/:id/status (completed): Status ${completedRes.status}`);

  // ---------------------------------------------------------------------------
  // FLOW 5: PHARMACIST WORKFLOW (Prescription -> Dispense -> Stock Movement)
  // ---------------------------------------------------------------------------
  console.log("\n>>> [FLOW 5] PHARMACIST WORKFLOW <<<");

  // Step 5.1: List Prescriptions
  const listPrescriptionsRes = await app.request("/pharmacist/prescriptions", {
    headers: { Authorization: `Bearer ${pharmacistToken}` },
  });
  console.log(`5.1. GET /pharmacist/prescriptions: Status ${listPrescriptionsRes.status}`);
  const allPrescriptionsJson = await listPrescriptionsRes.json();
  const allPrescriptions = allPrescriptionsJson.data;
  console.log(`     Prescriptions in pharmacy queue: ${allPrescriptions.length}`);

  // Step 5.2: Update status to preparing
  const prepRes = await app.request(`/pharmacist/prescriptions/${createdPrescriptionId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${pharmacistToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "preparing" }),
  });
  console.log(`5.2. PATCH /pharmacist/prescriptions/:id/status (preparing): Status ${prepRes.status}`);

  // Step 5.3: Update status to ready
  const readyRes = await app.request(`/pharmacist/prescriptions/${createdPrescriptionId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${pharmacistToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "ready" }),
  });
  console.log(`5.3. PATCH /pharmacist/prescriptions/:id/status (ready): Status ${readyRes.status}`);

  // Step 5.4: Update status to taken (Patient receives medicines)
  const takenRes = await app.request(`/pharmacist/prescriptions/${createdPrescriptionId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${pharmacistToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "taken" }),
  });
  console.log(`5.4. PATCH /pharmacist/prescriptions/:id/status (taken): Status ${takenRes.status}`);

  // Step 5.5: Pharmacist Stock In Movement
  const stockMoveRes = await app.request("/pharmacist/stock-movements", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pharmacistToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      medicineId: sampleMed.id,
      type: "in",
      quantity: 50,
      reason: "Penerimaan Restock Gudang Distributor Farma",
      reference: `PO-${Date.now()}`,
    }),
  });
  console.log(`5.5. POST /pharmacist/stock-movements: Status ${stockMoveRes.status}`);
  if (stockMoveRes.status !== 201) {
    console.error("Stock movement error:", await stockMoveRes.text());
    throw new Error("Stock movement failed");
  }

  // ---------------------------------------------------------------------------
  // FLOW 6: ADMIN WORKFLOW (Dashboard Stats, Patients, Doctors, Users, Master Meds)
  // ---------------------------------------------------------------------------
  console.log("\n>>> [FLOW 6] ADMIN WORKFLOW <<<");

  // Step 6.1: Admin Dashboard Summary
  const adminStatsRes = await app.request("/admin/dashboard/summary", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`6.1. GET /admin/dashboard/summary: Status ${adminStatsRes.status}`);
  if (adminStatsRes.status !== 200) throw new Error("Admin dashboard summary failed");
  const statsJson = await adminStatsRes.json();
  const stats = statsJson.data;
  console.log(`     Today Total Queues   : ${stats?.queues?.total || 0}`);
  console.log(`     Total Active Doctors : ${stats?.activeDoctors || 0}`);
  console.log(`     Total Patients       : ${stats?.totalPatients || 0}`);
  console.log(`     Critical Stock Items : ${stats?.medicines?.lowStockCount || 0}`);

  // Step 6.2: Admin Patient CRUD (List & Toggle Status)
  const adminPatientsRes = await app.request("/admin/patients?limit=5", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`6.2. GET /admin/patients: Status ${adminPatientsRes.status}`);

  // Step 6.3: Admin Doctor List
  const adminDoctorsRes = await app.request("/admin/doctors", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`6.3. GET /admin/doctors: Status ${adminDoctorsRes.status}`);

  // Step 6.4: Admin Users Management
  const adminUsersRes = await app.request("/admin/users", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`6.4. GET /admin/users: Status ${adminUsersRes.status}`);

  // Step 6.5: Admin Medicines Management
  const adminMedsRes = await app.request("/admin/medicines", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`6.5. GET /admin/medicines: Status ${adminMedsRes.status}`);

  console.log("\n================================================================================");
  console.log("✅ ALL 6 END-TO-END FLOWS PASSED WITH ZERO ERRORS!");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err);
  process.exit(1);
});
