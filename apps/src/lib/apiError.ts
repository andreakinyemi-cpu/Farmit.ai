import { NextResponse } from "next/server";

export function ok(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(code: string, message: string, details?: unknown, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}
