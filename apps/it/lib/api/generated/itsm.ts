

export interface paths {
    "/v1/itsm/requests/tickets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listMyTickets"];
        put?: never;
        post: operations["createTicket"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/itsm/requests/tickets/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        get: operations["getMyTicket"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/itsm/requests/tickets/{id}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["commentOnMyTicket"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/itsm/requests/tickets/{id}/transitions": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["transitionMyTicket"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/itsm/desk/tickets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listQueue"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/itsm/desk/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["queueStats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/itsm/desk/tickets/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };

        get: operations["getQueueTicket"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/itsm/desk/tickets/{id}/transitions": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["transitionQueueTicket"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/itsm/desk/tickets/{id}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["commentOnQueueTicket"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/itsm/desk/sla": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listSLA"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/itsm/desk/sla/{priority}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;

        put: operations["updateSLA"];
        post?: never;
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
        NewTicket: {
            requesterId: string;
            requesterName: string;
            requesterEmail: string;
            category: string;
            subcategory: string;

            priority?: string;
            title: string;
            description: string;

            assetRef?: string;

            attachments?: components["schemas"]["Attachment"][];
        };
        Ticket: {

            id: string;
            number: number;
            requesterId: string;
            requesterName: string;
            requesterEmail?: string;
            category: string;
            subcategory: string;
            priority: string;
            status: string;
            title: string;
            description: string;
            assetRef?: string;
            assigneeId?: string;
            assigneeName?: string;

            respondBy: string;

            resolveBy: string;

            firstResponseAt?: string;
            breached: boolean;

            resolvedAt?: string;

            closedAt?: string;

            remindedAt?: string;

            createdAt: string;

            updatedAt: string;
        };
        TicketDetail: {
            ticket: components["schemas"]["Ticket"];
            comments: components["schemas"]["Comment"][];
            events: {
                kind: string;
                actorRealm: string;

                actorId?: string;
                fromStatus?: string;
                toStatus?: string;

                createdAt: string;
            }[];
            attachments: components["schemas"]["Attachment"][];
        };
        Comment: {

            id: string;
            authorRealm: string;
            authorName: string;
            body: string;
            internal: boolean;

            createdAt: string;
            attachments?: components["schemas"]["Attachment"][];
        };
        Attachment: {
            fileUrl: string;
            fileName: string;
            mimeType: string;
            fileSize: number;

            commentId?: string;
        };
        SLAPolicy: {
            priority: string;
            responseMinutes: number;
            resolveMinutes: number;
            updatedBy?: string;

            updatedAt: string;
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

        Problem: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };

        TicketPage: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    items: components["schemas"]["Ticket"][];
                    nextCursor?: string;
                };
            };
        };

        TicketDetail: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["TicketDetail"];
            };
        };

        Comment: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Comment"];
            };
        };
    };
    parameters: {
        TicketId: string;
        RequesterId: string;
        Status: string;
        Cursor: string;
        Limit: number;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    listMyTickets: {
        parameters: {
            query: {
                requesterId: components["parameters"]["RequesterId"];
                status?: components["parameters"]["Status"];
                cursor?: components["parameters"]["Cursor"];
                limit?: components["parameters"]["Limit"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["TicketPage"];
            default: components["responses"]["Problem"];
        };
    };
    createTicket: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NewTicket"];
            };
        };
        responses: {

            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Ticket"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getMyTicket: {
        parameters: {
            query: {
                requesterId: components["parameters"]["RequesterId"];
            };
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["TicketDetail"];
            default: components["responses"]["Problem"];
        };
    };
    commentOnMyTicket: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    requesterId: string;
                    requesterName: string;
                    body: string;
                    attachments?: components["schemas"]["Attachment"][];
                };
            };
        };
        responses: {
            201: components["responses"]["Comment"];
            default: components["responses"]["Problem"];
        };
    };
    transitionMyTicket: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    requesterId: string;
                    requesterName: string;
                    transition: string;
                };
            };
        };
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Ticket"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    listQueue: {
        parameters: {
            query?: {
                status?: components["parameters"]["Status"];
                assigneeId?: string;
                priority?: string;
                category?: string;

                open?: boolean;
                cursor?: components["parameters"]["Cursor"];
                limit?: components["parameters"]["Limit"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["TicketPage"];
            default: components["responses"]["Problem"];
        };
    };
    queueStats: {
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
                        open: number;
                        breached: number;
                        unassigned: number;
                        byStatus: {
                            [key: string]: number;
                        };
                        byPriority: {
                            [key: string]: number;
                        };
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getQueueTicket: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["TicketDetail"];
            default: components["responses"]["Problem"];
        };
    };
    transitionQueueTicket: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    transition: string;
                    assigneeId?: string;
                    assigneeName?: string;
                };
            };
        };
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Ticket"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    commentOnQueueTicket: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["TicketId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    body: string;
                    internal?: boolean;
                    attachments?: components["schemas"]["Attachment"][];
                };
            };
        };
        responses: {
            201: components["responses"]["Comment"];
            default: components["responses"]["Problem"];
        };
    };
    listSLA: {
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
                        items: components["schemas"]["SLAPolicy"][];
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    updateSLA: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                priority: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    responseMinutes: number;
                    resolveMinutes: number;
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
}
