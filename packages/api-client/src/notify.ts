// The notify service (backend/services/notify): the platform's e-mail and WhatsApp messages. The apps queue them with
// their service token; IT watches, retries and tests delivery with its own token (notifications:*).
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

/** Queues a message; the same idempotency key returns the first message instead of sending again. */
export async function queueMessage(
  input: QueueMessageInput,
): Promise<NotifyMessage> {
  const { data, error, response } = await notify().POST("/v1/notify/messages", {
    body: input,
  });
  if (!response.ok || !data) throw await apiError(response, error);
  return data;
}

/** A message this app queued. */
export const getMessageStatus = (id: string) =>
  unwrap(
    notify().GET("/v1/notify/messages/{id}", { params: { path: { id } } }),
  );

/** One page of messages for IT, newest first (notifications:read). */
export const listMessagesForIT = (token: string, query: NotifyListQuery = {}) =>
  unwrap(
    userClient<paths>(token).GET("/v1/notify/desk/messages", {
      params: { query },
    }),
  );

/** The last day's messages by status and channel (notifications:read). */
export const messageSummaryForIT = async (token: string) =>
  (await unwrap(userClient<paths>(token).GET("/v1/notify/desk/summary"))).items;

/** A message with its bodies and attachment names (notifications:read). */
export const getMessageForIT = (token: string, id: string) =>
  unwrap(
    userClient<paths>(token).GET("/v1/notify/desk/messages/{id}", {
      params: { path: { id } },
    }),
  );

/** Queues a failed message again (notifications:execute). */
export const retryMessageForIT = (token: string, id: string) =>
  unwrap(
    userClient<paths>(token).POST("/v1/notify/desk/messages/{id}/retry", {
      params: { path: { id } },
    }),
  );

/** Sends a short test message (notifications:execute). */
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
