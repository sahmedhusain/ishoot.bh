import * as React from 'react';
import { getAllBanners } from '@ishoot/database';
import { BannersManagementView } from '../../../../components/cms/BannersManagementView';

export const dynamic = 'force-dynamic';

export default async function BannersManagerPage() {
  const banners = await getAllBanners();

  return <BannersManagementView initialBanners={banners} />;
}
