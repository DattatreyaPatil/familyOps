import { handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve((request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  return jsonResponse({
    provider: "GEMINI",
    enabled: Boolean(Deno.env.get("GEMINI_API_KEY")),
    model: Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash"
  });
});

