export enum Role {
  ADMIN = "ADMIN",
  DOCTOR = "DOCTOR",
  PHARMACIST = "PHARMACIST",
}

export const ROLES = [Role.ADMIN, Role.DOCTOR, Role.PHARMACIST] as const;
