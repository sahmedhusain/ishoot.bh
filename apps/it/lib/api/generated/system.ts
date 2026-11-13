

export interface paths {
    "/v1/system/modules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listModules"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/modules/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: components["parameters"]["ModuleKey"];
            };
            cookie?: never;
        };
        get?: never;
        put: operations["setModule"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/integrations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listIntegrations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/sign-in/{provider}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getSignInConfiguration"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/integrations/{provider}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: components["parameters"]["ProviderId"];
            };
            cookie?: never;
        };
        get: operations["getIntegration"];
        put: operations["setIntegration"];
        post?: never;
        delete: operations["unlinkIntegration"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/integrations/{provider}/status": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: components["parameters"]["ProviderId"];
            };
            cookie?: never;
        };
        get?: never;
        put: operations["updateIntegrationStatus"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/modules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listModulesForIT"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/modules/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: components["parameters"]["ModuleKey"];
            };
            cookie?: never;
        };
        get?: never;

        put: operations["setModuleForIT"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/integrations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listIntegrationsForIT"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/integrations/{provider}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: components["parameters"]["ProviderId"];
            };
            cookie?: never;
        };
        get?: never;

        put: operations["setIntegrationForIT"];
        post?: never;

        delete: operations["unlinkIntegrationForIT"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/site": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getSite"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/site/domains": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;

        put: operations["setSiteDomains"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/site/domains": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getSiteDomainsForIT"];

        put: operations["setSiteDomainsForIT"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/site/code": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getSiteCodeForIT"];

        put: operations["setSiteCodeForIT"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/company": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getCompanyConfiguration"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/company/currency-use": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["markCompanyCurrencyUsed"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/sequences/{kind}/reservations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["reserveDocumentNumber"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/company": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getCompanyConfigurationForIT"];

        put: operations["updateCompanyConfigurationForIT"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/setup/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;

        post: operations["completeCompanySetupForIT"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/company/assets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["listCompanyAssetsForIT"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/company/assets/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        get?: never;

        put: operations["saveCompanyAssetForIT"];
        post?: never;

        delete: operations["deleteCompanyAssetForIT"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/setup/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getCompanySetupStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/desk/setup/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };

        get: operations["getCompanySetupStatusForIT"];
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
        Module: {
            key: string;
            nameEn: string;
            nameAr: string;
            enabledByDefault: boolean;
            enabled: boolean;

            updatedBy?: string;

            updatedAt?: string;
        };
        SecretHint: {
            set: boolean;
            hint: string;
        };
        DeskIntegration: {
            provider: string;
            isActive: boolean;
            healthStatus: string;
            accountName?: string | null;
            lastError?: string | null;

            lastCheckedAt?: string | null;

            lastSyncedAt?: string | null;
            values: {
                [key: string]: string;
            };
            secrets: {
                [key: string]: components["schemas"]["SecretHint"];
            };
            config: {
                [key: string]: unknown;
            };
            updatedBy?: string | null;

            updatedAt?: string | null;
        };
        ServiceIntegration: {
            provider: string;
            isActive: boolean;
            healthStatus: string;
            accountName?: string | null;
            lastError?: string | null;

            lastCheckedAt?: string | null;

            lastSyncedAt?: string | null;
            credentials: {
                [key: string]: string;
            };
            config: {
                [key: string]: unknown;
            };
            updatedBy?: string | null;

            updatedAt?: string | null;
        };
        SaveIntegrationServiceInput: {
            isActive: boolean;
            values?: {
                [key: string]: string;
            };
            config?: {
                [key: string]: unknown;
            };
            actorId: string;
        };
        SaveIntegrationITInput: {
            isActive: boolean;
            values?: {
                [key: string]: string;
            };
            config?: {
                [key: string]: unknown;
            };
        };
        UpdateIntegrationStatusInput: {
            healthStatus?: string;
            lastError?: string | null;
            accountName?: string | null;

            lastCheckedAt?: string | null;

            lastSyncedAt?: string | null;
            config?: {
                [key: string]: unknown;
            };
            refreshedCredentials?: {
                [key: string]: string;
            };
            syncLeaseToken?: string | null;

            syncLeaseUntil?: string | null;
        };
        Changed: {

            updatedBy?: string;

            updatedAt?: string;
        };
        SiteDomainsInput: {

            websiteDomain: string;

            adminDomain: string;

            storeDomain?: string;
        };
        SiteDomains: components["schemas"]["Changed"] & {

            websiteDomain: string;

            adminDomain: string;

            storeDomain?: string;
        };
        SiteCode: {

            googleAnalyticsId: string;

            metaPixelId: string;

            tiktokPixelId: string;
            headHtml: string;
            bodyHtml: string;
        };
        Site: components["schemas"]["Changed"] & {
            websiteDomain: string;
            adminDomain: string;
            storeDomain?: string;
            code: components["schemas"]["SiteCode"];
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
        CompanyFontFile: {
            weight: number;
            url: string;
        };
        CompanyFont: {

            kind: "system";
        } | {

            kind: "google";
            family: string;
        } | {

            kind: "upload";
            family: string;
            files: components["schemas"]["CompanyFontFile"][];
        };
        CompanyTheme: {
            primary: string;
            accent: string;
            fonts: {
                body: components["schemas"]["CompanyFont"];
                heading: components["schemas"]["CompanyFont"];
            };

            radius: "none" | "sm" | "md" | "lg" | "xl";

            defaultMode: "light" | "dark" | "system";

            buttonShape: "square" | "rounded" | "pill";

            fontScale: "sm" | "md" | "lg";

            headingWeight: 400 | 500 | 600 | 700 | 800;

            headingCase: "normal" | "uppercase";

            surface: "tinted" | "neutral";

            websiteMode: "dark" | "light";
        };
        CompanyRecord: {
            websitePublished: boolean;
            id: string;
            companyNameEn: string;
            companyNameAr: string;
            crNumber: string | null;
            vatId: string | null;
            vatEnabled: boolean;
            vatPercentage: string | number;
            vatCertificateUrl: string | null;
            defaultCurrency: string;
            currencyDecimals: number;
            addressEn: string | null;
            addressAr: string | null;
            phone: string | null;
            whatsappPhone: string | null;
            email: string | null;
            website: string | null;
            instagramUrl: string | null;
            linkedinUrl: string | null;
            youtubeUrl: string | null;
            bankName: string | null;
            bankIban: string | null;
            bankAccountNumber: string | null;
            bankSwift: string | null;
            timeZone: string | null;
            logoUrl: string | null;
            darkLogoUrl: string | null;
            fullLogoUrl: string | null;
            darkFullLogoUrl: string | null;
            iconUrl: string | null;
            darkIconUrl: string | null;
            documentHeaderUrl: string | null;
            documentFooterUrl: string | null;
            stampUrl: string | null;
            signatureUrl: string | null;
            paymentTermsDays: number;
            invoicePrefix: string;
            invoiceNextNumber: number;
            receiptPrefix: string;
            receiptNextNumber: number;
            ceoNameEn: string | null;
            ceoNameAr: string | null;
            ceoTitleEn: string | null;
            ceoTitleAr: string | null;
            ceoQuoteEn: string | null;
            ceoQuoteAr: string | null;
            missionEn: string | null;
            missionAr: string | null;
            visionEn: string | null;
            visionAr: string | null;
            aboutTextEn: string | null;
            aboutTextAr: string | null;
            termsEn: string | null;
            termsAr: string | null;
            rulesEn: string | null;
            rulesAr: string | null;

            updatedAt: string;
            defaultDiscountLimitPercent: string | number;
            quotationsAlwaysNeedApproval: boolean;
            theme: components["schemas"]["CompanyTheme"] | null;

            setupCompletedAt: string | null;
            contentLanguages: ("ar" | "en")[];
            primaryLanguage: string;
            businessActivity: string | null;
            taglineEn: string | null;
            taglineAr: string | null;
            foundedYear: number | null;
            city: string | null;
            country: string | null;
            mapUrl: string | null;
            currencyLocked: boolean;
            revision: number;
        };
        CompanyPatch: {
            companyNameEn?: string;
            companyNameAr?: string;
            crNumber?: string | null;
            vatId?: string | null;
            vatEnabled?: boolean;
            vatPercentage?: string | number;
            vatCertificateUrl?: string | null;
            defaultCurrency?: string;
            addressEn?: string | null;
            addressAr?: string | null;
            phone?: string | null;
            whatsappPhone?: string | null;
            email?: string | null;
            website?: string | null;
            instagramUrl?: string | null;
            linkedinUrl?: string | null;
            youtubeUrl?: string | null;
            bankName?: string | null;
            bankIban?: string | null;
            bankAccountNumber?: string | null;
            bankSwift?: string | null;
            timeZone?: string | null;
            logoUrl?: string | null;
            darkLogoUrl?: string | null;
            fullLogoUrl?: string | null;
            darkFullLogoUrl?: string | null;
            iconUrl?: string | null;
            darkIconUrl?: string | null;
            documentHeaderUrl?: string | null;
            documentFooterUrl?: string | null;
            stampUrl?: string | null;
            signatureUrl?: string | null;
            paymentTermsDays?: number;
            invoicePrefix?: string;
            invoiceNextNumber?: number;
            receiptPrefix?: string;
            receiptNextNumber?: number;
            ceoNameEn?: string | null;
            ceoNameAr?: string | null;
            ceoTitleEn?: string | null;
            ceoTitleAr?: string | null;
            ceoQuoteEn?: string | null;
            ceoQuoteAr?: string | null;
            missionEn?: string | null;
            missionAr?: string | null;
            visionEn?: string | null;
            visionAr?: string | null;
            aboutTextEn?: string | null;
            aboutTextAr?: string | null;
            termsEn?: string | null;
            termsAr?: string | null;
            rulesEn?: string | null;
            rulesAr?: string | null;
            defaultDiscountLimitPercent?: string | number;
            quotationsAlwaysNeedApproval?: boolean;
            theme?: components["schemas"]["CompanyTheme"] | null;
            contentLanguages?: ("ar" | "en")[];
            primaryLanguage?: string;
            businessActivity?: string | null;
            taglineEn?: string | null;
            taglineAr?: string | null;
            foundedYear?: number | null;
            city?: string | null;
            country?: string | null;
            mapUrl?: string | null;
        };
        CompanyPatchBody: {
            values: components["schemas"]["CompanyPatch"];
        };
        CompanyAsset: {
            id: string;
            assetKey: string;
            title: string;
            fileUrl: string;
            mimeType: string | null;
            fileSize: number | null;

            createdAt: string;

            updatedAt: string;
        };
        CompanyAssetPage: {
            items: components["schemas"]["CompanyAsset"][];
        };
        CompanyAssetInput: {
            title: string;
            fileUrl: string;
        };
        NumberReservationInput: {
            idempotencyKey: string;

            documentDate: string;
        };
        NumberReservation: {
            number: string;
        };
        CompanySetupStatus: {
            complete: boolean;
            missing: string[];
            finished: boolean;
        };
    };
    responses: {

        Modules: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    items: components["schemas"]["Module"][];
                };
            };
        };

        Integrations: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    items: components["schemas"]["ServiceIntegration"][];
                };
            };
        };

        Integration: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ServiceIntegration"];
            };
        };

        DeskIntegrations: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    items: components["schemas"]["DeskIntegration"][];
                };
            };
        };

        DeskIntegration: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["DeskIntegration"];
            };
        };

        SiteDomains: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["SiteDomains"];
            };
        };

        SiteCode: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["SiteCode"] & components["schemas"]["Changed"];
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
        ModuleKey: string;
        ProviderId: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    listModules: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Modules"];
            default: components["responses"]["Problem"];
        };
    };
    setModule: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: components["parameters"]["ModuleKey"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    enabled: boolean;
                    actorId: string;
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
    listIntegrations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Integrations"];
            default: components["responses"]["Problem"];
        };
    };
    getSignInConfiguration: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: "google" | "apple";
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
                        active: boolean;
                        values: {
                            [key: string]: string;
                        };
                        websiteDomain: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getIntegration: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: components["parameters"]["ProviderId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Integration"];
            default: components["responses"]["Problem"];
        };
    };
    setIntegration: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: components["parameters"]["ProviderId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveIntegrationServiceInput"];
            };
        };
        responses: {
            200: components["responses"]["Integration"];
            default: components["responses"]["Problem"];
        };
    };
    unlinkIntegration: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: components["parameters"]["ProviderId"];
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
    updateIntegrationStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: components["parameters"]["ProviderId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateIntegrationStatusInput"];
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
    listModulesForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["Modules"];
            default: components["responses"]["Problem"];
        };
    };
    setModuleForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: components["parameters"]["ModuleKey"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    enabled: boolean;
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
    listIntegrationsForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["DeskIntegrations"];
            default: components["responses"]["Problem"];
        };
    };
    setIntegrationForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: components["parameters"]["ProviderId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveIntegrationITInput"];
            };
        };
        responses: {
            200: components["responses"]["DeskIntegration"];
            default: components["responses"]["Problem"];
        };
    };
    unlinkIntegrationForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: components["parameters"]["ProviderId"];
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
    getSite: {
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
                    "application/json": components["schemas"]["Site"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    setSiteDomains: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SiteDomainsInput"] & {
                    actorId: string;
                };
            };
        };
        responses: {
            200: components["responses"]["SiteDomains"];
            default: components["responses"]["Problem"];
        };
    };
    getSiteDomainsForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["SiteDomains"];
            default: components["responses"]["Problem"];
        };
    };
    setSiteDomainsForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SiteDomainsInput"];
            };
        };
        responses: {
            200: components["responses"]["SiteDomains"];
            default: components["responses"]["Problem"];
        };
    };
    getSiteCodeForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["SiteCode"];
            default: components["responses"]["Problem"];
        };
    };
    setSiteCodeForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SiteCode"];
            };
        };
        responses: {
            200: components["responses"]["SiteCode"];
            default: components["responses"]["Problem"];
        };
    };
    getCompanyConfiguration: {
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
                    "application/json": components["schemas"]["CompanyRecord"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    markCompanyCurrencyUsed: {
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
    reserveDocumentNumber: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                kind: "invoice" | "receipt";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NumberReservationInput"];
            };
        };
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NumberReservation"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getCompanyConfigurationForIT: {
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
                    "application/json": components["schemas"]["CompanyRecord"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    updateCompanyConfigurationForIT: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CompanyPatchBody"];
            };
        };
        responses: {

            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CompanyRecord"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    completeCompanySetupForIT: {
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
                    "application/json": components["schemas"]["CompanyRecord"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    listCompanyAssetsForIT: {
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
                    "application/json": components["schemas"]["CompanyAssetPage"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    saveCompanyAssetForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CompanyAssetInput"];
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
    deleteCompanyAssetForIT: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                key: string;
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
    getCompanySetupStatus: {
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
                    "application/json": components["schemas"]["CompanySetupStatus"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getCompanySetupStatusForIT: {
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
                    "application/json": components["schemas"]["CompanySetupStatus"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
}
