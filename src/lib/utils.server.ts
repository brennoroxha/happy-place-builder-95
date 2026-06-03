import { getRequest } from "@tanstack/react-start/server";

export function getBaseUrl() {
  try {
    const req = getRequest();
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  } catch {
    return "https://figurinhas-copa2.lovable.app"; // Fallback to current project URL
  }
}
