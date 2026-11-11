// Polls USGS every minute (pg_cron). For new earthquakes in Mexico with M >= 6.5
// sends a high-urgency web push to every subscribed device and an email
// "Alerta Sismica" to every registered user. Idempotent per event (quake_alerts_sent),
// takes no caller input, so it is safe to expose to the scheduler.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

const MIN_MAGNITUDE = 6.5;
const MAX_AGE_MS = 30 * 60 * 1000;
const FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_hour.geojson";

// Mexico bounding box + place text check
const inMexico = (lat: number, lng: number, place: string) =>
  lat >= 14 && lat <= 33.5 && lng >= -118.5 && lng <= -86 &&
  /mexico|méxico|guatemala border|gulf of california/i.test(place);

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function sendEmail(apiKey: string, to: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "M.A.T.S. Alertas <noreply@mats-app.com>", to: [to], subject: "Alerta Sismica", html }),
  });
  if (!r.ok) console.error("[quake-alert-dispatch] Resend error", r.status, (await r.text()).slice(0, 200));
  return r.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const feed = await fetch(FEED, { signal: ctrl.signal }).then((r) => r.json()).finally(() => clearTimeout(t));

    // deno-lint-ignore no-explicit-any
    const quakes = (feed.features ?? []).filter((f: any) => {
      const [lng, lat] = f.geometry.coordinates;
      return f.properties.mag >= MIN_MAGNITUDE &&
        Date.now() - f.properties.time < MAX_AGE_MS &&
        inMexico(lat, lng, f.properties.place ?? "");
    });
    if (quakes.length === 0) return json({ success: true, alerts: 0 });

    const results = [];
    for (const q of quakes) {
      const id = String(q.id);
      const [lng, lat, depth] = q.geometry.coordinates;
      const mag = Number(q.properties.mag);
      const place = String(q.properties.place ?? "México");
      const when = new Date(q.properties.time);

      // Claim the event atomically; skip if already alerted
      const { error: claimErr } = await supabase.from("quake_alerts_sent")
        .insert({ event_id: id, magnitude: mag, place, occurred_at: when.toISOString() });
      if (claimErr) continue;

      const hora = when.toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "medium", timeStyle: "medium" });
      const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

      // 1) Web push to every device
      let pushSent = 0;
      const vpub = Deno.env.get("VAPID_PUBLIC_KEY"), vpriv = Deno.env.get("VAPID_PRIVATE_KEY");
      if (vpub && vpriv) {
        webpush.setVapidDetails("mailto:soporte@mats.app", vpub, vpriv);
        const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
        const payload = JSON.stringify({
          title: `🚨 ALERTA SÍSMICA M${mag.toFixed(1)}`,
          body: `${place} · ${hora}. Mantén la calma y sigue tus protocolos.`,
          icon: "/icon-192-v2.png", badge: "/icon-192-v2.png",
          tag: `quake-${id}`, alertType: "EARTHQUAKE", requireInteraction: true,
          data: { type: "earthquake", url: "/sismos", eventId: id },
        });
        const stale: string[] = [];
        await Promise.all((subs ?? []).map(async (s) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "high" });
            pushSent++;
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) stale.push(s.id);
          }
        }));
        if (stale.length) await supabase.from("push_subscriptions").delete().in("id", stale);
      }

      // 2) Email "Alerta Sismica" to every registered user
      let emailsSent = 0;
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#ffffff;padding:20px">
<div style="max-width:600px;margin:0 auto;border:2px solid #DC2626;border-radius:12px;overflow:hidden">
<div style="background:#DC2626;color:#ffffff;padding:20px;text-align:center"><h1 style="margin:0">🚨 ALERTA SÍSMICA</h1>
<p style="margin:6px 0 0;font-size:28px;font-weight:bold">Magnitud ${mag.toFixed(1)}</p></div>
<div style="padding:20px;font-size:16px;color:#111827">
<p><strong>Lugar:</strong> ${esc(place)}</p>
<p><strong>Hora (CDMX):</strong> ${esc(hora)}</p>
<p><strong>Profundidad:</strong> ${Number(depth).toFixed(0)} km</p>
<p><strong>Coordenadas:</strong> ${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}</p>
<p><a href="${mapUrl}">📍 Ver epicentro en el mapa</a> · <a href="${esc(String(q.properties.url ?? ""))}">Ficha del USGS</a></p>
<p>Mantén la calma, aléjate de ventanas y objetos que puedan caer, y reporta tu estado en la app M.A.T.S.</p>
<p style="color:#6b7280;font-size:12px">Fuente: Servicio Geológico de EE. UU. (USGS). Datos preliminares, pueden actualizarse. Consulta también al Servicio Sismológico Nacional.</p>
</div></div></body></html>`;
        for (let page = 1; page <= 20; page++) {
          const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
          if (error || !data?.users?.length) break;
          for (const u of data.users) {
            if (u.email && await sendEmail(resendKey, u.email, html)) emailsSent++;
            await new Promise((r) => setTimeout(r, 60));
          }
          if (data.users.length < 1000) break;
        }
      }

      await supabase.from("quake_alerts_sent").update({ push_sent: pushSent, emails_sent: emailsSent }).eq("event_id", id);
      console.log(`[quake-alert-dispatch] ${id} M${mag} push=${pushSent} emails=${emailsSent}`);
      results.push({ id, mag, pushSent, emailsSent });
    }
    return json({ success: true, alerts: results.length, results });
  } catch (e) {
    console.error("[quake-alert-dispatch] error", e);
    return json({ error: String(e) }, 500);
  }
});
