

export interface paths {
    "/v1/notify/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["queueMessage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/messages/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getMessageStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/desk/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listMessagesForIT"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/desk/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["messageSummaryForIT"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/desk/messages/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getMessageForIT"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/desk/messages/{id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["retryMessageForIT"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/desk/test": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["sendTestMessageForIT"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/inbox": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listInbox"];
        put?: never;

        post: operations["deliverInApp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/inbox/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["inboxSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/inbox/actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["actOnInbox"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/inbox/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getInboxItem"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getPreferences"];

        put: operations["savePreferences"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/mutes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listMutes"];

        put: operations["muteRecord"];
        post?: never;

        delete: operations["unmuteRecord"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/me/inbox": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listMyInbox"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/me/inbox/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["myInboxSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/me/inbox/actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["actOnMyInbox"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/me/inbox/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getMyInboxItem"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/me/preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getMyPreferences"];
        put: operations["saveMyPreferences"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notify/me/mutes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listMyMutes"];
        put: operations["muteMyRecord"];
        post?: never;
        delete: operations["unmuteMyRecord"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        NewNotification: {

            id?: string;

            realm: "staff" | "it";
            recipient: string;

            category?: string;

            priority?: "low" | "normal" | "high" | "urgent";
            title: string;
            body?: string;

            messageKey?: string;
            messageParams?: {
                [key: string]: string;
            };

            actionUrl?: string;
            entityType?: string;
            entityId?: string;
            actorId?: string;
            dedupeKey?: string;

            deliverAt?: string | null;

            createdAt?: string | null;

            readAt?: string | null;

            archivedAt?: string | null;
        };
        InboxItem: {

            id: string;
            category: string;

            priority: "low" | "normal" | "high" | "urgent";
            title: string;
            body: string;
            messageKey: string | null;
            messageParams: {
                [key: string]: string;
            };
            actionUrl: string | null;
            entityType: string | null;
            entityId: string | null;
            actorId: string | null;

            silent: boolean;
            read: boolean;
            archived: boolean;

            createdAt: string;

            readAt: string | null;
        };
        Preferences: {

            mutedUntil: string | null;
            soundEnabled: boolean;

            sound: "chime" | "ping" | "pop" | "bell" | "alert";
            volume: number;
            popupsEnabled: boolean;
            desktopEnabled: boolean;
            categories: {
                category: string;
                muted: boolean;
                sound: boolean;

                mandatory?: boolean;
            }[];
        };
        QueueMessageInput: {

            channel: "email" | "whatsapp";

            to: string;

            subject?: string;

            text?: string;

            html?: string;

            attachments?: {
                filename: string;
                contentType?: string;
                content: string;
            }[];
            idempotencyKey: string;

            actorId?: string;
        };
        Message: {

            id: string;
            caller: string;
            actor: string | null;

            channel: "email" | "whatsapp";
            recipient: string;
            subject: string | null;

            status: "queued" | "sent" | "failed";
            attempts: number;
            provider: string | null;
            providerId: string | null;
            lastError: string | null;

            createdAt: string;

            sentAt: string | null;

            text?: string | null;

            html?: string | null;

            attachments?: {
                filename: string;
                contentType: string;
                size: number;
            }[];
        };
        Problem: {
            type: string;
            title: string;
            status: number;
            detail?: string;
            instance?: string;
            code: string;
            requestId?: string;
            errors?: {
                field: string;
                code: string;
            }[];
        };
    };
    responses: {

        Message: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Message"];
            };
        };

        Problem: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };

        InboxPage: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    items: components["schemas"]["InboxItem"][];
                    unread: number;
                    nextCursor?: string;
                };
            };
        };

        InboxItem: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["InboxItem"];
            };
        };

