import type { User } from '@neha/shared';

/**
 * Source of truth for note access control.
 *
 * Access rules:
 * 1. Free notes → always accessible
 * 2. Paid notes, no user → locked (sign-in overlay)
 * 3. Paid notes, SUPER_ADMIN or CONTENT_MANAGER → always accessible
 * 4. LIFETIME notes (if tagged) → accessible if user.paidAt is set
 * 5. Paid notes → accessible if user has active PAID plan
 * 6. All other cases → locked (PaywallBanner)
 */
export function canAccessNote(
  user: User | null,
  note: { isPaid: boolean; accessType?: string }
): boolean {
  // Rule 1: Free notes are always accessible
  if (!note.isPaid) return true;

  // Rule 2: Paid notes require authentication
  if (!user) return false;

  // Rule 3: Admin roles bypass the paywall entirely
  if (user.role === 'SUPER_ADMIN' || user.role === 'CONTENT_MANAGER') return true;

  // Rule 4: LIFETIME access (if explicitly tagged)
  if (note.accessType === 'LIFETIME') {
    return user.paidAt !== null;
  }

  // Rule 5: Active PAID plan
  if (user.plan === 'PAID') {
    // null planExpiresAt means no expiry set → treat as indefinitely valid
    if (!user.planExpiresAt) return true;
    return new Date(user.planExpiresAt).getTime() > Date.now();
  }

  // Rule 6: Everything else is locked
  return false;
}
