import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configuración del transportador de correo
// Puedes usar Gmail, Outlook, o cualquier servidor SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // o 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER, // Tu correo de Gmail
      pass: process.env.EMAIL_PASS, // App Password de Gmail (no tu contraseña normal)
    },
  });
};

// Plantillas de correo
const emailTemplates = {
  approved: {
    subject: '🎉 ¡Tu cuenta ha sido aprobada! - Lavandería Angy',
    html: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">¡Bienvenido a Lavandería Angy!</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 18px; color: #334155; margin-bottom: 20px;">Hola <strong>${name}</strong>,</p>
          <p style="color: #64748b; line-height: 1.6;">
            ¡Excelentes noticias! Tu cuenta ha sido <strong style="color: #059669;">aprobada</strong> exitosamente. 
            Ya puedes iniciar sesión y comenzar a programar tus servicios de lavandería.
          </p>
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #065f46;">✓ Tu cuenta está activa y lista para usar</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://lavanderia-angy.web.app'}" 
               style="display: inline-block; background: #06b6d4; color: white; padding: 14px 32px; 
                      text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
              Iniciar Sesión
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; text-align: center;">
            ¿Tienes preguntas? Contáctanos en cualquier momento.
          </p>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          © ${new Date().getFullYear()} Lavandería Angy. Todos los derechos reservados.
        </p>
      </div>
    `,
  },
  rejected: {
    subject: '📋 Actualización de tu solicitud - Lavandería Angy',
    html: (name: string) => `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Lavandería Angy</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 18px; color: #334155; margin-bottom: 20px;">Hola <strong>${name}</strong>,</p>
          <p style="color: #64748b; line-height: 1.6;">
            Lamentamos informarte que tu solicitud de cuenta no ha podido ser aprobada en este momento.
          </p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #991b1b;">
              Si crees que esto es un error o necesitas más información, por favor contáctanos directamente.
            </p>
          </div>
          <p style="color: #64748b; line-height: 1.6;">
            Puedes comunicarte con nosotros para resolver cualquier duda sobre tu solicitud.
          </p>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; text-align: center;">
            Atentamente,<br/>El equipo de Lavandería Angy
          </p>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          © ${new Date().getFullYear()} Lavandería Angy. Todos los derechos reservados.
        </p>
      </div>
    `,
  },
};

// Plantillas de WhatsApp (texto plano)
const whatsappTemplates = {
  approved: (name: string) => 
    `🎉 *¡Hola ${name}!*\n\n` +
    `Tu cuenta en *Lavandería Angy* ha sido *aprobada* ✅\n\n` +
    `Ya puedes iniciar sesión y programar tus servicios de lavandería.\n\n` +
    `¡Te esperamos! 👕🧺`,
  rejected: (name: string) => 
    `Hola ${name},\n\n` +
    `Lamentamos informarte que tu solicitud de cuenta en Lavandería Angy no ha podido ser aprobada en este momento.\n\n` +
    `Si tienes dudas, puedes contactarnos directamente.\n\n` +
    `- Lavandería Angy`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, channel, to, name, status, customMessage } = body;

    // Validaciones
    if (!to || !name) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // Si hay mensaje personalizado, usarlo directamente
    if (customMessage) {
      const results: { email?: boolean; whatsapp?: boolean; errors?: string[] } = { errors: [] };

      // Enviar WhatsApp con mensaje personalizado
      if (channel === 'whatsapp' || channel === 'both') {
        if (!to.phone) {
          results.errors?.push('No se proporcionó número de teléfono');
        } else if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
          results.errors?.push('Twilio no está configurado');
        } else {
          try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER;

            let phoneNumber = to.phone.replace(/\s+/g, '').replace(/-/g, '');
            if (!phoneNumber.startsWith('+')) {
              phoneNumber = '+521' + phoneNumber;
            }

            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  From: twilioPhone || 'whatsapp:+14155238886',
                  To: `whatsapp:${phoneNumber}`,
                  Body: customMessage,
                }),
              }
            );

            if (response.ok) {
              results.whatsapp = true;
            } else {
              const errorData = await response.json();
              results.errors?.push(`WhatsApp: ${errorData.message || 'Error desconocido'}`);
            }
          } catch (waError: any) {
            console.error('Error enviando WhatsApp:', waError);
            results.errors?.push(`WhatsApp: ${waError.message}`);
          }
        }
      }

      if (results.errors?.length === 0) {
        delete results.errors;
      }

      return NextResponse.json({ 
        success: true, 
        ...results,
        message: results.whatsapp ? 'Notificación enviada' : 'No se pudo enviar la notificación'
      });
    }

    if (!status) {
      return NextResponse.json({ error: 'Falta el parámetro status' }, { status: 400 });
    }

    const template = status === 'aprobado' ? 'approved' : 'rejected';
    const results: { email?: boolean; whatsapp?: boolean; errors?: string[] } = { errors: [] };

    // Enviar correo electrónico
    if (channel === 'email' || channel === 'both') {
      if (!to.email) {
        results.errors?.push('No se proporcionó correo electrónico');
      } else {
        try {
          const transporter = createTransporter();
          await transporter.sendMail({
            from: `"Lavandería Angy" <${process.env.EMAIL_USER}>`,
            to: to.email,
            subject: emailTemplates[template].subject,
            html: emailTemplates[template].html(name),
          });
          results.email = true;
        } catch (emailError: any) {
          console.error('Error enviando email:', emailError);
          results.errors?.push(`Email: ${emailError.message}`);
        }
      }
    }

    // Enviar WhatsApp (usando Twilio)
    if (channel === 'whatsapp' || channel === 'both') {
      if (!to.phone) {
        results.errors?.push('No se proporcionó número de teléfono');
      } else if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        results.errors?.push('Twilio no está configurado');
      } else {
        try {
          const accountSid = process.env.TWILIO_ACCOUNT_SID;
          const authToken = process.env.TWILIO_AUTH_TOKEN;
          const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER; // formato: whatsapp:+14155238886

          // Formatear número de teléfono (agregar código de país si no lo tiene)
          let phoneNumber = to.phone.replace(/\s+/g, '').replace(/-/g, '');
          if (!phoneNumber.startsWith('+')) {
            phoneNumber = '+521' + phoneNumber; // Código de México por defecto para WhatsApp
          }

          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                From: twilioPhone || 'whatsapp:+14155238886',
                To: `whatsapp:${phoneNumber}`,
                Body: whatsappTemplates[template](name),
              }),
            }
          );

          if (response.ok) {
            results.whatsapp = true;
          } else {
            const errorData = await response.json();
            results.errors?.push(`WhatsApp: ${errorData.message || 'Error desconocido'}`);
          }
        } catch (waError: any) {
          console.error('Error enviando WhatsApp:', waError);
          results.errors?.push(`WhatsApp: ${waError.message}`);
        }
      }
    }

    // Limpiar errores vacíos
    if (results.errors?.length === 0) {
      delete results.errors;
    }

    return NextResponse.json({ 
      success: true, 
      ...results,
      message: results.email || results.whatsapp 
        ? 'Notificación enviada' 
        : 'No se pudo enviar la notificación'
    });

  } catch (error: any) {
    console.error('Error en send-notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
