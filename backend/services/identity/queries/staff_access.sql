SELECT resource,action,allowed FROM identity.staff_permission WHERE role_id=$1;
SELECT area,scope FROM identity.staff_role_scope WHERE role_id=$1;
SELECT permission_overrides FROM identity.staff_access WHERE realm='staff' AND subject_id=$1;
SELECT roles,active FROM identity.account WHERE realm='staff' AND subject_id=$1;
