export async function onRequest() {
  return new Response(JSON.stringify([{ id: "123", name: "Test Board" }]), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
