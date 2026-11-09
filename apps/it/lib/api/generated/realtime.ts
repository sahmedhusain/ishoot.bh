

export interface paths {
    "/v1/realtime/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["openStream"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/realtime/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["publishHint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/realtime/presence": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getPresence"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/realtime/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getMyStatus"];
        put: operations["setMyStatus"];
        post?: never;

        delete: operations["clearMyStatus"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/realtime/activity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["reportActivity"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/realtime/windows": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;

        put: operations["replaceWindow"];
        post?: never;

        delete: operations["removeWindow"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/realtime/windows/sync": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["syncWindows"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/realtime/me/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["openMyStream"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/realtime/me/presence": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getITPresence"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/realtime/me/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getITStatus"];
        put: operations["setITStatus"];
        post?: never;
        delete: operations["clearITStatus"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/realtime/me/activity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["reportITActivity"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Presence: {
            userId: string;
            status: string;

            source: "manual" | "leave" | "calendar" | "connection";

            connection: "online" | "idle" | "offline";
            message: string | null;

            until: string | null;

            lastSeenAt: string | null;
        };
        WindowInput: {
            sourceId: string;

            kind: "meeting" | "leave" | "sick";

            startsAt: string;

            endsAt: string;
            userIds: string[];
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

        PresenceList: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    items: components["schemas"]["Presence"][];
                };
            };
        };

        Mine: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    presence: components["schemas"]["Presence"];
                    chosen: {
                        status: string;
                        message: string | null;

                        expiresAt: string | null;
                    } | null;
                    upcoming: {
                        kind: string;
                        status: string;
                        source: string;

                        startsAt: string;

                        endsAt: string;
                    }[];
                };
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
    };
    parameters: {
        Realm: "staff" | "it";
        UserId: string;

        Ids: string;
    };
    requestBodies: {
        Status: {
            content: {
                "application/json": {

                    status: string;

                    message?: string | null;

                    expiresAt?: string | null;
                };
            };
        };
        Activity: {
            content: {
                "application/json": {

                    state: "active" | "idle";
                };
            };
        };
    };
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    openStream: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];

                topics?: string;

                session?: string;
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
                    "text/event-stream": string;
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    publishHint: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    topics?: string[];
                    users?: {

                        realm: "staff" | "it";
                        id: string;
                    }[];

                    type: string;

                    data?: {
                        [key: string]: unknown;
                    };
                };
            };
        };
        responses: {

            202: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: components["responses"]["Problem"];
        };
    };
    getPresence: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];

                ids?: components["parameters"]["Ids"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["PresenceList"];
            default: components["responses"]["Problem"];
        };
    };
    getMyStatus: {
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
            200: components["responses"]["Mine"];
            default: components["responses"]["Problem"];
        };
    };
    setMyStatus: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["Status"];
        responses: {
            200: components["responses"]["Mine"];
            default: components["responses"]["Problem"];
        };
    };
    clearMyStatus: {
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
            200: components["responses"]["Mine"];
            default: components["responses"]["Problem"];
        };
    };
    reportActivity: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                userId: components["parameters"]["UserId"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["Activity"];
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
    replaceWindow: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WindowInput"] & {

                    realm: "staff" | "it";

                    source: string;
                };
            };
        };
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
    removeWindow: {
        parameters: {
            query: {
                realm: components["parameters"]["Realm"];
                source: string;
                sourceId: string;
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
    syncWindows: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {

                    realm: "staff" | "it";
                    source: string;

                    from: string;

                    until: string;
                    windows: components["schemas"]["WindowInput"][];
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
                        stored: number;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    openMyStream: {
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
                    "text/event-stream": string;
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getITPresence: {
        parameters: {
            query?: {

                ids?: components["parameters"]["Ids"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["PresenceList"];
            default: components["responses"]["Problem"];
        };
    };
    getITStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Mine"];
            default: components["responses"]["Problem"];
        };
    };
    setITStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["Status"];
        responses: {
            200: components["responses"]["Mine"];
            default: components["responses"]["Problem"];
        };
    };
    clearITStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Mine"];
            default: components["responses"]["Problem"];
        };
    };
    reportITActivity: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["Activity"];
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
