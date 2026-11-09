import { publishHint } from "@platform/api-client";
import { resourceTopic, STAFF_TOPIC } from "./inbox";

export async function announceChange(
  resource: string,
  id?: string,
  also: {
    everyone?: boolean;
    topics?: string[];
    users?: { realm: "staff" | "it"; id: string }[];
    event?: string;
  } = {},
) {
  try {
    await publishHint({
      type: "entity.changed",
      topics: [also.everyone ? STAFF_TOPIC : resourceTopic(resource), ...(also.topics ?? [])],
      users: also.users,
      data: { resource, ...(id ? { id } : {}), ...(also.event ? { event: also.event } : {}) },
    });
  } catch (error) {
    console.error("Announcing a change to the realtime service failed:", error);
  }
}
