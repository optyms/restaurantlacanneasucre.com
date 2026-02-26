import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Env {
  DB: D1Database;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_FROM_NUMBER: string;
  TWILIO_OWNER_NUMBER: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TIME_SLOTS = [
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
] as const;

// French metropolitan mobile numbers only (06, 07, +33 6, +33 7, 0033 6, 0033 7)
const FRENCH_PHONE_RE = /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/;

// Restaurant contact number (from index.html)
const RESTAURANT_PHONE = '06 51 84 15 61';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const reservationSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name:  z.string().min(1).max(100),
  phone:      z.string().regex(FRENCH_PHONE_RE, 'Numero de telephone francais metropolitain requis (06, 07, +33)'),
  email:      z.string().email('Adresse email invalide'),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date YYYY-MM-DD requis'),
  time_slot:  z.enum(VALID_TIME_SLOTS),
  party_size: z.number().int().min(1).max(20),
  honeypot:   z.string().optional(),
});

type ReservationInput = z.infer<typeof reservationSchema>;

// ---------------------------------------------------------------------------
// Utility: JSON response
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Utility: send SMS via Twilio REST API (no SDK — Workers runtime incompatible)
// ---------------------------------------------------------------------------

async function sendSms(env: Env, to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To:   to,
      From: env.TWILIO_FROM_NUMBER,
      Body: body,
    }).toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Twilio error ${res.status}: ${errorText}`);
  }
}

// ---------------------------------------------------------------------------
// SMS templates (GSM-7 safe — no ê, ë, î, ï, ô, û, œ)
// ---------------------------------------------------------------------------

function buildClientSms(data: ReservationInput): string {
  const service = data.time_slot <= '14:00' ? 'midi' : 'soir';
  // GSM-7: e, è, é, à, ù are OK. Avoid ê, ë, î, ï, ô, û, œ.
  return (
    `La Canne a Sucre - Reservation confirmee\n` +
    `${data.first_name} ${data.last_name}, ${data.party_size} pers.\n` +
    `Le ${data.date} a ${data.time_slot} (service ${service})\n` +
    `Pour annuler : ${RESTAURANT_PHONE}`
  );
}

function buildOwnerSms(data: ReservationInput): string {
  const service = data.time_slot <= '14:00' ? 'Midi' : 'Soir';
  // Format date: "le mercredi 28/02/2026"
  const d = new Date(data.date + 'T12:00:00Z');
  const joursSemaine = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const jour = joursSemaine[d.getUTCDay()];
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const dateFormatted = `${jour} ${dd}/${mm}/${yyyy}`;

  return (
    `Hello Chantale,\n\n` +
    `Nouvelle reservation:\n\n` +
    `Client: ${data.first_name} ${data.last_name}\n\n` +
    `Date et heure: le ${dateFormatted} a ${data.time_slot}\n\n` +
    `Nombre de convives: ${data.party_size}\n\n` +
    `Service: ${service}\n\n` +
    `Bonne journee\n` +
    `--Samuel\n\n` +
    `-------------------------------------\n` +
    `Message automatique - Ne pas repondre\n` +
    `-------------------------------------`
  );
}

// ---------------------------------------------------------------------------
// Main handler — exported for Pages Functions routing
// ---------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Parse JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Corps de requete JSON invalide' }, 400);
  }

  // 2. Validate with Zod
  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;

  // 3. Honeypot check (bot detection)
  if (data.honeypot && data.honeypot.length > 0) {
    return jsonResponse({ error: 'Spam detecte' }, 400);
  }

  // 4. Business rules

  // 4a. Date in the past (string comparison works for ISO dates)
  const today = new Date().toISOString().slice(0, 10);
  if (data.date < today) {
    return jsonResponse({ error: 'La date ne peut pas etre dans le passe' }, 400);
  }

  // 4b. Monday check — use T12:00:00Z + getUTCDay() to avoid timezone pitfall
  const dayOfWeek = new Date(`${data.date}T12:00:00Z`).getUTCDay();
  if (dayOfWeek === 1) {
    return jsonResponse({ error: 'Le restaurant est ferme le lundi' }, 400);
  }

  // 5. Generate reservation ID (built-in Workers crypto)
  const id = crypto.randomUUID();

  // 6. Insert into D1
  try {
    await env.DB.prepare(
      `INSERT INTO reservations (id, first_name, last_name, phone, email, date, time_slot, party_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, data.first_name, data.last_name, data.phone, data.email, data.date, data.time_slot, data.party_size)
      .run();
  } catch (err) {
    console.error('D1 insert error:', err);
    return jsonResponse({ error: 'Erreur lors de l\'enregistrement de la reservation' }, 500);
  }

  // 7. Send SMS in parallel AFTER D1 insert (reservation already saved)
  //    - Client: confirmation SMS
  //    - Owner (Chantale): notification SMS to 0651841561
  //    - CC (Samuel): same notification SMS to 0619614643
  const OWNER_PHONE = '+33651841561';
  const CC_PHONE    = '+33619614643';

  const clientSms  = buildClientSms(data);
  const ownerSms   = buildOwnerSms(data);

  const [clientResult, ownerResult, ccResult] = await Promise.allSettled([
    sendSms(env, data.phone, clientSms),
    sendSms(env, OWNER_PHONE, ownerSms),
    sendSms(env, CC_PHONE, ownerSms),
  ]);

  // 8. Build response — include warnings if SMS failed
  const warnings: string[] = [];

  if (clientResult.status === 'rejected') {
    console.error('SMS client echoue:', clientResult.reason);
    warnings.push('SMS client echoue');
  }
  if (ownerResult.status === 'rejected') {
    console.error('SMS proprietaire echoue:', ownerResult.reason);
    warnings.push('SMS proprietaire echoue');
  }
  if (ccResult.status === 'rejected') {
    console.error('SMS copie echoue:', ccResult.reason);
    // Don't warn user about CC failure — internal concern
  }

  const responseBody: Record<string, unknown> = {
    id,
    message: 'Reservation enregistree avec succes',
  };
  if (warnings.length > 0) {
    responseBody.warnings = warnings;
  }

  return jsonResponse(responseBody, 201);
};
