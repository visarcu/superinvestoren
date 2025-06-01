// File: src/app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { prisma }      from '@/lib/db';
import bcrypt          from 'bcryptjs';
import crypto          from 'crypto';
import { z }          from 'zod';
import { sendMail }    from '@/lib/mailer';

const SignupSchema = z.object({
  email: z.string().email({ message: 'Ungültige E-Mail' }),
  password: z
    .string()
    .min(8, { message: 'Mindestens 8 Zeichen' })
    .regex(/[A-Z]/, { message: 'Mindestens 1 Großbuchstabe' })
    .regex(/[0-9]/, { message: 'Mindestens 1 Zahl' }),
  firstName: z.string().optional(),
  lastName:  z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    const issueMsg = parsed.error.issues[0].message;
    return NextResponse.json({ error: issueMsg }, { status: 400 });
  }
  const { email, password, firstName, lastName } = parsed.data;

  // 1) Existenz prüfen
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Diese E-Mail ist bereits registriert.' }, { status: 409 });
  }

  // 2) Passwort hashen + neuen Benutzer anlegen
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      isPremium:     false,
      firstName,
      lastName,
      emailVerified: false,
    },
  });

  // 3) Verifikations-Token erzeugen
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 Stunden
  await prisma.emailVerificationToken.create({
    data: {
      token,
      user:      { connect: { id: user.id } },
      expiresAt: expires,
    },
  });

  // 4) Bestätigungs-URL bauen und Mail versenden
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;
  try {
    await sendMail({
      to:      email,
      subject: 'Bitte bestätige deine E-Mail bei FinClue',
      html: `
        <p>Hi ${firstName || 'User'},</p>
        <p>Klicke <a href="${verifyUrl}">hier</a>, um deine E-Mail-Adresse zu bestätigen.</p>
        <p>Der Link ist 24 Stunden gültig.</p>
      `,
    });
  } catch (err) {
    console.error('❌ Fehler beim Versand der Verifizierungs-Mail:', err);
    // Wir lassen den Flow trotzdem erfolgreich sein, damit der Benutzer nicht stecken bleibt.
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}