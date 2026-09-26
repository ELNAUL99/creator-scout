import { NextResponse } from "next/server";
import { mergeBrand } from "@/lib/brand";
import { loadActiveBrand, saveActiveBrand } from "@/lib/brandStore";
import type { BrandProfile } from "@/lib/types";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  const saved = await loadActiveBrand();
  const brand = mergeBrand(saved ?? undefined);
  return NextResponse.json({ brand }, { headers: CORS });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<BrandProfile>;
  const brand = mergeBrand(body);
  await saveActiveBrand(brand);
  return NextResponse.json({ brand }, { headers: CORS });
}
