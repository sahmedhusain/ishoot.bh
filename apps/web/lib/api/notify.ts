import { apiError } from "./errors";
import type { components, paths } from "./generated/notify";
import { serviceClient, unwrap, userClient } from "./http";

export type NotifyMessage = components["schemas"]["Message"];
export type QueueMessageInput = components["schemas"]["QueueMessageInput"];
export type NotifyListQuery = NonNullable<
  paths["/v1/notify/desk/messages"]["get"]["parameters"]["query"]
>;

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const notify = () => (client ??= serviceClient<paths>());

export async function queueMessage(
  input: QueueMessageInput,
): Promise<NotifyMessage> {
  const { data, error, response } = await notify().POST("/v1/notify/messages", {
    body: input,
  });
  if (!response.ok || !data) throw await apiError(response, error);
  return data;
}

export const getMessageStatus = (id: string) =>
  unwrap(
    notify().GET("/v1/notify/messages/{id}", { params: { path: { id } } }),
  );

export const listMessagesForIT = (token: string, query: NotifyListQuery = {}) =>
  unwrap(
    userClient<paths>(token).GET("/v1/notify/desk/messages", {
      params: { query },
    }),
  );

export const messageSummaryForIT = async (token: string) =>
  (await unwrap(userClient<paths>(token).GET("/v1/notify/desk/summary"))).items;

export const getMessageForIT = (token: string, id: string) =>
  unwrap(
    userClient<paths>(token).GET("/v1/notify/desk/messages/{id}", {
      params: { path: { id } },
    }),
  );

export const retryMessageForIT = (token: string, id: string) =>
  unwrap(
    userClient<paths>(token).POST("/v1/notify/desk/messages/{id}/retry", {
      params: { path: { id } },
    }),
  );

export const sendTestMessageForIT = (
  token: string,
  channel: "email" | "whatsapp",
  to: string,
) =>
  unwrap(
    userClient<paths>(token).POST("/v1/notify/desk/test", {
      body: { channel, to },
    }),
  );
