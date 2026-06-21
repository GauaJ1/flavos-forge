import { config } from "../config/index.js";

/**
 * Sends a password recovery OTP to the user's email.
 * Falls back to console logging in development if no RESEND_API_KEY is configured.
 */
export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (config.NODE_ENV === "development" || !resendApiKey) {
    console.log("-----------------------------------------");
    console.log(`✉️ [EMAIL MOCK] Password Recovery OTP`);
    console.log(`To: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expires: in 1 hour (single-use)`);
    console.log("-----------------------------------------");
    return true;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Flavos Forge <noreply@flavoscompany.xyz>",
        to: [email],
        subject: "Flavos Forge - Password Reset Request",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; padding: 20px; color: #15131B;">
            <h2>Recuperação de Senha</h2>
            <p>Você solicitou a redefinição de senha para a sua conta no Flavos Forge.</p>
            <p>Seu código de uso único (OTP) é:</p>
            <div style="background-color: #f4efe6; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
              ${otp}
            </div>
            <p>Este código expira em 1 hora e só pode ser usado uma vez.</p>
            <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
            <br>
            <hr style="border: 0; border-top: 1px solid #ddd;" />
            <p style="font-size: 11px; color: #9A93A8;">Flavos Forge Team · forge.flavoscompany.xyz</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Resend API response error (${response.status}):`, errBody);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    return false;
  }
}
