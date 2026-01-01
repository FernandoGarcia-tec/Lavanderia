import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(req: NextRequest) {
  // Obtener email de prueba de la URL (opcional)
  const testEmail = req.nextUrl.searchParams.get('email');
  
  // Verificar que las variables de entorno estén configuradas
  const config = {
    EMAIL_USER: process.env.EMAIL_USER ? '✅ Configurado' : '❌ No configurado',
    EMAIL_PASS: process.env.EMAIL_PASS ? '✅ Configurado' : '❌ No configurado',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '✅ Configurado' : '❌ No configurado',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '✅ Configurado' : '❌ No configurado',
  };

  // Si no hay email de prueba, solo mostrar estado de configuración
  if (!testEmail) {
    return NextResponse.json({
      message: 'Estado de configuración de notificaciones',
      config,
      instrucciones: 'Para probar el envío de correo, agrega ?email=tu-correo@ejemplo.com a la URL'
    });
  }

  // Intentar enviar correo de prueba
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return NextResponse.json({
      error: 'Faltan credenciales de correo',
      config,
    }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verificar conexión
    await transporter.verify();

    // Enviar correo de prueba
    await transporter.sendMail({
      from: `"Lavandería Angy" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: '✅ Prueba exitosa - Lavandería Angy',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 ¡Funciona!</h1>
          </div>
          <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #334155;">El sistema de correos de <strong>Lavandería Angy</strong> está configurado correctamente.</p>
            <p style="color: #64748b; font-size: 14px;">Este es un correo de prueba enviado desde tu aplicación.</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">Fecha: ${new Date().toLocaleString('es-MX')}</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `✅ Correo de prueba enviado a ${testEmail}`,
      config,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      ayuda: error.message.includes('Invalid login') 
        ? 'La contraseña de aplicación es incorrecta. Genera una nueva en https://myaccount.google.com/apppasswords'
        : error.message.includes('Username and Password not accepted')
        ? 'Credenciales rechazadas. Asegúrate de usar una "Contraseña de aplicación", no tu contraseña normal de Gmail.'
        : 'Revisa que EMAIL_USER y EMAIL_PASS estén correctos en .env.local',
      config,
    }, { status: 500 });
  }
}
