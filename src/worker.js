import { onRequest } from "../functions/api/[action].js";
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const parts = url.pathname.split("/");
      if (parts.length === 3 && /^[a-z]+$/.test(parts[2])) {
        return onRequest({ request, env, params: { action: parts[2] }, ctx });
      }
      return new Response("Not found", { status: 404 });
    }
    return env.ASSETS.fetch(request);
  }
};
