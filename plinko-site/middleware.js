import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/account(.*)', '/admin(.*)', '/crm(.*)', '/api/crm(.*)', '/copilot(.*)', '/api/copilot(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // `app.` is the Pocket entry point; the same Next app also owns the public
  // marketing site, so only this hostname sends its root to the member portal.
  if (req.nextUrl.pathname === '/' && req.headers.get('host')?.toLowerCase().startsWith('app.plinkosolutions.com')) {
    return NextResponse.redirect(new URL('/account', req.url));
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
