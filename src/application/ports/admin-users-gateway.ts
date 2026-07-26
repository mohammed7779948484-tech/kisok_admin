import type { AdminUser, AppRole } from "@/domain/entities";

export interface AdminUsersPage {
  users: AdminUser[];
  page: number;
  perPage: number;
  total: number;
}

export interface AdminUsersGateway {
  list(input: {
    page: number;
    perPage: number;
    search?: string;
  }): Promise<AdminUsersPage>;
  create(input: {
    email: string;
    password: string;
    displayName: string;
    role: AppRole;
  }): Promise<AdminUser>;
  update(input: {
    userId: string;
    displayName: string;
    role: AppRole;
  }): Promise<AdminUser>;
  setPassword(input: { userId: string; password: string }): Promise<void>;
  deactivate(userId: string): Promise<void>;
  reactivate(userId: string): Promise<void>;
}
