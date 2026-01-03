import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Credenciales de correo no configuradas');
      return NextResponse.json({ 
        success: false, 
        error: 'Credenciales de correo no configuradas' 
      }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // URL de la aplicación (ajusta según tu dominio)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lavanderiaangy.vercel.app';

    await transporter.sendMail({
      from: `"Lavandería Angy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎉 ¡Bienvenido a Lavandería Angy! - Tus credenciales de acceso',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9;">
          <div style="max-width: 500px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            
            <!-- Header con gradiente -->
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🧺 Lavandería Angy</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Servicio de calidad para tu ropa</p>
            </div>
            
            <!-- Contenido principal -->
            <div style="padding: 30px 25px;">
              <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 22px;">¡Hola${name ? ` ${name}` : ''}! 👋</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                Tu cuenta ha sido creada exitosamente. Ahora puedes acceder a nuestro sistema para ver el estado de tus pedidos, programar servicios y más.
              </p>
              
              <!-- Caja de credenciales -->
              <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%); border: 2px solid #99f6e4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #0d9488; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center;">
                  🔐 Tus credenciales de acceso
                </h3>
                
                <div style="background: white; border-radius: 8px; padding: 12px 15px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
                  <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Correo electrónico</span>
                  <p style="color: #0f172a; font-size: 16px; margin: 5px 0 0 0; font-weight: bold; word-break: break-all;">${email}</p>
                </div>
                
                <div style="background: white; border-radius: 8px; padding: 12px 15px; border: 1px solid #e2e8f0;">
                  <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Contraseña temporal</span>
                  <p style="color: #0f172a; font-size: 20px; margin: 5px 0 0 0; font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 1px;">${password}</p>
                </div>
              </div>
              
              <!-- Alerta de seguridad -->
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.5;">
                  ⚠️ <strong>Importante:</strong> Por seguridad, te pediremos cambiar tu contraseña la primera vez que inicies sesión.
                </p>
              </div>
              
              <!-- Botón de acceso -->
              <div style="text-align: center; margin: 25px 0;">
                <a href="${appUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); color: white; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);">
                  Iniciar Sesión →
                </a>
              </div>
              
              <!-- Instrucciones paso a paso -->
              <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin-top: 20px;">
                <h4 style="color: #334155; margin: 0 0 12px 0; font-size: 14px;">📋 Cómo iniciar sesión:</h4>
                <ol style="color: #64748b; font-size: 13px; padding-left: 20px; margin: 0; line-height: 1.8;">
                  <li>Haz clic en el botón <strong>"Iniciar Sesión"</strong> arriba</li>
                  <li>Ingresa tu correo electrónico</li>
                  <li>Ingresa la contraseña temporal que te proporcionamos</li>
                  <li>Crea tu nueva contraseña personal</li>
                  <li>¡Listo! Ya puedes ver tus pedidos</li>
                </ol>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 5px 0;">
                ¿Tienes dudas? Contáctanos en la lavandería
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Lavandería Angy. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Correo de bienvenida enviado a ${email}` 
    });

  } catch (error: any) {
    console.error('Error enviando correo de bienvenida:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
