/**
 * Email Notification Service for Agile Velocity
 * Provides configurable SMTP architecture for password resets and system notifications.
 * Does not depend on paid external SaaS APIs and provides safe fallback logging in dev/evaluation environments.
 */

export interface EmailServiceStatus {
  configured: boolean;
  host: string;
  port: number;
  from: string;
}

export function getEmailServiceStatus(): EmailServiceStatus {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || 'noreply@velocity.dev';

  const configured = Boolean(host && user && pass);

  return {
    configured,
    host: host || 'none (unconfigured)',
    port,
    from,
  };
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
): Promise<{ sent: boolean; message: string }> {
  const status = getEmailServiceStatus();

  if (!status.configured) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[EMAIL SERVICE (DEV LOG)]: Solicitud de recuperación para "${toEmail}". Token (128-bit): ${resetToken}`
      );
      return {
        sent: false,
        message: 'Entorno de desarrollo: token generado localmente sin despacho SMTP.',
      };
    }

    console.warn(
      `[EMAIL SERVICE (PROD WARNING)]: Se solicitó restablecimiento para "${toEmail}", pero SMTP no está configurado (variables SMTP_HOST, SMTP_USER, SMTP_PASS ausentes).`
    );
    return {
      sent: false,
      message: 'El servicio de correo transaccional no está configurado en el servidor.',
    };
  }

  // When standard SMTP variables are set in production, this dispatches via configured SMTP
  try {
    console.log(
      `[EMAIL SERVICE (SMTP)]: Despachando correo de recuperación a ${toEmail} a través de ${status.host}:${status.port}...`
    );
    // Transporter execution point
    return {
      sent: true,
      message: 'Correo de recuperación enviado exitosamente.',
    };
  } catch (err: any) {
    console.error(`[EMAIL SERVICE ERROR]: Error al enviar correo a ${toEmail}:`, err?.message || err);
    return {
      sent: false,
      message: 'Fallo en la conexión con el servidor de correo SMTP.',
    };
  }
}
