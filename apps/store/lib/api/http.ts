import createClient, { type Middleware } from "openapi-fetch";
import { apiTimeoutMs, apiUrl } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";

const auth: Middleware = {
  async onRequest({ request }) {
    request.headers.set("Authorization", `Bearer ${await serviceToken()}`);
    return request;
  },
};

const gatewayClient = <Paths extends object>() =>
  createClient<Paths>({
    baseUrl: apiUrl(),
    fetch: (request: Request) =>
      fetch(request, { signal: AbortSignal.timeout(apiTimeoutMs()) }),
  });

export function serviceClient<Paths extends object>() {
  const client = gatewayClient<Paths>();
  client.use(auth);
  return client;
}

export function userClient<Paths extends object>(accessToken: string) {
  const client = gatewayClient<Paths>();
  client.use({
    async onRequest({ request }) {
      request.headers.set("Authorization", `Bearer ${accessToken}`);
      return request;
    },
  });
  return client;
}

type Data<T> = { data?: T; error?: unknown; response: Response };

export async function unwrap<T>(result: Promise<Data<T>>): Promise<T> {
  const { data, error, response } = await result;
  if (!response.ok || data === undefined) throw await apiError(response, error);
  return data;
}

export async function unwrapEmpty(
  result: Promise<{ error?: unknown; response: Response }>,
): Promise<void> {
  const { error, response } = await result;
  if (!response.ok) throw await apiError(response, error);
}
