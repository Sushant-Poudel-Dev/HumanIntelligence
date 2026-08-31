import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo') ?? searchParams.get('next') ?? '/dashboard';

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', authUser.id)
          .single();

        if (!existingUser) {
          const displayName = authUser.user_metadata?.full_name
            || authUser.user_metadata?.name
            || authUser.email?.split('@')[0]
            || 'User';

          await supabase.from('users').insert({
            auth_id: authUser.id,
            display_name: displayName.substring(0, 30),
          });
        }
      }

      const redirectUrl = new URL(redirectTo, request.url);
      const response = NextResponse.redirect(redirectUrl);

      supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
        response.cookies.set(name, value, options);
      });

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}