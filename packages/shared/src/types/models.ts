import { Role } from "../constants/roles.js";
import {
  Gender,
  PrescriptionStatus,
  QueueStatus,
} from "../constants/status.js";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Doctor {
  id: string;
  userId: string;
  specialization: string;
  licenseNumber: string;
  phone?: string | null;
  user?: User;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Patient {
  id: string;
  nationalId: string; // NIK / Identitas Kependudukan
  name: string;
  birthDate: string; // YYYY-MM-DD
  gender: Gender;
  phone?: string | null;
  address?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Medicine {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Queue {
  id: string;
  queueNumber: string;
  patientId: string;
  doctorId?: string | null;
  status: QueueStatus;
  patient?: Patient;
  doctor?: Doctor;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PrescriptionItem {
  id?: string;
  medicineId: string;
  quantity: number;
  instructions: string;
  medicine?: Medicine;
}

export interface Prescription {
  id: string;
  queueId: string;
  patientId: string;
  doctorId: string;
  status: PrescriptionStatus;
  notes?: string | null;
  items: PrescriptionItem[];
  patient?: Patient;
  doctor?: Doctor;
  createdAt: Date | string;
  updatedAt: Date | string;
}
