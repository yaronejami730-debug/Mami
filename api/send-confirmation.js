export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Email service not configured" });
    return;
  }

  const { toEmail, toName, dayLabel, startTime, endTime, periodEmoji } = req.body ?? {};

  if (!toEmail || !toName || !dayLabel || !startTime || !endTime) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }

  const html = `
    <div style="background:#f4f5f7;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#16a34a;padding:28px 32px;text-align:center">
            <div style="font-size:34px;line-height:1">✅</div>
            <div style="color:#ffffff;font-size:19px;font-weight:700;margin-top:8px">Créneau confirmé</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px">
            <p style="margin:0 0 16px;color:#0f172a;font-size:15px;line-height:1.5">Bonjour <strong>${toName}</strong>,</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#16a34a12;border:1px solid #16a34a33;border-radius:12px;margin:4px 0 18px">
              <tr>
                <td style="padding:14px 18px">
                  <div style="color:#16a34a;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px">${periodEmoji ?? "📅"} ${dayLabel}</div>
                  <div style="color:#0f172a;font-size:16px;font-weight:600">${startTime} → ${endTime}</div>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.6">Votre créneau est bien enregistré. Vous pouvez le modifier ou l'annuler à tout moment depuis le planning.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 32px;text-align:center">
            <a href="https://myagendamami.vercel.app" style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:600;font-size:14px;padding:13px 28px;border-radius:10px;text-decoration:none;margin-top:8px">Voir le planning</a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #eef1f5;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5">Planning famille — organisation des présences auprès de Mamie.</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Planning Mamie", email: "notif@dealandcompany.fr" },
        to: [{ email: toEmail, name: toName }],
        subject: `✅ Créneau confirmé — ${dayLabel} ${startTime}→${endTime}`,
        htmlContent: html,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      res.status(502).json({ error: "Brevo error", detail: text });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Send failed", detail: String(err) });
  }
}
