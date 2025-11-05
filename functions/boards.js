export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });

  const token = env.PINTEREST_ACCESS_TOKEN;
  if (!token) return json({ error: "Missing PINTEREST_ACCESS_TOKEN" }, 500);

  const r = await fetch("https://api.pinterest.com/v5/boards?page_size=50", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: data?.message || "Pinterest boards error" }, r.status);

  const boards = Array.isArray(data.items) ? data.items.map(b => ({ id: b.id, name: b.name })) : [];
  return json(boards);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
  });
}