package main
import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"platform.local/backend/pkg/catalog"
)
func validateStaffAccess(ctx context.Context, tx pgx.Tx, report *summary) error {
	if err := tx.QueryRow(ctx, `SELECT (SELECT count(*) FROM public."Role"), (SELECT count(*) FROM public."Permission"), (SELECT count(*) FROM public."RoleDataScope")`).Scan(&report.Roles, &report.Permissions, &report.Scopes); err != nil {
		return err
	}
	keys := make([]string, 0, len(catalog.StaffAccess.Resources)*len(catalog.StaffAccess.Actions))
	for _, resource := range catalog.StaffAccess.Resources {
		for _, action := range catalog.StaffAccess.Actions {
			keys = append(keys, resource+":"+action)
		}
	}
	checks := []struct {
		name, query	string
		args		[]any
	}{
		{"invalid staff role", `SELECT count(*) FROM public."Role" WHERE id='' OR length(id)>200`, nil},
		{"orphan staff assignment", `SELECT count(*) FROM public."User" u WHERE NOT EXISTS (SELECT 1 FROM public."Role" r WHERE r.id=u.role)`, nil},
		{"invalid staff permission", `SELECT count(*) FROM public."Permission" p WHERE id='' OR NOT(resource=ANY($1)) OR NOT(action=ANY($2)) OR NOT EXISTS (SELECT 1 FROM public."Role" r WHERE r.id=p.role)`, []any{catalog.StaffAccess.Resources, catalog.StaffAccess.Actions}},
		{"invalid staff scope", `SELECT count(*) FROM public."RoleDataScope" s WHERE NOT(area=ANY($1)) OR NOT(scope=ANY($2)) OR NOT EXISTS (SELECT 1 FROM public."Role" r WHERE r.id=s.role)`, []any{catalog.Scopes.Areas, catalog.Scopes.Scopes}},
		{"invalid permission override", `SELECT count(*) FROM public."User" WHERE permissions IS NOT NULL AND jsonb_typeof(permissions)<>'object'`, nil},
		{"invalid permission override", `SELECT count(*) FROM public."User" u CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(u.permissions)='object' THEN u.permissions ELSE '{}'::jsonb END) e WHERE jsonb_typeof(e.value)<>'boolean' OR NOT(e.key=ANY($1))`, []any{keys}},
		{"target role conflict", `SELECT count(*) FROM identity.staff_role t LEFT JOIN public."Role" s ON s.id=t.id WHERE s.id IS NULL OR ROW(t.name_en,t.name_ar,t.is_system,t.created_at) IS DISTINCT FROM ROW(s."nameEn",s."nameAr",s."isSystem",s."createdAt" AT TIME ZONE 'UTC')`, nil},
		{"target permission conflict", `SELECT count(*) FROM identity.staff_permission t LEFT JOIN public."Permission" s ON s.id=t.id WHERE s.id IS NULL OR ROW(t.role_id,t.resource,t.action,t.allowed,t.created_at) IS DISTINCT FROM ROW(s.role,s.resource,s.action,s.allowed,s."createdAt" AT TIME ZONE 'UTC')`, nil},
		{"target scope conflict", `SELECT count(*) FROM identity.staff_role_scope t LEFT JOIN public."RoleDataScope" s ON s.role=t.role_id AND s.area=t.area WHERE s.role IS NULL OR t.scope IS DISTINCT FROM s.scope`, nil},
		{"target override conflict", `SELECT count(*) FROM identity.staff_access t LEFT JOIN public."User" s ON s.id=t.subject_id WHERE s.id IS NULL OR ROW(t.permission_overrides,t.updated_at) IS DISTINCT FROM ROW(COALESCE(s.permissions,'{}'::jsonb),s."updatedAt" AT TIME ZONE 'UTC')`, nil},
	}
	for _, check := range checks {
		var bad int64
		if err := tx.QueryRow(ctx, check.query, check.args...).Scan(&bad); err != nil {
			return fmt.Errorf("validate %s: %w", check.name, err)
		}
		if bad > 0 {
			return fmt.Errorf("%d %s(s); reconcile before import", bad, check.name)
		}
	}
	return nil
}
func copyStaffAccess(ctx context.Context, tx pgx.Tx, report *summary) error {
	copies := []struct {
		name, query	string
		count		*int64
	}{
		{"roles", `INSERT INTO identity.staff_role(id,name_en,name_ar,is_system,created_at) SELECT id,"nameEn","nameAr","isSystem","createdAt" AT TIME ZONE 'UTC' FROM public."Role" ON CONFLICT(id) DO NOTHING`, &report.RolesInserted},
		{"permissions", `INSERT INTO identity.staff_permission(id,role_id,resource,action,allowed,created_at) SELECT id,role,resource,action,allowed,"createdAt" AT TIME ZONE 'UTC' FROM public."Permission" ON CONFLICT(id) DO NOTHING`, &report.PermissionsInserted},
		{"scopes", `INSERT INTO identity.staff_role_scope(role_id,area,scope) SELECT role,area,scope FROM public."RoleDataScope" ON CONFLICT(role_id,area) DO NOTHING`, &report.ScopesInserted},
		{"overrides", `INSERT INTO identity.staff_access(realm,subject_id,display_name,permission_overrides,updated_at) SELECT 'staff',id,"fullName",COALESCE(permissions,'{}'::jsonb),"updatedAt" AT TIME ZONE 'UTC' FROM public."User" ON CONFLICT(realm,subject_id) DO NOTHING`, &report.AccessInserted},
	}
	for _, copy := range copies {
		tag, err := tx.Exec(ctx, copy.query)
		if err != nil {
			return fmt.Errorf("copy staff %s: %w", copy.name, err)
		}
		*copy.count = tag.RowsAffected()
	}
	return nil
}
