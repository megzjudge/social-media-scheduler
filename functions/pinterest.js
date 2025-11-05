export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const title = (body.title || "").trim();
  const boardId = (body.boardId || "").trim();
  const mediaUrl = (body.mediaUrl || "").trim();
  const description = (body.description || "").slice(0, 500);
  const altText = (body.altText || "").slice(0, 500);
  const link = (body.link || "").trim();

  if (!title) return json({ error: "Missing title" }, 400);
  if (!boardId) return json({ error: "Missing boardId" }, 400);
  if (!mediaUrl) return json({ error: "Missing mediaUrl" }, 400);

  const token = env.PINTEREST_ACCESS_TOKEN;
  if (!token) return json({ error: "Missing PINTEREST_ACCESS_TOKEN" }, 500);

  const payload = {
    title,
    board_id: boardId,
    ...(description ? { description } : {}),
    ...(altText ? { alt_text: altText } : {}),
    ...(link ? { link } : {}),
    media_source: { source_type: "image_url", url: mediaUrl },
  };

  const r = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: data?.message || "Pinterest create pin error" }, r.status);

  return json({ pinId: data.id, pinUrl: data.link || data.url || null });
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