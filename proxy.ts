import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/professional-login') || pathname.startsWith('/professional-signup') || pathname.startsWith('/auth/callback');
  const isUserRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/sessions') || pathname.startsWith('/journal') || pathname.startsWith('/progress') || pathname.startsWith('/helpline');
  const isProfessionalRoute = pathname.startsWith('/professional/dashboard') || pathname.startsWith('/professional/clients');

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!session) {
    if (isAuthRoute) {
      return supabaseResponse;
    }
    if (isUserRoute || isProfessionalRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (isUserRoute || isProfessionalRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  const [userProfile, professionalProfile] = await Promise.all([
    supabase.from('users').select('id').eq('auth_id', user.id).single(),
    supabase.from('professionals').select('id, verified').eq('auth_id', user.id).single(),
  ]);

  const isUser = !!userProfile.data;
  const isProfessional = !!professionalProfile.data;
  const professionalData = professionalProfile.data as { id: string; verified: boolean } | null;
  const isVerifiedProfessional = professionalData !== null && professionalData.verified === true;

  if (isAuthRoute) {
    if (isUser) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (isProfessional) {
      return NextResponse.redirect(new URL('/professional/dashboard', request.url));
    }
    return supabaseResponse;
  }

  if (isUserRoute && !isUser) {
    if (isProfessional) {
      return NextResponse.redirect(new URL('/professional/dashboard', request.url));
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isProfessionalRoute && !isVerifiedProfessional) {
    if (isUser) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (isProfessional && !isVerifiedProfessional) {
      return NextResponse.redirect(new URL('/professional/unverified', request.url));
    }
    return NextResponse.redirect(new URL('/professional-login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
