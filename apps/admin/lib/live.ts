// Tells other people's open pages that records changed (docs/adr/0012), for domains still kept in Prisma. The hint
// carries the resource and record ID only; their pages fetch again through the app, which checks permissions.
import { publishHint } from "@platform/api-client";
import { resourceTopic, STAFF_TOPIC } from "./inbox";

/**
 * Everyone who may read the resource sees their open pages refresh; `everyone` reaches all staff instead (for records
 * that are not one permission's, such as approvals). Never fails the change itself.
 */
export async function announceChange(
  resource: string,
  id?: string,
  also: {
    everyone?: boolean;
    topics?: string[];
    users?: { realm: "staff" | "it"; id: string }[];
    /** What happened, when listeners react differently (e.g. "created" rings at the IT desk). */
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
