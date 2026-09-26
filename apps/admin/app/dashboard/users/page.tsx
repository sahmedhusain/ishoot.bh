import * as React from 'react';
import { getAllUsers } from '@ishoot/database';
import { UsersManagementView } from '../../../components/users/UsersManagementView';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const users = await getAllUsers();
  return <UsersManagementView initialUsers={users} />;
}
