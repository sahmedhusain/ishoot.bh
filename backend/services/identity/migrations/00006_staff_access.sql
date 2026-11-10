CREATE TABLE identity.staff_role (
    id text PRIMARY KEY,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE identity.staff_permission (
    id text PRIMARY KEY,
    role_id text NOT NULL REFERENCES identity.staff_role(id) ON DELETE CASCADE,
    resource text NOT NULL,
    action text NOT NULL,
    allowed boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (role_id, resource, action)
);
CREATE TABLE identity.staff_role_scope (
    role_id text NOT NULL REFERENCES identity.staff_role(id) ON DELETE CASCADE,
    area text NOT NULL,
    scope text NOT NULL CHECK (scope IN ('own', 'department', 'all')),
    PRIMARY KEY (role_id, area)
);
CREATE TABLE identity.staff_access (
    realm text NOT NULL DEFAULT 'staff' CHECK (realm = 'staff'),
    subject_id text NOT NULL,
    permission_overrides jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(permission_overrides) = 'object'),
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (realm, subject_id),
    FOREIGN KEY (realm, subject_id) REFERENCES identity.account(realm, subject_id) ON DELETE CASCADE
);
DROP TABLE identity.staff_access;
DROP TABLE identity.staff_role_scope;
DROP TABLE identity.staff_permission;
DROP TABLE identity.staff_role;
