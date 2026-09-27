import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  const expectedSecret =
    process.env.REVALIDATION_SECRET || 'ishoot-revalidate-secret-2026';

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tags, paths } = await req.json();

    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag === 'string') {
          revalidateTag(tag);
        }
      }
    }

    if (Array.isArray(paths)) {
      for (const path of paths) {
        if (typeof path === 'string') {
          revalidatePath(path);
        }
      }
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to revalidate' },
      { status: 500 }
    );
  }
}
