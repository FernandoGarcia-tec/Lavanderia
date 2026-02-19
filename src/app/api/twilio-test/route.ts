import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  try {
    const { to, body } = await req.json();
    if (!to) {
      return NextResponse.json({ error: 'Número destino requerido' }, { status: 400 });
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ error: 'Credenciales de Twilio no configuradas' }, { status: 500 });
    }

    const fromRaw =
      process.env.TWILIO_SMS_NUMBER ||
      process.env.TWILIO_PHONE_NUMBER ||
      process.env.TWILIO_WHATSAPP_NUMBER;

    if (!fromRaw) {
      return NextResponse.json({ error: 'Número remitente de Twilio no configurado' }, { status: 500 });
    }

    const from = fromRaw.startsWith('whatsapp:') ? fromRaw.replace('whatsapp:', '') : fromRaw;
    const toNormalized = String(to).trim().startsWith('+')
      ? String(to).trim()
      : `+${String(to).replace(/[^0-9]/g, '')}`;

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({
      from,
      to: toNormalized,
      body: body || '¡Prueba exitosa desde Lavandería Angy!'
    });
    return NextResponse.json({ success: true, sid: message.sid, status: message.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
