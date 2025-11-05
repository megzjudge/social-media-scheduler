export async function onRequest({ env }) {
  const token = env.PINTEREST_ACCESS_TOKEN;
  if (!token) return new Response(JSON.stringify({ error: "Missing PINTEREST_ACCESS_TOKEN" }), { status: 500, headers: { "Content-Type": "application/json" }});
  const r = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text } }
  return new Response(JSON.stringify({ ok: r.ok, status: r.status, data }), { headers: { "Content-Type": "application/json" }});
}