        InboxSummary: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    unread: number;
                    byCategory: {
                        [key: string]: number;
                    };
                };
            };
        };

        InboxActionResult: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    changed: number;
                    unread: number;
                };
            };
        };

        Preferences: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Preferences"];
            };
        };

        Mutes: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    items: {
                        entityType: string;
                        entityId: string;

                        until: string | null;

                        createdAt: string;
                    }[];
                };
            };
        };
    };
    parameters: {
        MessageId: string;
        NotificationId: string;
        Realm: "staff" | "it";
        UserId: string;

        Categories: string;
        Filter: "all" | "unread" | "read" | "archived" | "muted";
        Category: string;
        EntityType: string;
        EntityId: string;
    };
    requestBodies: {
        InboxAction: {
            content: {
                "application/json": {

                    action: "read" | "unread" | "archive" | "unarchive" | "delete";
                    ids?: string[];

                    all?: boolean;

                    filter?: "all" | "unread" | "read" | "archived" | "muted";
                    category?: string;
                };
            };
        };
        Preferences: {
            content: {
                "application/json": components["schemas"]["Preferences"];
            };
        };
        Mute: {
            content: {
                "application/json": {
                    entityType: string;
                    entityId: string;

                    until?: string | null;
                };
            };
        };
    };
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    queueMessage: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QueueMessageInput"];
            };
        };
        responses: {
            200: components["responses"]["Message"];
            202: components["responses"]["Message"];
            default: components["responses"]["Problem"];
        };
    };
    getMessageStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["MessageId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Message"];
            default: components["responses"]["Problem"];
        };
    };
    listMessagesForIT: {
        parameters: {
            query?: {
                status?: "queued" | "sent" | "failed";
                channel?: "email" | "whatsapp";
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["Message"][];
                        nextCursor?: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    messageSummaryForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            status: string;
                            channel: string;
                            messages: number;
                        }[];
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getMessageForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["MessageId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Message"];
            default: components["responses"]["Problem"];
        };
    };
    retryMessageForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["MessageId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Message"];
            default: components["responses"]["Problem"];
        };
    };
    sendTestMessageForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {

                    channel: "email" | "whatsapp";
                    to: string;
                };
            };
        };
        responses: {
            202: components["responses"]["Message"];
            default: components["responses"]["Problem"];
        };
    };
    listInbox: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];

                categories?: components["parameters"]["Categories"];
                filter?: components["parameters"]["Filter"];
                category?: components["parameters"]["Category"];
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["InboxPage"];
            default: components["responses"]["Problem"];
        };
    };
    deliverInApp: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    items: components["schemas"]["NewNotification"][];
                };
            };
        };
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        created: number;
                        duplicates: number;
                        ids: string[];
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    inboxSummary: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];

                categories?: components["parameters"]["Categories"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["InboxSummary"];
            default: components["responses"]["Problem"];
        };
    };
    actOnInbox: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];

                categories?: components["parameters"]["Categories"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["InboxAction"];
        responses: {
            200: components["responses"]["InboxActionResult"];
            default: components["responses"]["Problem"];
        };
    };
    getInboxItem: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];

                categories?: components["parameters"]["Categories"];
            };
            header?: never;
            path: {
                id: components["parameters"]["NotificationId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["InboxItem"];
            default: components["responses"]["Problem"];
        };
    };
    getPreferences: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];

                categories?: components["parameters"]["Categories"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Preferences"];
            default: components["responses"]["Problem"];
        };
    };
    savePreferences: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];

                categories?: components["parameters"]["Categories"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["Preferences"];
        responses: {
            200: components["responses"]["Preferences"];
            default: components["responses"]["Problem"];
        };
    };
    listMutes: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Mutes"];
            default: components["responses"]["Problem"];
        };
    };
    muteRecord: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["Mute"];
        responses: {

            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: components["responses"]["Problem"];
        };
    };
    unmuteRecord: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];
                entityType: components["parameters"]["EntityType"];
                entityId: components["parameters"]["EntityId"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {

            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: components["responses"]["Problem"];
        };
    };
    listMyInbox: {
        parameters: {
            query?: {
                filter?: components["parameters"]["Filter"];
                category?: components["parameters"]["Category"];
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["InboxPage"];
            default: components["responses"]["Problem"];
        };
    };
    myInboxSummary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["InboxSummary"];
            default: components["responses"]["Problem"];
        };
    };
    actOnMyInbox: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["InboxAction"];
        responses: {
            200: components["responses"]["InboxActionResult"];
            default: components["responses"]["Problem"];
        };
    };
    getMyInboxItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["NotificationId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["InboxItem"];
            default: components["responses"]["Problem"];
        };
    };
    getMyPreferences: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Preferences"];
            default: components["responses"]["Problem"];
        };
    };
    saveMyPreferences: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["Preferences"];
        responses: {
            200: components["responses"]["Preferences"];
            default: components["responses"]["Problem"];
        };
    };
    listMyMutes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Mutes"];
            default: components["responses"]["Problem"];
        };
    };
    muteMyRecord: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["Mute"];
        responses: {

            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: components["responses"]["Problem"];
        };
    };
    unmuteMyRecord: {
        parameters: {
            query: {
                entityType: components["parameters"]["EntityType"];
                entityId: components["parameters"]["EntityId"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {

            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: components["responses"]["Problem"];
        };
    };
}
