
export interface paths {
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
    "/v1/audit/desk/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listAuditEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/audit/desk/events/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getAuditEvent"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/audit/desk/subjects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listAuditSubjects"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/articles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listArticles"];
        put?: never;
        post: operations["createArticle"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/articles/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getArticleBySlug"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/articles/id/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getArticleByID"];
        put: operations["updateArticle"];
        post?: never;
        delete: operations["deleteArticle"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/faqs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listFAQs"];
        put?: never;
        post: operations["createFAQ"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/faqs/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["updateFAQ"];
        post?: never;
        delete: operations["deleteFAQ"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/pages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listPages"];
        put?: never;
        post: operations["createPage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/pages/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getPageBySlug"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/pages/id/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getPageByID"];
        put: operations["updatePage"];
        post?: never;
        delete: operations["deletePage"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listReviews"];
        put?: never;
        post: operations["createReview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/reviews/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["updateReview"];
        post?: never;
        delete: operations["deleteReview"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/snapshots/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getContentSnapshot"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/snapshots/{id}/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["saveContentDraft"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/snapshots/{id}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["publishContentSnapshot"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/statistics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listStatistics"];
        put?: never;
        post: operations["upsertStatistic"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/cms/statistics/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["deleteStatistic"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/commerce/coupons": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listCoupons"];
        put?: never;
        post: operations["createCoupon"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/commerce/customers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listCustomers"];
        put?: never;
        post: operations["createCustomer"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/commerce/customers/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getCustomer"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/commerce/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listOrders"];
        put?: never;
        post: operations["placeOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/commerce/orders/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getOrder"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/commerce/orders/{id}/pay": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["recordOrderPayment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/commerce/orders/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["updateOrderStatus"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/delivery/routes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listRouteSheets"];
        put?: never;
        post: operations["createRouteSheet"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/delivery/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getDeliverySettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/delivery/shipments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listShipments"];
        put?: never;
        post: operations["createShipment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/delivery/shipments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getShipment"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/delivery/shipments/{id}/assign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["assignShipmentDriver"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/delivery/shipments/{id}/proof": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["recordProofOfDelivery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/delivery/vehicles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listVehicles"];
        put?: never;
        post: operations["createVehicle"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/delivery/zones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listDeliveryZones"];
        put?: never;
        post: operations["createDeliveryZone"];
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
    "/v1/finance/expense-categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listExpenseCategories"];
        put?: never;
        post: operations["createExpenseCategory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/finance/expense-categories/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["updateExpenseCategory"];
        post?: never;
        delete: operations["deleteExpenseCategory"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/finance/expenses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listExpenses"];
        put?: never;
        post: operations["createExpense"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/finance/expenses/{id}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["approveExpense"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/finance/invoices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listInvoices"];
        put?: never;
        post: operations["createInvoice"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/finance/invoices/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getInvoice"];
        put?: never;
        post?: never;
        delete: operations["deleteInvoice"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/finance/invoices/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["updateInvoiceStatus"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/finance/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listPayments"];
        put?: never;
        post: operations["recordPayment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/finance/settlements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listSettlements"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/hr/departments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listDepartments"];
        put?: never;
        post: operations["createDepartment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/hr/employees": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listEmployees"];
        put?: never;
        post: operations["createEmployee"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/hr/employees/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getEmployee"];
        put?: never;
        post?: never;
        delete: operations["deleteEmployee"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/hr/employees/{id}/offboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["offboardEmployee"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/hr/leave": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listLeaveRequests"];
        put?: never;
        post: operations["createLeaveRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/hr/leave/{id}/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["approveLeaveRequest"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/hr/payroll": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listPayrollRuns"];
        put?: never;
        post: operations["createPayrollRun"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/hr/payroll/{id}/process": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["processPayrollRun"];
        post?: never;
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
    "/v1/inventory/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listCategories"];
        put?: never;
        post: operations["createCategory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/counts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listStockCounts"];
        put?: never;
        post: operations["createStockCount"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listProducts"];
        put?: never;
        post: operations["createProduct"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/products/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getProduct"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/stock/adjust": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["adjustStock"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/stock/movements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listMovements"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/warehouses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listWarehouses"];
        put?: never;
        post: operations["createWarehouse"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/inventory/warehouses/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getWarehouse"];
        put?: never;
        post?: never;
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
    "/v1/sales/contacts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listContacts"];
        put?: never;
        post: operations["createContact"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/sales/contacts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getContact"];
        put: operations["updateContact"];
        post?: never;
        delete: operations["deleteContact"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/sales/deals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listDeals"];
        put?: never;
        post: operations["createDeal"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/sales/deals/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getDeal"];
        put: operations["updateDeal"];
        post?: never;
        delete: operations["deleteDeal"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/sales/deals/{id}/stage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["updateDealStage"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/sales/inquiries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listInquiries"];
        put?: never;
        post: operations["createInquiry"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/sales/inquiries/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getInquiry"];
        put?: never;
        post?: never;
        delete: operations["deleteInquiry"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/sales/inquiries/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["updateInquiryStatus"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/sales/quotations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listQuotations"];
        put?: never;
        post: operations["createQuotation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/sales/quotations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getQuotation"];
        put?: never;
        post?: never;
        delete: operations["deleteQuotation"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/sales/quotations/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["updateQuotationStatus"];
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
        put: operations["updateCompanyConfiguration"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/system/company/assets/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["saveCompanyAsset"];
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
    "/v1/workflow/approvals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listApprovals"];
        put?: never;
        post: operations["createApprovalRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/workflow/approvals/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getApprovalRequest"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/workflow/approvals/{id}/decide": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["decideApproval"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/workflow/calendar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listCalendarEvents"];
        put?: never;
        post: operations["createCalendarEvent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/workflow/signatures": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listSignatures"];
        put?: never;
        post: operations["createSignatureRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/workflow/signatures/{id}/sign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["recordSignature"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/workflow/tasks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listTasks"];
        put?: never;
        post: operations["createTask"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/workflow/tasks/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["updateTaskStatus"];
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
        AdjustStockRequest: {
            locationId: string;
            movementType: string;
            note?: string;
            productId: string;
            quantity: string;
            reason?: string;
            unitCost?: string;
            variantId?: string;
        };
        ApprovalDecision: {
            approverId: string;
            comments?: string | null;
            decidedAt: string;
            decision: string;
            id: string;
            requestId: string;
        };
        ApprovalRequest: {
            createdAt: string;
            entityId: string;
            id: string;
            kind: string;
            priority: string;
            reason?: string | null;
            requesterId: string;
            status: string;
            updatedAt: string;
        };
        ApprovalRequestWithDecisions: components["schemas"]["ApprovalRequest"] & {
            decisions?: components["schemas"]["ApprovalDecision"][];
        };
        Article: {
            authorName?: string | null;
            bodyAr?: {
                [key: string]: unknown;
            } | null;
            bodyEn?: {
                [key: string]: unknown;
            } | null;
            bodyHtmlAr?: string | null;
            bodyHtmlEn?: string | null;
            category: string;
            coverUrl?: string | null;
            createdAt: string;
            excerptAr?: string | null;
            excerptEn?: string | null;
            featured: boolean;
            id: string;
            publishAt?: string | null;
            seoDescriptionAr?: string | null;
            seoDescriptionEn?: string | null;
            seoTitleAr?: string | null;
            seoTitleEn?: string | null;
            slug: string;
            status: string;
            tags: string[];
            titleAr: string;
            titleEn: string;
            updatedAt: string;
        };
        AssignDriverRequest: {
            driverId: string;
            routeSheetId?: string;
            routeStop?: number;
            vehicleId?: string;
        };
        Attachment: {
            commentId?: string;
            fileName: string;
            fileSize: number;
            fileUrl: string;
            mimeType: string;
        };
        AuditEvent: {
            actor: string | null;
            entity: string;
            id: string;
            occurredAt: string;
            payload: {
                [key: string]: unknown;
            };
            receivedAt: string;
            service: string;
            subject: string;
            traceId: string | null;
            verb: string;
        };
        BankSettlement: {
            amount: string;
            bankAccount: string;
            createdAt: string;
            currency: string;
            id: string;
            notes?: string | null;
            settledAt: string;
            settlementNumber: string;
            status: string;
        };
        CalendarEvent: {
            createdAt: string;
            description?: string | null;
            endTime: string;
            eventType: string;
            id: string;
            isAllDay: boolean;
            location?: string | null;
            organizerId: string;
            startTime: string;
            title: string;
        };
        Category: {
            descriptionAr?: string;
            descriptionEn?: string;
            id: string;
            nameAr: string;
            nameEn: string;
            slug: string;
        };
        Changed: {
            updatedAt?: string;
            updatedBy?: string;
        };
        ClaimUpload: {
            fileUrl: string;
            ownerId: string;
            requirePrivate?: boolean;
        };
        Comment: {
            attachments?: components["schemas"]["Attachment"][];
            authorName: string;
            authorRealm: string;
            body: string;
            createdAt: string;
            id: string;
            internal: boolean;
        };
        CommerceRecordPaymentRequest: {
            amountPaid: string;
            paymentStatus: string;
        };
        CompanyAsset: {
            assetKey: string;
            createdAt: string;
            fileSize: number | null;
            fileUrl: string;
            id: string;
            mimeType: string | null;
            title: string;
            updatedAt: string;
        };
        CompanyAssetInput: {
            fileUrl: string;
            title: string;
        };
        CompanyAssetPage: {
            items: components["schemas"]["CompanyAsset"][];
        };
        CompanyAssetServiceBody: {
            actorId: string;
            fileUrl: string;
            title: string;
        };
        CompanyFont: {
            kind: "system";
        } | {
            family: string;
            kind: "google";
        } | {
            family: string;
            files: components["schemas"]["CompanyFontFile"][];
            kind: "upload";
        };
        CompanyFontFile: {
            url: string;
            weight: number;
        };
        CompanyPatch: {
            aboutTextAr?: string | null;
            aboutTextEn?: string | null;
            addressAr?: string | null;
            addressEn?: string | null;
            bankAccountNumber?: string | null;
            bankIban?: string | null;
            bankName?: string | null;
            bankSwift?: string | null;
            businessActivity?: string | null;
            ceoNameAr?: string | null;
            ceoNameEn?: string | null;
            ceoQuoteAr?: string | null;
            ceoQuoteEn?: string | null;
            ceoTitleAr?: string | null;
            ceoTitleEn?: string | null;
            city?: string | null;
            companyNameAr?: string;
            companyNameEn?: string;
            contentLanguages?: ("ar" | "en")[];
            country?: string | null;
            crNumber?: string | null;
            darkFullLogoUrl?: string | null;
            darkIconUrl?: string | null;
            darkLogoUrl?: string | null;
            defaultCurrency?: string;
            defaultDiscountLimitPercent?: string | number;
            documentFooterUrl?: string | null;
            documentHeaderUrl?: string | null;
            email?: string | null;
            foundedYear?: number | null;
            fullLogoUrl?: string | null;
            iconUrl?: string | null;
            instagramUrl?: string | null;
            invoiceNextNumber?: number;
            invoicePrefix?: string;
            linkedinUrl?: string | null;
            logoUrl?: string | null;
            mapUrl?: string | null;
            missionAr?: string | null;
            missionEn?: string | null;
            paymentTermsDays?: number;
            phone?: string | null;
            primaryLanguage?: string;
            quotationsAlwaysNeedApproval?: boolean;
            receiptNextNumber?: number;
            receiptPrefix?: string;
            rulesAr?: string | null;
            rulesEn?: string | null;
            signatureUrl?: string | null;
            stampUrl?: string | null;
            taglineAr?: string | null;
            taglineEn?: string | null;
            termsAr?: string | null;
            termsEn?: string | null;
            theme?: components["schemas"]["CompanyTheme"] | null;
            timeZone?: string | null;
            vatCertificateUrl?: string | null;
            vatEnabled?: boolean;
            vatId?: string | null;
            vatPercentage?: string | number;
            visionAr?: string | null;
            visionEn?: string | null;
            website?: string | null;
            whatsappPhone?: string | null;
            youtubeUrl?: string | null;
        };
        CompanyPatchBody: {
            values: components["schemas"]["CompanyPatch"];
        };
        CompanyPatchServiceBody: {
            actorId: string;
            values: components["schemas"]["CompanyPatch"];
        };
        CompanyRecord: {
            aboutTextAr: string | null;
            aboutTextEn: string | null;
            addressAr: string | null;
            addressEn: string | null;
            bankAccountNumber: string | null;
            bankIban: string | null;
            bankName: string | null;
            bankSwift: string | null;
            businessActivity: string | null;
            ceoNameAr: string | null;
            ceoNameEn: string | null;
            ceoQuoteAr: string | null;
            ceoQuoteEn: string | null;
            ceoTitleAr: string | null;
            ceoTitleEn: string | null;
            city: string | null;
            companyNameAr: string;
            companyNameEn: string;
            contentLanguages: ("ar" | "en")[];
            country: string | null;
            crNumber: string | null;
            currencyDecimals: number;
            currencyLocked: boolean;
            darkFullLogoUrl: string | null;
            darkIconUrl: string | null;
            darkLogoUrl: string | null;
            defaultCurrency: string;
            defaultDiscountLimitPercent: string | number;
            documentFooterUrl: string | null;
            documentHeaderUrl: string | null;
            email: string | null;
            foundedYear: number | null;
            fullLogoUrl: string | null;
            iconUrl: string | null;
            id: string;
            instagramUrl: string | null;
            invoiceNextNumber: number;
            invoicePrefix: string;
            linkedinUrl: string | null;
            logoUrl: string | null;
            mapUrl: string | null;
            missionAr: string | null;
            missionEn: string | null;
            paymentTermsDays: number;
            phone: string | null;
            primaryLanguage: string;
            quotationsAlwaysNeedApproval: boolean;
            receiptNextNumber: number;
            receiptPrefix: string;
            revision: number;
            rulesAr: string | null;
            rulesEn: string | null;
            setupCompletedAt: string | null;
            signatureUrl: string | null;
            stampUrl: string | null;
            taglineAr: string | null;
            taglineEn: string | null;
            termsAr: string | null;
            termsEn: string | null;
            theme: components["schemas"]["CompanyTheme"] | null;
            timeZone: string | null;
            updatedAt: string;
            vatCertificateUrl: string | null;
            vatEnabled: boolean;
            vatId: string | null;
            vatPercentage: string | number;
            visionAr: string | null;
            visionEn: string | null;
            website: string | null;
            websitePublished: boolean;
            whatsappPhone: string | null;
            youtubeUrl: string | null;
        };
        CompanySetupStatus: {
            complete: boolean;
            finished: boolean;
            missing: string[];
        };
        CompanyTheme: {
            accent: string;
            buttonShape: "square" | "rounded" | "pill";
            defaultMode: "light" | "dark" | "system";
            fontScale: "sm" | "md" | "lg";
            fonts: {
                body: components["schemas"]["CompanyFont"];
                heading: components["schemas"]["CompanyFont"];
            };
            headingCase: "normal" | "uppercase";
            headingWeight: 400 | 500 | 600 | 700 | 800;
            primary: string;
            radius: "none" | "sm" | "md" | "lg" | "xl";
            surface: "tinted" | "neutral";
            websiteMode: "dark" | "light";
        };
        Contact: {
            company?: string | null;
            contactType: string;
            createdAt: string;
            email?: string | null;
            firstName: string;
            id: string;
            lastName?: string | null;
            notes?: string | null;
            phone?: string | null;
            status: string;
            tags: string[];
            updatedAt: string;
        };
        ContentSnapshot: {
            draft: {
                [key: string]: unknown;
            };
            id: string;
            published?: {
                [key: string]: unknown;
            } | null;
            publishedAt?: string | null;
            revision: number;
            updatedAt: string;
        };
        Coupon: {
            code: string;
            discountType: string;
            discountValue: string;
            id: string;
            isActive: boolean;
        };
        CreateApprovalRequest: {
            entityId: string;
            kind: string;
            priority: string;
            reason?: string;
            requesterId: string;
        };
        CreateArticleRequest: {
            authorName?: string;
            bodyAr?: {
                [key: string]: unknown;
            };
            bodyEn?: {
                [key: string]: unknown;
            };
            bodyHtmlAr?: string;
            bodyHtmlEn?: string;
            category: string;
            coverUrl?: string;
            excerptAr?: string;
            excerptEn?: string;
            featured: boolean;
            publishAt?: string;
            seoDescriptionAr?: string;
            seoDescriptionEn?: string;
            seoTitleAr?: string;
            seoTitleEn?: string;
            slug: string;
            status: string;
            tags?: string[];
            titleAr: string;
            titleEn: string;
        };
        CreateCalendarEventRequest: {
            description?: string;
            endTime: string;
            eventType: string;
            isAllDay: boolean;
            location?: string;
            organizerId: string;
            startTime: string;
            title: string;
        };
        CreateCategoryRequest: {
            nameAr: string;
            nameEn: string;
            slug: string;
        };
        CreateContactRequest: {
            company?: string;
            contactType: string;
            email?: string;
            firstName: string;
            lastName?: string;
            notes?: string;
            phone?: string;
            status: string;
            tags?: string[];
        };
        CreateCouponRequest: {
            code: string;
            discountType: string;
            discountValue: string;
        };
        CreateCustomerRequest: {
            email?: string;
            firstName: string;
            lastName: string;
            phone?: string;
        };
        CreateDealRequest: {
            assignedTo?: string;
            contactId?: string;
            currency?: string;
            expectedCloseDate?: string;
            notes?: string;
            probability: number;
            stage: string;
            status: string;
            title: string;
            value: string;
        };
        CreateDeliveryZoneRequest: {
            areas?: string[];
            fee: string;
            nameAr: string;
            nameEn: string;
        };
        CreateDepartmentRequest: {
            code: string;
            headId?: string;
            nameAr: string;
            nameEn: string;
            parentId?: string;
        };
        CreateEmployeeRequest: {
            basicSalary: string;
            departmentId?: string;
            email: string;
            employeeNumber: string;
            firstNameAr: string;
            firstNameEn: string;
            hireDate?: string;
            housingAllowance: string;
            jobTitleAr: string;
            jobTitleEn: string;
            lastNameAr: string;
            lastNameEn: string;
            otherAllowances: string;
            phone?: string;
            status: string;
            transportAllowance: string;
        };
        CreateExpenseRequest: {
            amount: string;
            categoryId?: string;
            currency?: string;
            expenseDate?: string;
            notes?: string;
            receiptUrl?: string;
            title: string;
            vendor?: string;
        };
        CreateFAQRequest: {
            answerAr: string;
            answerEn: string;
            category: string;
            isPublished: boolean;
            questionAr: string;
            questionEn: string;
            sortOrder: number;
        };
        CreateInquiryRequest: {
            dealId?: string;
            inquiryType: string;
            message: string;
            priority: string;
            requesterEmail: string;
            requesterName: string;
            requesterPhone?: string;
            subject: string;
        };
        CreateInvoiceRequest: {
            contactId?: string;
            currency?: string;
            dealId?: string;
            discount: string;
            dueDate?: string;
            invoiceNumber: string;
            issueDate?: string;
            items?: {
                amount: string;
                description: string;
                quantity: string;
                sortOrder?: number;
                unitPrice: string;
            }[];
            notes?: string;
            quotationId?: string;
            subtotal: string;
            terms?: string;
            total: string;
            vatAmount: string;
            vatRate: string;
        };
        CreateLeaveRequest: {
            daysCount: string;
            employeeId: string;
            endDate: string;
            leaveType: string;
            reason?: string;
            startDate: string;
        };
        CreatePageRequest: {
            blocks?: {
                [key: string]: unknown;
            }[];
            inFooter: boolean;
            inHeader: boolean;
            isVisible: boolean;
            pageType: string;
            seoDescriptionAr?: string;
            seoDescriptionEn?: string;
            seoTitleAr?: string;
            seoTitleEn?: string;
            slug: string;
            sortOrder: number;
            titleAr: string;
            titleEn: string;
        };
        CreatePayrollRunRequest: {
            currency?: string;
            items?: {
                allowances?: string;
                basicSalary: string;
                deductions?: string;
                employeeId: string;
                netSalary: string;
                status: string;
            }[];
            periodMonth: number;
            periodYear: number;
            totalDeductions: string;
            totalGross: string;
            totalNet: string;
        };
        CreateProductRequest: {
            barcode?: string;
            categoryId?: string;
            costPrice: string;
            currency?: string;
            descriptionAr?: string;
            descriptionEn?: string;
            nameAr: string;
            nameEn: string;
            sellingPrice: string;
            sku: string;
        };
        CreateQuotationRequest: {
            contactId?: string;
            currency?: string;
            dealId?: string;
            discount: string;
            items?: {
                amount: string;
                description: string;
                quantity: string;
                sortOrder?: number;
                unitPrice: string;
            }[];
            notes?: string;
            quotationNumber: string;
            subtotal: string;
            terms?: string;
            total: string;
            validUntil?: string;
            vatAmount: string;
            vatRate: string;
        };
        CreateReviewRequest: {
            authorAr: string;
            authorEn: string;
            companyAr?: string;
            companyEn?: string;
            isApproved: boolean;
            quoteAr: string;
            quoteEn: string;
            rating: number;
            sortOrder: number;
            year: string;
        };
        CreateRouteSheetRequest: {
            driverId?: string;
            number: string;
            vehicleId?: string;
        };
        CreateShipmentRequest: {
            address: Record<string, never>;
            codAmount: string;
            number: string;
            orderId: string;
            promisedBy: string;
            recipientName: string;
            recipientPhone: string;
        };
        CreateSignatureRequest: {
            documentId: string;
            documentType: string;
            expiresAt?: string;
            requestedFrom: string;
            title: string;
        };
        CreateStockCountRequest: {
            countNumber: string;
            notes?: string;
            warehouseId: string;
        };
        CreateTaskRequest: {
            assignedTo?: string;
            description?: string;
            dueDate?: string;
            priority: string;
            relatedEntityId?: string;
            relatedEntityType?: string;
            status: string;
            title: string;
        };
        CreateVehicleRequest: {
            kind: string;
            name: string;
            notes?: string;
            plate: string;
        };
        CreateWarehouseRequest: {
            address?: string;
            code: string;
            isDefault: boolean;
            nameAr: string;
            nameEn: string;
        };
        Customer: {
            createdAt?: string;
            email?: string;
            firstName: string;
            id: string;
            lastName: string;
            phone?: string;
            status: string;
        };
        Deal: {
            assignedTo?: string | null;
            contactId?: string | null;
            createdAt: string;
            currency: string;
            expectedCloseDate?: string | null;
            id: string;
            notes?: string | null;
            probability: number;
            stage: string;
            status: string;
            title: string;
            updatedAt: string;
            value: string;
        };
        DeliverySettings: {
            id: string;
            leadMinutes: number;
            mode: string;
            requireSlot: boolean;
            slaHours: number;
            slotDays: number;
        };
        DeliveryZone: {
            areas?: string[];
            fee: string;
            id: string;
            isActive: boolean;
            nameAr: string;
            nameEn: string;
        };
        Department: {
            code: string;
            headId?: string | null;
            id: string;
            nameAr: string;
            nameEn: string;
            parentId?: string | null;
        };
        DeskIntegration: {
            accountName?: string | null;
            config: {
                [key: string]: unknown;
            };
            healthStatus: string;
            isActive: boolean;
            lastCheckedAt?: string | null;
            lastError?: string | null;
            lastSyncedAt?: string | null;
            provider: string;
            secrets: {
                [key: string]: components["schemas"]["SecretHint"];
            };
            updatedAt?: string | null;
            updatedBy?: string | null;
            values: {
                [key: string]: string;
            };
        };
        DeskSession: {
            createdAt: string;
            email: string | null;
            expiresAt: string;
            id: string;
            realm: "staff" | "customer" | "it";
            revokedAt: string | null;
            subjectId: string;
        };
        Employee: {
            basicSalary: string;
            createdAt: string;
            departmentId?: string | null;
            email: string;
            employeeNumber: string;
            firstNameAr: string;
            firstNameEn: string;
            hireDate: string;
            housingAllowance?: string;
            id: string;
            jobTitleAr: string;
            jobTitleEn: string;
            lastNameAr: string;
            lastNameEn: string;
            otherAllowances?: string;
            phone?: string | null;
            status: string;
            transportAllowance?: string;
            updatedAt: string;
        };
        Expense: {
            amount: string;
            approvedBy?: string | null;
            categoryId?: string | null;
            createdAt: string;
            createdBy?: string | null;
            currency: string;
            expenseDate: string;
            id: string;
            notes?: string | null;
            receiptUrl?: string | null;
            status: string;
            title: string;
            updatedAt: string;
            vendor?: string | null;
        };
        ExpenseCategory: {
            code: string;
            id: string;
            nameAr: string;
            nameEn: string;
            sortOrder: number;
        };
        FAQ: {
            answerAr: string;
            answerEn: string;
            category: string;
            createdAt: string;
            id: string;
            isPublished: boolean;
            questionAr: string;
            questionEn: string;
            sortOrder: number;
        };
        File: {
            claimedAt?: string;
            createdAt: string;
            expiresAt: string;
            fileName: string;
            fileSize: number;
            fileUrl: string;
            id: string;
            isPublic: boolean;
            mimeType: string;
            ownerId?: string;
        };
        ITAccount: {
            active: boolean;
            createdAt: string;
            email: string;
            id: string;
            lastLoginAt: string | null;
            mfaEnabled: boolean;
            roles: components["schemas"]["ITRole"][];
        };
        ITProvisioning: {
            otpAuthUrl: string;
            recoveryCodes: string[];
            secret: string;
            subjectId: string;
        };
        ITRole: "it_admin" | "it_manager" | "it_lead" | "it_engineer" | "it_worker" | "it_support" | "it_auditor";
        InboxItem: {
            actionUrl: string | null;
            actorId: string | null;
            archived: boolean;
            body: string;
            category: string;
            createdAt: string;
            entityId: string | null;
            entityType: string | null;
            id: string;
            messageKey: string | null;
            messageParams: {
                [key: string]: string;
            };
            priority: "low" | "normal" | "high" | "urgent";
            read: boolean;
            readAt: string | null;
            silent: boolean;
            title: string;
        };
        Inquiry: {
            assigneeId?: string | null;
            createdAt: string;
            dealId?: string | null;
            id: string;
            inquiryType: string;
            message: string;
            priority: string;
            requesterEmail: string;
            requesterName: string;
            requesterPhone?: string | null;
            status: string;
            subject: string;
            updatedAt: string;
        };
        Invoice: {
            amountPaid: string;
            balanceDue: string;
            contactId?: string | null;
            createdAt: string;
            currency: string;
            dealId?: string | null;
            discount: string;
            dueDate: string;
            id: string;
            invoiceNumber: string;
            issueDate: string;
            notes?: string | null;
            quotationId?: string | null;
            status: string;
            subtotal: string;
            terms?: string | null;
            total: string;
            updatedAt: string;
            vatAmount: string;
            vatRate: string;
        };
        InvoiceItem: {
            amount: string;
            description: string;
            id: string;
            invoiceId: string;
            quantity: string;
            sortOrder: number;
            unitPrice: string;
        };
        InvoiceWithItems: components["schemas"]["Invoice"] & {
            items?: components["schemas"]["InvoiceItem"][];
        };
        LeaveRequest: {
            approvedBy?: string | null;
            createdAt: string;
            daysCount: string;
            employeeId: string;
            endDate: string;
            id: string;
            leaveType: string;
            reason?: string | null;
            startDate: string;
            status: string;
            updatedAt: string;
        };
        LoginCredential: {
            accessToken: string;
            expiresAt: string;
            realm: "staff" | "customer" | "it";
            refreshToken: string;
            roles: string[];
            sessionId: string;
            subjectId: string;
        };
        Message: {
            actor: string | null;
            attachments?: {
                contentType: string;
                filename: string;
                size: number;
            }[];
            attempts: number;
            caller: string;
            channel: "email" | "whatsapp";
            createdAt: string;
            html?: string | null;
            id: string;
            lastError: string | null;
            provider: string | null;
            providerId: string | null;
            recipient: string;
            sentAt: string | null;
            status: "queued" | "sent" | "failed";
            subject: string | null;
            text?: string | null;
        };
        Module: {
            enabled: boolean;
            enabledByDefault: boolean;
            key: string;
            nameAr: string;
            nameEn: string;
            updatedAt?: string;
            updatedBy?: string;
        };
        NewNotification: {
            actionUrl?: string;
            actorId?: string;
            archivedAt?: string | null;
            body?: string;
            category?: string;
            createdAt?: string | null;
            dedupeKey?: string;
            deliverAt?: string | null;
            entityId?: string;
            entityType?: string;
            id?: string;
            messageKey?: string;
            messageParams?: {
                [key: string]: string;
            };
            priority?: "low" | "normal" | "high" | "urgent";
            readAt?: string | null;
            realm: "staff" | "it";
            recipient: string;
            title: string;
        };
        NewTicket: {
            assetRef?: string;
            attachments?: components["schemas"]["Attachment"][];
            category: string;
            description: string;
            priority?: string;
            requesterEmail: string;
            requesterId: string;
            requesterName: string;
            subcategory: string;
            title: string;
        };
        NumberReservation: {
            number: string;
        };
        NumberReservationInput: {
            documentDate: string;
            idempotencyKey: string;
        };
        OwnSession: {
            clientIp: string | null;
            createdAt: string;
            current: boolean;
            expiresAt: string;
            id: string;
            userAgent: string | null;
        };
        Page: {
            blocks: {
                [key: string]: unknown;
            }[];
            createdAt: string;
            id: string;
            inFooter: boolean;
            inHeader: boolean;
            isVisible: boolean;
            pageType: string;
            seoDescriptionAr?: string | null;
            seoDescriptionEn?: string | null;
            seoTitleAr?: string | null;
            seoTitleEn?: string | null;
            slug: string;
            sortOrder: number;
            titleAr: string;
            titleEn: string;
            updatedAt: string;
        };
        Payment: {
            amount: string;
            contactId?: string | null;
            createdAt: string;
            currency: string;
            id: string;
            invoiceId?: string | null;
            notes?: string | null;
            paymentDate: string;
            paymentMethod: string;
            paymentNumber: string;
            reference?: string | null;
            status: string;
        };
        PayrollItem: {
            allowances: string;
            basicSalary: string;
            deductions: string;
            employeeId: string;
            id: string;
            netSalary: string;
            payrollRunId: string;
            status: string;
        };
        PayrollRun: {
            approvedBy?: string | null;
            createdAt: string;
            currency: string;
            id: string;
            periodMonth: number;
            periodYear: number;
            processedAt?: string | null;
            status: string;
            totalDeductions: string;
            totalGross: string;
            totalNet: string;
        };
        PayrollRunWithItems: components["schemas"]["PayrollRun"] & {
            items?: components["schemas"]["PayrollItem"][];
        };
        PlaceOrderRequest: {
            channel: string;
            currency: string;
            customerId?: string;
            email?: string;
            lines: components["schemas"]["SalesOrderLineInput"][];
            name: string;
            number: string;
            paymentMethod: string;
            phone?: string;
            subtotal?: string;
            total: string;
        };
        Preferences: {
            categories: {
                category: string;
                mandatory?: boolean;
                muted: boolean;
                sound: boolean;
            }[];
            desktopEnabled: boolean;
            mutedUntil: string | null;
            popupsEnabled: boolean;
            sound: "chime" | "ping" | "pop" | "bell" | "alert";
            soundEnabled: boolean;
            volume: number;
        };
        Presence: {
            connection: "online" | "idle" | "offline";
            lastSeenAt: string | null;
            message: string | null;
            source: "manual" | "leave" | "calendar" | "connection";
            status: string;
            until: string | null;
            userId: string;
        };
        Problem: {
            code: string;
            detail?: string;
            errors?: {
                code: string;
                field: string;
            }[];
            instance?: string;
            requestId?: string;
            status: number;
            title: string;
            type: string;
        };
        Product: {
            barcode?: string;
            categoryId?: string;
            costPrice: string;
            currency: string;
            descriptionAr?: string;
            descriptionEn?: string;
            id: string;
            isActive: boolean;
            nameAr: string;
            nameEn: string;
            reorderPoint?: string;
            sellingPrice: string;
            sku: string;
            trackInventory?: boolean;
        };
        QueueMessageInput: {
            actorId?: string;
            attachments?: {
                content: string;
                contentType?: string;
                filename: string;
            }[];
            channel: "email" | "whatsapp";
            html?: string;
            idempotencyKey: string;
            subject?: string;
            text?: string;
            to: string;
        };
        Quotation: {
            acceptedAt?: string | null;
            contactId?: string | null;
            createdAt: string;
            currency: string;
            dealId?: string | null;
            discount: string;
            id: string;
            issuedAt?: string | null;
            notes?: string | null;
            quotationNumber: string;
            rejectedAt?: string | null;
            status: string;
            subtotal: string;
            terms?: string | null;
            total: string;
            updatedAt: string;
            validUntil?: string | null;
            vatAmount: string;
            vatRate: string;
        };
        QuotationItem: {
            amount: string;
            description: string;
            id: string;
            quantity: string;
            quotationId: string;
            sortOrder: number;
            unitPrice: string;
        };
        QuotationWithItems: components["schemas"]["Quotation"] & {
            items?: components["schemas"]["QuotationItem"][];
        };
        RecordPaymentRequest: {
            amount: string;
            contactId?: string;
            currency?: string;
            invoiceId?: string;
            notes?: string;
            paymentDate?: string;
            paymentMethod: string;
            paymentNumber: string;
            reference?: string;
        };
        RecordProofRequest: {
            codCollected: string;
            proofPhotoUrl?: string;
            proofSignature?: string;
        };
        RegisterUpload: {
            fileName: string;
            fileSize: number;
            folder: string;
            mimeType: string;
            ownerId: string;
        };
        Review: {
            authorAr: string;
            authorEn: string;
            companyAr?: string | null;
            companyEn?: string | null;
            createdAt: string;
            id: string;
            isApproved: boolean;
            quoteAr: string;
            quoteEn: string;
            rating: number;
            sortOrder: number;
            year: string;
        };
        RouteSheet: {
            driverId?: string;
            id: string;
            number: string;
            runDate: string;
            status: string;
            vehicleId?: string;
        };
        SLAPolicy: {
            priority: string;
            resolveMinutes: number;
            responseMinutes: number;
            updatedAt: string;
            updatedBy?: string;
        };
        SalesOrder: {
            amountPaid?: string;
            channel: string;
            currency: string;
            customerId?: string;
            email?: string;
            id: string;
            name: string;
            number: string;
            paymentMethod?: string;
            paymentStatus: string;
            phone?: string;
            placedAt?: string;
            status: string;
            total: string;
        };
        SalesOrderLineInput: {
            description: string;
            lineTotal: string;
            productId: string;
            quantity: string;
            sku: string;
            unitPrice: string;
        };
        SaveIntegrationITInput: {
            config?: {
                [key: string]: unknown;
            };
            isActive: boolean;
            values?: {
                [key: string]: string;
            };
        };
        SaveIntegrationServiceInput: {
            actorId: string;
            config?: {
                [key: string]: unknown;
            };
            isActive: boolean;
            values?: {
                [key: string]: string;
            };
        };
        SecretHint: {
            hint: string;
            set: boolean;
        };
        ServiceIntegration: {
            accountName?: string | null;
            config: {
                [key: string]: unknown;
            };
            credentials: {
                [key: string]: string;
            };
            healthStatus: string;
            isActive: boolean;
            lastCheckedAt?: string | null;
            lastError?: string | null;
            lastSyncedAt?: string | null;
            provider: string;
            updatedAt?: string | null;
            updatedBy?: string | null;
        };
        SessionCredential: {
            expiresAt: string;
            realm: "staff" | "customer" | "it";
            refreshToken: string;
            sessionId: string;
            subjectId: string;
        };
        Shipment: {
            codAmount?: string;
            codCollected?: string;
            deliveredAt?: string;
            driverId?: string;
            id: string;
            method: string;
            number: string;
            orderId: string;
            promisedBy: string;
            recipientName: string;
            recipientPhone: string;
            status: string;
            trackingToken?: string;
            vehicleId?: string;
        };
        SignatureRequest: {
            createdAt: string;
            documentId: string;
            documentType: string;
            expiresAt?: string | null;
            id: string;
            requestedFrom: string;
            signatureUrl?: string | null;
            signedAt?: string | null;
            status: string;
            title: string;
        };
        Site: components["schemas"]["Changed"] & {
            adminDomain: string;
            code: components["schemas"]["SiteCode"];
            websiteDomain: string;
        };
        SiteCode: {
            bodyHtml: string;
            googleAnalyticsId: string;
            headHtml: string;
            metaPixelId: string;
            tiktokPixelId: string;
        };
        SiteDomains: components["schemas"]["Changed"] & {
            adminDomain: string;
            websiteDomain: string;
        };
        SiteDomainsInput: {
            adminDomain: string;
            websiteDomain: string;
        };
        StaffAccessPreview: {
            dataScopes: {
                [key: string]: "own" | "department" | "all";
            };
            permissions: {
                [key: string]: boolean;
            };
            role: string;
            subjectId: string;
        };
        StaffAccessTemplate: {
            dataScopes: {
                [key: string]: "own" | "department" | "all";
            };
            overrides: {
                [key: string]: boolean;
            };
            role: string;
        };
        StaffDeskAccount: {
            active: boolean;
            createdAt: string;
            displayName: string;
            email: string;
            id: string;
            lastLoginAt: string | null;
            mfaEnabled: boolean;
            roles: string[];
        };
        StaffDeskPage: {
            items: components["schemas"]["StaffDeskAccount"][];
            nextCursor: string;
        };
        StaffDraft: {
            active: boolean;
            copiedFrom?: string;
            dataScopes?: {
                [key: string]: "own" | "department" | "all";
            };
            displayName: string;
            email: string;
            overrides?: {
                [key: string]: boolean;
            };
            role: string;
        };
        StaffInvitation: {
            email: string;
            expiresAt: string;
            subjectId: string;
            token: string;
        };
        StaffRoleDraft: {
            dataScopes: {
                [key: string]: "own" | "department" | "all";
            };
            grants: {
                [key: string]: boolean;
            };
            id: string;
            nameAr: string;
            nameEn: string;
            system?: boolean;
        };
        StaffRolePage: {
            items: components["schemas"]["StaffRoleDraft"][];
            nextCursor: string;
        };
        Statistic: {
            icon?: string | null;
            id: string;
            labelAr: string;
            labelEn: string;
            metricValue: string;
            sortOrder: number;
            subLabelAr?: string | null;
            subLabelEn?: string | null;
        };
        StockCount: {
            countNumber: string;
            createdAt?: string;
            id: string;
            notes?: string;
            status: string;
            warehouseId: string;
        };
        StockMovement: {
            createdAt?: string;
            id: string;
            locationId: string;
            movementType: string;
            note?: string;
            productId: string;
            quantity: string;
            reason?: string;
            unitCost?: string;
            variantId?: string;
        };
        Task: {
            assignedTo?: string | null;
            createdAt: string;
            description?: string | null;
            dueDate?: string | null;
            id: string;
            priority: string;
            relatedEntityId?: string | null;
            relatedEntityType?: string | null;
            status: string;
            title: string;
            updatedAt: string;
        };
        Ticket: {
            assetRef?: string;
            assigneeId?: string;
            assigneeName?: string;
            breached: boolean;
            category: string;
            closedAt?: string;
            createdAt: string;
            description: string;
            firstResponseAt?: string;
            id: string;
            number: number;
            priority: string;
            remindedAt?: string;
            requesterEmail?: string;
            requesterId: string;
            requesterName: string;
            resolveBy: string;
            resolvedAt?: string;
            respondBy: string;
            status: string;
            subcategory: string;
            title: string;
            updatedAt: string;
        };
        TicketDetail: {
            attachments: components["schemas"]["Attachment"][];
            comments: components["schemas"]["Comment"][];
            events: {
                actorId?: string;
                actorRealm: string;
                createdAt: string;
                fromStatus?: string;
                kind: string;
                toStatus?: string;
            }[];
            ticket: components["schemas"]["Ticket"];
        };
        UpdateArticleRequest: {
            authorName?: string;
            bodyAr?: {
                [key: string]: unknown;
            };
            bodyEn?: {
                [key: string]: unknown;
            };
            bodyHtmlAr?: string;
            bodyHtmlEn?: string;
            category?: string;
            coverUrl?: string;
            excerptAr?: string;
            excerptEn?: string;
            featured?: boolean;
            publishAt?: string;
            seoDescriptionAr?: string;
            seoDescriptionEn?: string;
            seoTitleAr?: string;
            seoTitleEn?: string;
            slug: string;
            status?: string;
            tags?: string[];
            titleAr: string;
            titleEn: string;
        };
        UpdateContactRequest: {
            company?: string;
            contactType?: string;
            email?: string;
            firstName: string;
            lastName?: string;
            notes?: string;
            phone?: string;
            status?: string;
            tags?: string[];
        };
        UpdateDealRequest: {
            assignedTo?: string;
            contactId?: string;
            currency?: string;
            expectedCloseDate?: string;
            notes?: string;
            probability?: number;
            stage?: string;
            status?: string;
            title: string;
            value?: string;
        };
        UpdateFAQRequest: {
            answerAr: string;
            answerEn: string;
            category?: string;
            isPublished?: boolean;
            questionAr: string;
            questionEn: string;
            sortOrder?: number;
        };
        UpdateIntegrationStatusInput: {
            accountName?: string | null;
            config?: {
                [key: string]: unknown;
            };
            healthStatus?: string;
            lastCheckedAt?: string | null;
            lastError?: string | null;
            lastSyncedAt?: string | null;
            refreshedCredentials?: {
                [key: string]: string;
            };
            syncLeaseToken?: string | null;
            syncLeaseUntil?: string | null;
        };
        UpdatePageRequest: {
            blocks?: {
                [key: string]: unknown;
            }[];
            inFooter?: boolean;
            inHeader?: boolean;
            isVisible?: boolean;
            pageType: string;
            seoDescriptionAr?: string;
            seoDescriptionEn?: string;
            seoTitleAr?: string;
            seoTitleEn?: string;
            slug: string;
            sortOrder?: number;
            titleAr: string;
            titleEn: string;
        };
        UpdateReviewRequest: {
            authorAr: string;
            authorEn: string;
            companyAr?: string;
            companyEn?: string;
            isApproved?: boolean;
            quoteAr: string;
            quoteEn: string;
            rating?: number;
            sortOrder?: number;
            year?: string;
        };
        UpdateStatusRequest: {
            status: string;
        };
        UploadRef: {
            fileUrl: string;
            ownerId: string;
        };
        Vehicle: {
            id: string;
            isActive: boolean;
            kind: string;
            name: string;
            notes?: string;
            plate: string;
        };
        Warehouse: {
            address?: string;
            code: string;
            id: string;
            isActive: boolean;
            isDefault: boolean;
            nameAr: string;
            nameEn: string;
        };
        WindowInput: {
            endsAt: string;
            kind: "meeting" | "leave" | "sick";
            sourceId: string;
            startsAt: string;
            userIds: string[];
        };
    };
    responses: {
        Comment: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Comment"];
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
        File: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["File"];
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
        InboxItem: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["InboxItem"];
            };
        };
        InboxPage: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    items: components["schemas"]["InboxItem"][];
                    nextCursor?: string;
                    unread: number;
                };
            };
        };
        InboxSummary: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    byCategory: {
                        [key: string]: number;
                    };
                    unread: number;
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
        Message: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Message"];
            };
        };
        Mine: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    chosen: {
                        expiresAt: string | null;
                        message: string | null;
                        status: string;
                    } | null;
                    presence: components["schemas"]["Presence"];
                    upcoming: {
                        endsAt: string;
                        kind: string;
                        source: string;
                        startsAt: string;
                        status: string;
                    }[];
                };
            };
        };
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
        Mutes: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    items: {
                        createdAt: string;
                        entityId: string;
                        entityType: string;
                        until: string | null;
                    }[];
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
        Problem: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
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
        SiteDomains: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["SiteDomains"];
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
    };
    parameters: {
        Categories: string;
        Category: string;
        Cursor: string;
        EntityId: string;
        EntityType: string;
        FileUrl: string;
        Filter: "all" | "unread" | "read" | "archived" | "muted";
        Ids: string;
        Limit: number;
        ManagedRealm: "staff" | "customer" | "it";
        MessageId: string;
        ModuleKey: string;
        NotificationId: string;
        OwnerId: string;
        ProviderId: string;
        QueryRealm: "staff" | "it";
        Realm: "staff" | "customer" | "it";
        RequesterId: string;
        Status: string;
        TicketId: string;
        UserId: string;
    };
    requestBodies: {
        Activity: {
            content: {
                "application/json": {
                    state: "active" | "idle";
                };
            };
        };
        InboxAction: {
            content: {
                "application/json": {
                    action: "read" | "unread" | "archive" | "unarchive" | "delete";
                    all?: boolean;
                    category?: string;
                    filter?: "all" | "unread" | "read" | "archived" | "muted";
                    ids?: string[];
                };
            };
        };
        MFAConfirmation: {
            content: {
                "application/json": {
                    code: string;
                    currentCode?: string;
                    password: string;
                };
            };
        };
        MFAPassword: {
            content: {
                "application/json": {
                    password: string;
                };
            };
        };
        Mute: {
            content: {
                "application/json": {
                    entityId: string;
                    entityType: string;
                    until?: string | null;
                };
            };
        };
        Preferences: {
            content: {
                "application/json": components["schemas"]["Preferences"];
            };
        };
        RefreshCredential: {
            content: {
                "application/json": {
                    refreshToken: string;
                };
            };
        };
        Status: {
            content: {
                "application/json": {
                    expiresAt?: string | null;
                    message?: string | null;
                    status: string;
                };
            };
        };
    };
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
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
    listAuditEvents: {
        parameters: {
            query?: {
                subject?: string;
                service?: string;
                actor?: string;
                from?: string;
                to?: string;
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
                        items: components["schemas"]["AuditEvent"][];
                        nextCursor?: string;
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getAuditEvent: {
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
                    "application/json": components["schemas"]["AuditEvent"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    listAuditSubjects: {
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
                            events: number;
                            lastAt: string;
                            subject: string;
                        }[];
                    };
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    listArticles: {
        parameters: {
            query?: {
                all?: boolean;
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
                    "application/json": components["schemas"]["Article"][];
                };
            };
        };
    };
    createArticle: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateArticleRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Article"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getArticleBySlug: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
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
                    "application/json": components["schemas"]["Article"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getArticleByID: {
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
                    "application/json": components["schemas"]["Article"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    updateArticle: {
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
                "application/json": components["schemas"]["UpdateArticleRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Article"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    deleteArticle: {
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
    listFAQs: {
        parameters: {
            query?: {
                all?: boolean;
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
                    "application/json": components["schemas"]["FAQ"][];
                };
            };
        };
    };
    createFAQ: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateFAQRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FAQ"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    updateFAQ: {
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
                "application/json": components["schemas"]["UpdateFAQRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FAQ"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    deleteFAQ: {
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
    listPages: {
        parameters: {
            query?: {
                all?: boolean;
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
                    "application/json": components["schemas"]["Page"][];
                };
            };
        };
    };
    createPage: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePageRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Page"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getPageBySlug: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
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
                    "application/json": components["schemas"]["Page"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    getPageByID: {
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
                    "application/json": components["schemas"]["Page"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    updatePage: {
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
                "application/json": components["schemas"]["UpdatePageRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Page"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    deletePage: {
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
    listReviews: {
        parameters: {
            query?: {
                all?: boolean;
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
                    "application/json": components["schemas"]["Review"][];
                };
            };
        };
    };
    createReview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateReviewRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Review"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    updateReview: {
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
                "application/json": components["schemas"]["UpdateReviewRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Review"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    deleteReview: {
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
    getContentSnapshot: {
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
                    "application/json": components["schemas"]["ContentSnapshot"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    saveContentDraft: {
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
                    [key: string]: unknown;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContentSnapshot"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    publishContentSnapshot: {
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
                    "application/json": components["schemas"]["ContentSnapshot"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    listStatistics: {
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
                    "application/json": components["schemas"]["Statistic"][];
                };
            };
        };
    };
    upsertStatistic: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Statistic"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Statistic"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    deleteStatistic: {
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
    listCoupons: {
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
                    "application/json": components["schemas"]["Coupon"][];
                };
            };
        };
    };
    createCoupon: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCouponRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Coupon"];
                };
            };
        };
    };
    listCustomers: {
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
                    "application/json": components["schemas"]["Customer"][];
                };
            };
        };
    };
    createCustomer: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCustomerRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Customer"];
                };
            };
        };
    };
    getCustomer: {
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
                    "application/json": components["schemas"]["Customer"];
                };
            };
        };
    };
    listOrders: {
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
                    "application/json": components["schemas"]["SalesOrder"][];
                };
            };
        };
    };
    placeOrder: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PlaceOrderRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SalesOrder"];
                };
            };
        };
    };
    getOrder: {
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
                    "application/json": components["schemas"]["SalesOrder"];
                };
            };
        };
    };
    recordOrderPayment: {
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
                "application/json": components["schemas"]["CommerceRecordPaymentRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SalesOrder"];
                };
            };
        };
    };
    updateOrderStatus: {
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
                "application/json": components["schemas"]["UpdateStatusRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SalesOrder"];
                };
            };
        };
    };
    listRouteSheets: {
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
                    "application/json": components["schemas"]["RouteSheet"][];
                };
            };
        };
    };
    createRouteSheet: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRouteSheetRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RouteSheet"];
                };
            };
        };
    };
    getDeliverySettings: {
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
                    "application/json": components["schemas"]["DeliverySettings"];
                };
            };
        };
    };
    listShipments: {
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
                    "application/json": components["schemas"]["Shipment"][];
                };
            };
        };
    };
    createShipment: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateShipmentRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Shipment"];
                };
            };
        };
    };
    getShipment: {
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
                    "application/json": components["schemas"]["Shipment"];
                };
            };
        };
    };
    assignShipmentDriver: {
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
                "application/json": components["schemas"]["AssignDriverRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Shipment"];
                };
            };
        };
    };
    recordProofOfDelivery: {
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
                "application/json": components["schemas"]["RecordProofRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Shipment"];
                };
            };
        };
    };
    listVehicles: {
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
                    "application/json": components["schemas"]["Vehicle"][];
                };
            };
        };
    };
    createVehicle: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateVehicleRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Vehicle"];
                };
            };
        };
    };
    listDeliveryZones: {
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
                    "application/json": components["schemas"]["DeliveryZone"][];
                };
            };
        };
    };
    createDeliveryZone: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDeliveryZoneRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeliveryZone"];
                };
            };
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
                    "X-File-Name"?: string;
                    "X-File-Public"?: boolean;
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
                    folder: string;
                    ownerId: string;
                    url: string;
                };
            };
        };
        responses: {
            201: components["responses"]["File"];
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
    listExpenseCategories: {
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
                    "application/json": components["schemas"]["ExpenseCategory"][];
                };
            };
        };
    };
    createExpenseCategory: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    code: string;
                    id?: string;
                    nameAr: string;
                    nameEn: string;
                    sortOrder?: number;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExpenseCategory"];
                };
            };
        };
    };
    updateExpenseCategory: {
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
                    code: string;
                    nameAr: string;
                    nameEn: string;
                    sortOrder?: number;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExpenseCategory"];
                };
            };
        };
    };
    deleteExpenseCategory: {
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
        };
    };
    listExpenses: {
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
                    "application/json": components["schemas"]["Expense"][];
                };
            };
        };
    };
    createExpense: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateExpenseRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Expense"];
                };
            };
        };
    };
    approveExpense: {
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
                    approvedBy: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Expense"];
                };
            };
        };
    };
    listInvoices: {
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
                    "application/json": components["schemas"]["Invoice"][];
                };
            };
        };
    };
    createInvoice: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateInvoiceRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InvoiceWithItems"];
                };
            };
        };
    };
    getInvoice: {
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
                    "application/json": components["schemas"]["InvoiceWithItems"];
                };
            };
        };
    };
    deleteInvoice: {
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
        };
    };
    updateInvoiceStatus: {
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
                    status: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Invoice"];
                };
            };
        };
    };
    listPayments: {
        parameters: {
            query?: {
                invoiceId?: string;
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
                    "application/json": components["schemas"]["Payment"][];
                };
            };
        };
    };
    recordPayment: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecordPaymentRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"];
                };
            };
        };
    };
    listSettlements: {
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
                    "application/json": components["schemas"]["BankSettlement"][];
                };
            };
        };
    };
    listDepartments: {
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
                    "application/json": components["schemas"]["Department"][];
                };
            };
        };
    };
    createDepartment: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDepartmentRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Department"];
                };
            };
        };
    };
    listEmployees: {
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
                    "application/json": components["schemas"]["Employee"][];
                };
            };
        };
    };
    createEmployee: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateEmployeeRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Employee"];
                };
            };
        };
    };
    getEmployee: {
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
                    "application/json": components["schemas"]["Employee"];
                };
            };
        };
    };
    deleteEmployee: {
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
        };
    };
    offboardEmployee: {
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
                    "application/json": components["schemas"]["Employee"];
                };
            };
        };
    };
    listLeaveRequests: {
        parameters: {
            query?: {
                employeeId?: string;
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
                    "application/json": components["schemas"]["LeaveRequest"][];
                };
            };
        };
    };
    createLeaveRequest: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateLeaveRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LeaveRequest"];
                };
            };
        };
    };
    approveLeaveRequest: {
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
                    approvedBy: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LeaveRequest"];
                };
            };
        };
    };
    listPayrollRuns: {
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
                    "application/json": components["schemas"]["PayrollRun"][];
                };
            };
        };
    };
    createPayrollRun: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePayrollRunRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PayrollRunWithItems"];
                };
            };
        };
    };
    processPayrollRun: {
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
                    approvedBy: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PayrollRun"];
                };
            };
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
                    active: boolean;
                    actorId?: string;
                    email: string;
                    roles?: string[];
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
                    actorId?: string;
                    keepSessionId?: string;
                    password: string;
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
                        expiresAt: string;
                        subjectId: string;
                        token: string;
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
                    password: string;
                    token: string;
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
                    clientIp?: string;
                    email: string;
                    otp?: string;
                    password: string;
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
                    clientIp?: string;
                    locale: "en" | "ar";
                    next: string;
                    redirectUri: string;
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
                        authorizationUrl: string;
                        expiresAt: string;
                        state: string;
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
                    browserState: string;
                    clientIp?: string;
                    code?: string;
                    name?: string;
                    otp?: string;
                    state: string;
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
                        credential: components["schemas"]["LoginCredential"];
                        email: string;
                        locale: string;
                        name: string;
                        next: string;
                    };
                };
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
                        apple: boolean;
                        google: boolean;
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
                    clientIp?: string;
                    code: string;
                    email: string;
                    otp?: string;
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
                        credential: components["schemas"]["LoginCredential"];
                        email: string;
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
                        code: string;
                        expiresAt: string;
                    };
                };
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
                    active: boolean;
                    role: components["schemas"]["ITRole"];
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
                        apple: boolean;
                        email: string;
                        google: boolean;
                        hasPassword: boolean;
                        mfaEnabled: boolean;
                        recoveryCodesLeft: number;
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
                    clientIp?: string;
                    code?: string;
                    currentPassword: string;
                    newPassword: string;
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
                        digits: 6 | 8;
                        expiresAt: string;
                        periodSeconds: number;
                        secret: string;
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
                        dataScopes: {
                            claims: "own" | "department" | "all";
                            deals: "own" | "department" | "all";
                            expenses: "own" | "department" | "all";
                            leave: "own" | "department" | "all";
                            requests: "own" | "department" | "all";
                        };
                        permissions: {
                            [key: string]: boolean;
                        };
                        role: string;
                        subjectId: string;
                    };
                };
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
    listCategories: {
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
                    "application/json": components["schemas"]["Category"][];
                };
            };
        };
    };
    createCategory: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCategoryRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Category"];
                };
            };
        };
    };
    listStockCounts: {
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
                    "application/json": components["schemas"]["StockCount"][];
                };
            };
        };
    };
    createStockCount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateStockCountRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StockCount"];
                };
            };
        };
    };
    listProducts: {
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
                    "application/json": components["schemas"]["Product"][];
                };
            };
        };
    };
    createProduct: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateProductRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Product"];
                };
            };
        };
    };
    getProduct: {
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
                    "application/json": components["schemas"]["Product"];
                };
            };
        };
    };
    adjustStock: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdjustStockRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StockMovement"];
                };
            };
        };
    };
    listMovements: {
        parameters: {
            query: {
                productId: string;
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
                    "application/json": components["schemas"]["StockMovement"][];
                };
            };
        };
    };
    listWarehouses: {
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
                    "application/json": components["schemas"]["Warehouse"][];
                };
            };
        };
    };
    createWarehouse: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateWarehouseRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Warehouse"];
                };
            };
        };
    };
    getWarehouse: {
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
                    "application/json": components["schemas"]["Warehouse"];
                };
            };
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
                    resolveMinutes: number;
                    responseMinutes: number;
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
                        breached: number;
                        byPriority: {
                            [key: string]: number;
                        };
                        byStatus: {
                            [key: string]: number;
                        };
                        open: number;
                        unassigned: number;
                    };
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
                    attachments?: components["schemas"]["Attachment"][];
                    body: string;
                    internal?: boolean;
                };
            };
        };
        responses: {
            201: components["responses"]["Comment"];
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
                    assigneeId?: string;
                    assigneeName?: string;
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
                    attachments?: components["schemas"]["Attachment"][];
                    body: string;
                    requesterId: string;
                    requesterName: string;
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
                            channel: string;
                            messages: number;
                            status: string;
                        }[];
                    };
                };
            };
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
                realm: components["parameters"]["QueryRealm"];
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
    getInboxItem: {
        parameters: {
            query: {
                realm: components["parameters"]["QueryRealm"];
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
    actOnInbox: {
        parameters: {
            query: {
                realm: components["parameters"]["QueryRealm"];
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
    inboxSummary: {
        parameters: {
            query: {
                realm: components["parameters"]["QueryRealm"];
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
    listMutes: {
        parameters: {
            query: {
                realm: components["parameters"]["QueryRealm"];
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
                realm: components["parameters"]["QueryRealm"];
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
                realm: components["parameters"]["QueryRealm"];
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
    getPreferences: {
        parameters: {
            query: {
                realm: components["parameters"]["QueryRealm"];
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
                realm: components["parameters"]["QueryRealm"];
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
    reportActivity: {
        parameters: {
            query: {
                realm: components["parameters"]["QueryRealm"];
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
    getPresence: {
        parameters: {
            query: {
                realm: components["parameters"]["QueryRealm"];
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
                    data?: {
                        [key: string]: unknown;
                    };
                    topics?: string[];
                    type: string;
                    users?: {
                        id: string;
                        realm: "staff" | "it";
                    }[];
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
    getMyStatus: {
        parameters: {
            query: {
                realm: components["parameters"]["QueryRealm"];
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
                realm: components["parameters"]["QueryRealm"];
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
                realm: components["parameters"]["QueryRealm"];
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
    openStream: {
        parameters: {
            query: {
                realm: components["parameters"]["QueryRealm"];
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
                realm: components["parameters"]["QueryRealm"];
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
                    from: string;
                    realm: "staff" | "it";
                    source: string;
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
    listContacts: {
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
                    "application/json": components["schemas"]["Contact"][];
                };
            };
        };
    };
    createContact: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateContactRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Contact"];
                };
            };
        };
    };
    getContact: {
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
                    "application/json": components["schemas"]["Contact"];
                };
            };
        };
    };
    updateContact: {
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
                "application/json": components["schemas"]["UpdateContactRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Contact"];
                };
            };
        };
    };
    deleteContact: {
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
        };
    };
    listDeals: {
        parameters: {
            query?: {
                contactId?: string;
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
                    "application/json": components["schemas"]["Deal"][];
                };
            };
        };
    };
    createDeal: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDealRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Deal"];
                };
            };
        };
    };
    getDeal: {
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
                    "application/json": components["schemas"]["Deal"];
                };
            };
        };
    };
    updateDeal: {
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
                "application/json": components["schemas"]["UpdateDealRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Deal"];
                };
            };
        };
    };
    deleteDeal: {
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
        };
    };
    updateDealStage: {
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
                    stage: string;
                    status: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Deal"];
                };
            };
        };
    };
    listInquiries: {
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
                    "application/json": components["schemas"]["Inquiry"][];
                };
            };
        };
    };
    createInquiry: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateInquiryRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Inquiry"];
                };
            };
        };
    };
    getInquiry: {
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
                    "application/json": components["schemas"]["Inquiry"];
                };
            };
        };
    };
    deleteInquiry: {
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
        };
    };
    updateInquiryStatus: {
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
                    status: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Inquiry"];
                };
            };
        };
    };
    listQuotations: {
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
                    "application/json": components["schemas"]["Quotation"][];
                };
            };
        };
    };
    createQuotation: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateQuotationRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuotationWithItems"];
                };
            };
        };
    };
    getQuotation: {
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
                    "application/json": components["schemas"]["QuotationWithItems"];
                };
            };
        };
    };
    deleteQuotation: {
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
        };
    };
    updateQuotationStatus: {
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
                    status: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Quotation"];
                };
            };
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
    updateCompanyConfiguration: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CompanyPatchServiceBody"];
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
    saveCompanyAsset: {
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
                "application/json": components["schemas"]["CompanyAssetServiceBody"];
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
                    actorId: string;
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
    listApprovals: {
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
                    "application/json": components["schemas"]["ApprovalRequest"][];
                };
            };
        };
    };
    createApprovalRequest: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateApprovalRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApprovalRequest"];
                };
            };
        };
    };
    getApprovalRequest: {
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
                    "application/json": components["schemas"]["ApprovalRequestWithDecisions"];
                };
            };
        };
    };
    decideApproval: {
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
                    comments?: string;
                    decision: "approve" | "reject";
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApprovalDecision"];
                };
            };
        };
    };
    listCalendarEvents: {
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
                    "application/json": components["schemas"]["CalendarEvent"][];
                };
            };
        };
    };
    createCalendarEvent: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCalendarEventRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CalendarEvent"];
                };
            };
        };
    };
    listSignatures: {
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
                    "application/json": components["schemas"]["SignatureRequest"][];
                };
            };
        };
    };
    createSignatureRequest: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateSignatureRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SignatureRequest"];
                };
            };
        };
    };
    recordSignature: {
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
                    signatureUrl: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SignatureRequest"];
                };
            };
        };
    };
    listTasks: {
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
                    "application/json": components["schemas"]["Task"][];
                };
            };
        };
    };
    createTask: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTaskRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Task"];
                };
            };
        };
    };
    updateTaskStatus: {
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
                    status: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Task"];
                };
            };
        };
    };
}
