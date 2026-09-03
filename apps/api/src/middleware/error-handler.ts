import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    // A stable identifier the caller can branch on, where the human-readable
    // message is not a safe thing to switch behaviour against.
    public code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    // Errors without a code keep exactly the shape they had before, so no
    // existing response changes.
    res.status(err.status).json({
      error: err.code ? { message: err.message, code: err.code } : { message: err.message },
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { message: "Internal server error" } });
}
