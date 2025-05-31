// src/app/api/auth/signup/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { sendMail } from '@/lib/mailer';      // Dein eigener Mail-Sender (z. B. Nodemailer o.Ä.)

// 1) Zod-Validierung: dieselbe Regel, die Du schon in page.tsx hattest
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
  // Immer zuerst prüfen, ob wirklich eine POST-Anfrage reinkommt
  // (Next.js ruft diese Funktion nur auf, wenn die Methode stimmt.
  //  Denke bitte trotzdem ans Handling unten.)
  const body = await request.json();

  // 2) SafeParse von Zod
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    // Gib nur die erste Fehlermeldung zurück
    const issueMsg = parsed.error.issues[0].message;
    return NextResponse.json({ error: issueMsg }, { status: 400 });
  }
  const { email, password, firstName, lastName } = parsed.data;

  // 3) Prüfen, ob E-Mail schon in der Datenbank existiert
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: 'Diese E-Mail ist bereits registriert.' },
      { status: 409 }
    );
  }

  // 4) Passwort hashen und neuen Benutzer anlegen
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      isPremium: false,
      firstName,
      lastName,
      emailVerified: false,
    },
  });

  // 5) Erzeuge einen E-Mail-Verifikations-Token
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 h

  await prisma.emailVerificationToken.create({
    data: {
      token,
      user: { connect: { id: user.id } },
      expiresAt: expires,
    },
  });

  // 6) Baue Bestätigungs-URL und sende Verifikationsmail
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  try {
    await sendMail({
      to: email,
      subject: 'Bitte bestätige deine E-Mail bei FinClue',
      html: `
        <p>Hi ${firstName || 'User'},</p>
        <p>klicke <a href="${verifyUrl}">hier</a>, um deine E-Mail-Adresse zu bestätigen.</p>
        <p>Der Link ist 24 Stunden gültig.</p>
      `,
    });
  } catch (err) {
    console.error('❌ Fehler beim Versand der Bestätigungsmail:', err);
    // Optional: Du könntest hier noch einen Fehler-Response ausgeben.
    // Aber meistens lässt man den Benutzer trotzdem als „Created“ durchlaufen,
    // und man kann später per Cron-Job anschauen, warum die Mail nicht rausging.
  }

  // 7) Schließlich Erfolg zurückgeben
  return NextResponse.json({ success: true }, { status: 201 });
}