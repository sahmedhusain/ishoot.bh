export interface RoleWithGrants {
  id: string;
  nameEn: string;
  nameAr: string;
  isSystem: boolean;
  userCount: number;
  /** Map of "resource:action" to allowed. */
  grants: Record<string, boolean>;
}
