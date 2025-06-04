// src/app/api/debug/route.ts
export async function GET(request: Request) {
  console.log("🔎 [DEBUG] SUPABASE_URL ist:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  return new Response(
    `SUPABASE_URL = ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
    { status: 200 }
  );
}