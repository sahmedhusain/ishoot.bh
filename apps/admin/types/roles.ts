export interface RoleWithGrants {
  id: string;
  nameEn: string;
  nameAr: string;
  isSystem: boolean;
  userCount: number;
  grants: Record<string, boolean>;
  scopes: Record<string, string>;
}
