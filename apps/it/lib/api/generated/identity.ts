

export interface paths {
    "/v1/identity/staff/access": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getStaffAccess"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listIdentitySessionsForIT"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;

        delete: operations["revokeIdentitySessionForIT"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/it-accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listITAccounts"];
        put?: never;

        post: operations["createITAccount"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/it-accounts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        get?: never;

        put: operations["updateITAccount"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/.well-known/jwks.json": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["identityJWKS"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["validateIdentitySession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/mfa/enrollment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["beginMFAEnrollment"];

        delete: operations["cancelMFAEnrollment"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/mfa/enrollment/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["confirmMFAEnrollment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/mfa/disable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["disableMFA"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/{realm}/sessions/login": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["Realm"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["loginIdentitySession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/{realm}/sessions/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["Realm"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["refreshIdentitySession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/{realm}/sessions/logout": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["Realm"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["logoutIdentitySession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/{realm}/accounts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
                id: string;
            };
            cookie?: never;
        };
        get?: never;

        put: operations["syncManagedAccount"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/{realm}/accounts/{id}/password": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
                id: string;
            };
            cookie?: never;
        };
        get?: never;

        put: operations["setManagedAccountPassword"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/{realm}/accounts/{id}/mfa": {
        parameters: {
            query?: {
                actorId?: string;
            };
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
                id: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;

        delete: operations["resetManagedAccountMFA"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/{realm}/password-resets": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["requestPasswordReset"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/{realm}/password-resets/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["confirmPasswordReset"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getOwnAccountSecurity"];
        put?: never;
        post?: never;

        delete: operations["deleteOwnCustomerAccount"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/me/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listOwnSessions"];
        put?: never;
        post?: never;

        delete: operations["revokeOtherOwnSessions"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/me/sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;

        delete: operations["revokeOwnSession"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/me/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;

        put: operations["changeOwnPassword"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/customer/oauth/providers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["customerSignInProviders"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/customer/oauth/{provider}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: "google" | "apple";
            };
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["beginCustomerOAuth"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/customer/oauth/{provider}/complete": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: "google" | "apple";
            };
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["completeCustomerOAuth"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/customer/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["registerCustomerAccount"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/customer/sign-in-codes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["issueCustomerSignInCode"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/customer/sessions/code": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["signInCustomerWithCode"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/staff-accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listStaffAccountsForIT"];
        put?: never;

        post: operations["createStaffAccountForIT"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/staff-accounts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getStaffAccountForIT"];

        put: operations["updateStaffAccountForIT"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/staff-accounts/{id}/access": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["copyStaffAccessForIT"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/staff-accounts/{id}/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["inviteStaffAccountForIT"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/staff-accounts/{id}/mfa": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;

        delete: operations["resetStaffMFAForIT"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/staff-access/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["previewStaffAccessForIT"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/staff-roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listStaffRolesForIT"];
        put?: never;

        post: operations["createStaffRoleForIT"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/desk/staff-roles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;

        put: operations["updateStaffRoleForIT"];
        post?: never;

        delete: operations["deleteStaffRoleForIT"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/staff/accounts/{id}/access": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getStaffAccessForAccount"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/identity/{realm}/password-policy": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
            };
            cookie?: never;
        };

        get: operations["getPasswordPolicy"];
        put?: never;
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
        OwnSession: {

            id: string;

            createdAt: string;

            expiresAt: string;
            userAgent: string | null;
            clientIp: string | null;
            current: boolean;
        };
        DeskSession: {

            id: string;

            realm: "staff" | "customer" | "it";
            subjectId: string;

            email: string | null;

            createdAt: string;

            expiresAt: string;

            revokedAt: string | null;
        };
        ITRole: string;
        ITAccount: {
            id: string;

            email: string;
            roles: string[];
            active: boolean;
            mfaEnabled: boolean;
            reportingTo?: string | null;
            reportingToEmail?: string | null;

            createdAt: string;

            lastLoginAt: string | null;
        };
        ITProvisioning: {
            subjectId: string;
            secret: string;

            otpAuthUrl: string;
            recoveryCodes: string[];
        };
        SessionCredential: {

            sessionId: string;
            subjectId: string;

            realm: "staff" | "customer" | "it";

            expiresAt: string;
            refreshToken: string;
        };
        LoginCredential: {

            sessionId: string;
            subjectId: string;

            realm: "staff" | "customer" | "it";

            expiresAt: string;
            refreshToken: string;
            accessToken: string;
            roles: string[];
        };
        Problem: {
            type: string;
            title: string;
            status: number;
            code: string;
            instance?: string;
        };
        StaffDraft: {

            email: string;
            displayName: string;
            role: string;
            active: boolean;
            overrides?: {
                [key: string]: boolean;
            };
            dataScopes?: {
                [key: string]: "own" | "department" | "all";
            };
            copiedFrom?: string;
        };
        StaffAccessTemplate: {
            role: string;
            overrides: {
                [key: string]: boolean;
            };
            dataScopes: {
                [key: string]: "own" | "department" | "all";
            };
        };
        StaffRoleDraft: {
            id: string;
            nameEn: string;
            nameAr: string;
            system?: boolean;
            grants: {
                [key: string]: boolean;
            };
            dataScopes: {
                [key: string]: "own" | "department" | "all";
            };
        };
        StaffDeskAccount: {
            id: string;
            email: string;
            roles: string[];
            active: boolean;
            mfaEnabled: boolean;

            createdAt: string;

            lastLoginAt: string | null;
            displayName: string;
        };
        StaffAccessPreview: {
            subjectId: string;
            role: string;
            permissions: {
                [key: string]: boolean;
            };
            dataScopes: {
                [key: string]: "own" | "department" | "all";
            };
        };
        StaffInvitation: {

            email: string;
            subjectId: string;
            token: string;

            expiresAt: string;
        };
        StaffDeskPage: {
            items: components["schemas"]["StaffDeskAccount"][];
            nextCursor: string;
        };
        StaffRolePage: {
            items: components["schemas"]["StaffRoleDraft"][];
            nextCursor: string;
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
    };
    parameters: {
        Realm: "staff" | "customer" | "it";
        ManagedRealm: "staff" | "customer" | "it";
    };
    requestBodies: {
        MFAPassword: {
            content: {
                "application/json": {
                    password: string;
                };
            };
        };
        MFAConfirmation: {
            content: {
                "application/json": {
                    password: string;
                    code: string;
                    currentCode?: string;
                };
            };
        };
        RefreshCredential: {
            content: {
                "application/json": {

                    refreshToken: string;
                };
            };
        };
    };
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getStaffAccess: {
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
                        subjectId: string;
                        role: string;
                        permissions: {
                            [key: string]: boolean;
                        };
                        dataScopes: {

                            deals: "own" | "department" | "all";

                            requests: "own" | "department" | "all";

                            expenses: "own" | "department" | "all";

                            claims: "own" | "department" | "all";

                            leave: "own" | "department" | "all";
                        };
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    listIdentitySessionsForIT: {
        parameters: {
            query?: {
                realm?: "staff" | "customer" | "it";
                subjectId?: string;
                cursor?: string;
                limit?: number;
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
                        items: components["schemas"]["DeskSession"][];
                        nextCursor: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    revokeIdentitySessionForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
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
    listITAccounts: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
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
                        items: components["schemas"]["ITAccount"][];
                        nextCursor: string;
                        passwordMinLength: number;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    createITAccount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {

                    email: string;
                    password: string;
                    role: components["schemas"]["ITRole"];
                };
            };
        };
        responses: {

            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ITProvisioning"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    updateITAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    role: components["schemas"]["ITRole"];
                    active: boolean;
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
    identityJWKS: {
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
                        keys: Record<string, never>[];
                    };
                };
            };
        };
    };
    validateIdentitySession: {
        parameters: {
            query?: never;
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

            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    beginMFAEnrollment: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["MFAPassword"];
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        secret: string;

                        digits: 6 | 8;
                        periodSeconds: number;

                        expiresAt: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    cancelMFAEnrollment: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["MFAPassword"];
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
    confirmMFAEnrollment: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["MFAConfirmation"];
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        recoveryCodes: string[];
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    disableMFA: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: components["requestBodies"]["MFAConfirmation"];
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
    loginIdentitySession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["Realm"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    email: string;
                    password: string;
                    otp?: string;
                    clientIp?: string;

                    userAgent?: string;
                };
            };
        };
        responses: {

            200: {
                headers: {
                    "Cache-Control"?: "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LoginCredential"];
                };
            };

            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    refreshIdentitySession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["Realm"];
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RefreshCredential"];
        responses: {

            200: {
                headers: {
                    "Cache-Control"?: "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionCredential"] | components["schemas"]["LoginCredential"];
                };
            };

            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    logoutIdentitySession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["Realm"];
            };
            cookie?: never;
        };
        requestBody: components["requestBodies"]["RefreshCredential"];
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
    syncManagedAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    email: string;
                    roles?: string[];
                    active: boolean;

                    actorId?: string;
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
                        created: boolean;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    setManagedAccountPassword: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    password: string;
                    keepSessionId?: string;
                    actorId?: string;
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
    resetManagedAccountMFA: {
        parameters: {
            query?: {
                actorId?: string;
            };
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
                id: string;
            };
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
    requestPasswordReset: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    clientIp?: string;
                    email: string;
                };
            };
        };
        responses: {

            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {

                        email: string;
                        subjectId: string;
                        token: string;

                        expiresAt: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    confirmPasswordReset: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    clientIp?: string;

                    email?: string;
                    token: string;
                    password: string;
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
                        subjectId: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getOwnAccountSecurity: {
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
                        email: string;
                        mfaEnabled: boolean;
                        recoveryCodesLeft: number;
                        hasPassword: boolean;
                        google: boolean;
                        apple: boolean;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    deleteOwnCustomerAccount: {
        parameters: {
            query?: never;
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
    listOwnSessions: {
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
                        items: components["schemas"]["OwnSession"][];
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    revokeOtherOwnSessions: {
        parameters: {
            query?: never;
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
    revokeOwnSession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
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
    changeOwnPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    currentPassword: string;
                    newPassword: string;
                    code?: string;
                    clientIp?: string;
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
    customerSignInProviders: {
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
                        google: boolean;
                        apple: boolean;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    beginCustomerOAuth: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: "google" | "apple";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    redirectUri: string;
                    next: string;

                    locale: "en" | "ar";
                    clientIp?: string;
                };
            };
        };
        responses: {

            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        state: string;
                        authorizationUrl: string;

                        expiresAt: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    completeCustomerOAuth: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: "google" | "apple";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    state: string;
                    browserState: string;
                    code?: string;
                    otp?: string;
                    name?: string;
                    clientIp?: string;
                    userAgent?: string;
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
                        email: string;
                        name: string;
                        next: string;
                        locale: string;
                        credential: components["schemas"]["LoginCredential"];
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    registerCustomerAccount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    clientIp?: string;
                    email: string;
                    password: string;
                };
            };
        };
        responses: {

            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        subjectId: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    issueCustomerSignInCode: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    email: string;
                    clientIp?: string;
                };
            };
        };
        responses: {

            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;

                        expiresAt: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    signInCustomerWithCode: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    email: string;
                    code: string;
                    otp?: string;
                    clientIp?: string;
                    userAgent?: string;
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
                        email: string;
                        credential: components["schemas"]["LoginCredential"];
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    listStaffAccountsForIT: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
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
                    "application/json": components["schemas"]["StaffDeskPage"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    createStaffAccountForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StaffDraft"];
            };
        };
        responses: {

            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        subjectId: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getStaffAccountForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffDraft"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    updateStaffAccountForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StaffDraft"];
            };
        };
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        subjectId: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    copyStaffAccessForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffAccessTemplate"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    inviteStaffAccountForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {

            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffInvitation"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    resetStaffMFAForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
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
    previewStaffAccessForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StaffAccessTemplate"];
            };
        };
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffAccessPreview"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    listStaffRolesForIT: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
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
                    "application/json": components["schemas"]["StaffRolePage"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    createStaffRoleForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StaffRoleDraft"];
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
    updateStaffRoleForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StaffRoleDraft"];
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
    deleteStaffRoleForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
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
    getStaffAccessForAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StaffAccessPreview"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getPasswordPolicy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                realm: components["parameters"]["ManagedRealm"];
            };
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
                        minLength: number;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
}
