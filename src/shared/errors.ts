import type { HttpError } from "@refinedev/core";

export class AppError extends Error implements HttpError {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

type ErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  statusCode?: number;
  details?: string;
};

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const value = (error ?? {}) as ErrorLike;
  const raw = `${value.message ?? ""} ${value.details ?? ""}`.toLowerCase();
  const statusCode = value.statusCode ?? value.status ?? 500;

  if (value.code === "23503" || raw.includes("foreign key")) {
    return new AppError(
      "This record is still in use. Deactivate it instead of deleting it.",
      409,
      value.code,
    );
  }
  if (value.code === "23505" || raw.includes("duplicate")) {
    return new AppError("A record with these values already exists.", 409, value.code);
  }
  if (statusCode === 401 || raw.includes("invalid login credentials")) {
    return new AppError("The email or password is incorrect.", 401, value.code);
  }
  if (statusCode === 403 || raw.includes("permission denied")) {
    return new AppError("You do not have permission to perform this action.", 403, value.code);
  }
  return new AppError(
    value.message || "Something went wrong. Please try again.",
    statusCode,
    value.code,
  );
}
