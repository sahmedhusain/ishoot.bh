import { NextRequest, NextResponse } from 'next/server';
import {
  verifyUserCredentials,
  createSession,
  createActivityLog,
} from '@ishoot/database';
import { signSessionToken } from '../../../../lib/jwt';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await verifyUserCredentials(email, password);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials or inactive account' },
        { status: 401 }
      );
    }

    // Generate signed JWT
    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    // Persist Session in DB
    await createSession({
      userId: user.id,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    });

    // Record Audit Activity
    await createActivityLog({
      user_id: user.id,
      action: 'login',
      entity_type: 'auth',
      entity_id: user.id,
      details: { role: user.role, department: user.department },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Return response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatar_url,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
