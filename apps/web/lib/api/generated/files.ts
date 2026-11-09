
export interface paths {
    "/v1/files/uploads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["registerUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/files/uploads/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["writeUpload"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/files/uploads/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["verifyUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/files/uploads/claim": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["claimUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/files/uploads/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["importUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/files/records": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["lookupFiles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/files/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["readFile"];
        put: operations["storeFile"];
        post?: never;
        delete: operations["deleteFile"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        RegisterUpload: {
            ownerId: string;
            folder: string;
            fileName: string;
            mimeType: string;
            fileSize: number;
        };
        UploadRef: {
            fileUrl: string;
            ownerId: string;
        };
        ClaimUpload: {
            fileUrl: string;
            ownerId: string;
            requirePrivate?: boolean;
        };
        File: {
            id: string;
            fileUrl: string;
            ownerId?: string;
            fileName: string;
            fileSize: number;
            mimeType: string;
            isPublic: boolean;
            claimedAt?: string;
            expiresAt: string;
            createdAt: string;
        };
        Problem: {
            type: string;
            title: string;
            status: number;
            detail?: string;
            instance?: string;
            code: string;
            requestId?: string;
            extra?: Record<string, never>;
            errors?: {
                field: string;
                code: string;
            }[];
        };
    };
    responses: {
        File: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["File"];
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
        FileUrl: string;
        OwnerId: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    registerUpload: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterUpload"];
            };
        };
        responses: {
            201: components["responses"]["File"];
            default: components["responses"]["Problem"];
        };
    };
    writeUpload: {
        parameters: {
            query: {
                fileUrl: components["parameters"]["FileUrl"];
                ownerId: components["parameters"]["OwnerId"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/octet-stream": string;
            };
        };
        responses: {
            200: components["responses"]["File"];
            default: components["responses"]["Problem"];
        };
    };
    verifyUpload: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UploadRef"];
            };
        };
        responses: {
            200: components["responses"]["File"];
            default: components["responses"]["Problem"];
        };
    };
    claimUpload: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClaimUpload"];
            };
        };
        responses: {
            200: components["responses"]["File"];
            default: components["responses"]["Problem"];
        };
    };
    importUpload: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    ownerId: string;
                    folder: string;
                    url: string;
                };
            };
        };
        responses: {
            201: components["responses"]["File"];
            default: components["responses"]["Problem"];
        };
    };
    lookupFiles: {
        parameters: {
            query: {
                fileUrl: string[];
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
                        items: components["schemas"]["File"][];
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    readFile: {
        parameters: {
            query: {
                fileUrl: components["parameters"]["FileUrl"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    "X-File-Public"?: boolean;
                    "X-File-Name"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "*/*": string;
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    storeFile: {
        parameters: {
            query?: {
                fileUrl?: string;
                folder?: string;
                namePrefix?: string;
                ownerId?: string;
                fileName?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/octet-stream": string;
            };
        };
        responses: {
            201: components["responses"]["File"];
            default: components["responses"]["Problem"];
        };
    };
    deleteFile: {
        parameters: {
            query: {
                fileUrl: components["parameters"]["FileUrl"];
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
