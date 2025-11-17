import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templates = {
  'family-invitation': (data: Record<string, any>) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          background: #6366F1;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌙 SleepWise</h1>
      </div>
      <div class="content">
        <h2>Has sido invitado a un grupo familiar</h2>
        <p>Hola,</p>
        <p><strong>${data.inviterName}</strong> te ha invitado a unirte al grupo familiar <strong>"${data.groupName}"</strong> en SleepWise.</p>
        <p>Con los grupos familiares puedes:</p>
        <ul>
          <li>Monitorear el sueño de tus seres queridos</li>
          <li>Compartir insights y recomendaciones</li>
          <li>Recibir alertas sobre problemas de sueño</li>
          <li>Ver tendencias y comparativas</li>
        </ul>
        <p style="text-align: center;">
          <a href="${data.invitationUrl}" class="button">Aceptar Invitación</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Esta invitación expira el ${new Date(data.expiresAt).toLocaleDateString('es-ES')}
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Si no deseas unirte a este grupo, simplemente ignora este correo.
        </p>
      </div>
      <div class="footer">
        <p>© 2025 SleepWise. Todos los derechos reservados.</p>
        <p>Este correo fue enviado porque ${data.inviterName} te invitó a SleepWise.</p>
      </div>
    </body>
    </html>
  `,
};

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const template = templates[options.template as keyof typeof templates];
    if (!template) {
      throw new Error(`Template ${options.template} not found`);
    }

    const html = template(options.data);

    await transporter.sendMail({
      from: `"SleepWise" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html,
    });

    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('SMTP connection verified');
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
}
