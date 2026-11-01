import createClient, { type Middleware } from "openapi-fetch";
import { apiTimeoutMs, apiUrl } from "./config";
import { serviceToken } from "./service-token";

/** Adds the service token and a timeout to every request. */
const auth: Middleware = {
  async onRequest({ request }) {
    request.headers.set("Authorization", `Bearer ${await serviceToken()}`);
    return request;
  },
};

/** A typed client for one service's paths, sending requests through the gateway. */
export function serviceClient<Paths extends object>() {
  const client = createClient<Paths>({
    baseUrl: apiUrl(),
    fetch: (request: Request) =>
      fetch(request, { signal: AbortSignal.timeout(apiTimeoutMs()) }),
  });
  client.use(auth);
  return client;
}
