// src/app/api/debug/route.ts
export async function GET(request: Request) {
    console.log("🔎 [DEBUG] DATABASE_URL ist:", process.env.DATABASE_URL);
    return new Response(
      `DATABASE_URL (an Vercel) = ${process.env.DATABASE_URL?.slice(0,50)}…`,
      { status: 200 }
    );
  }