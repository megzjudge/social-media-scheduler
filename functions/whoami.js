// functions/whoami.js
export async function onRequest({ env }) {
  const token = env.PINTEREST_ACCESS_TOKEN;
  if (!token) return new Response(JSON.stringify({ error: "Missing PINTEREST_ACCESS_TOKEN" }), { status: 500, headers: { "Content-Type": "application/json" }});

  const r = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const t = await r.text();
  let data; try { data = JSON.parse(t); } catch { data = { raw: t }; }
  return new Response(JSON.stringify({ ok: r.ok, status: r.status, data }), { headers: { "Content-Type": "application/json" }});
}
