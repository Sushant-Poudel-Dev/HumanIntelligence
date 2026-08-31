import { createServerClientInstance } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo') ?? searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerClientInstance();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Check if user profile exists, create if not
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

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectTo}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}