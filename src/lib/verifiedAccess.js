/** @typedef {'checking' | 'allowed' | 'denied' | 'signed_out' | 'unavailable'} AccessState */
/**
 * @typedef {object} AccessOptions
 * @property {(state: AccessState) => void} onStateChange
 * @property {() => void} [onSignedOut]
 * @property {(user: import('@supabase/supabase-js').User) => Promise<'allowed' | 'denied' | 'unavailable'>} [authorize]
 */

/**
 * Verify identity outside the auth callback and discard results from older sessions.
 * Cleanup is synchronous so Svelte can unsubscribe before a component unmounts.
 * This UI gate does not replace database RLS or verify deployed policies.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {AccessOptions} options
 * @returns {() => void}
 */
export function createVerifiedAccessGuard(client, options) {
  let disposed = false;
  let revision = 0;
  /** @type {{ unsubscribe: () => void } | undefined} */
  let subscription;

  /** @param {AccessState} state */
  function publish(state) {
    if (!disposed) options.onStateChange(state);
  }

  function signedOut() {
    revision += 1;
    publish('signed_out');
    options.onSignedOut?.();
  }

  /** @param {number} ticket */
  async function validate(ticket) {
    if (disposed || ticket !== revision) return;
    try {
      const { data, error } = await client.auth.getUser();
      if (disposed || ticket !== revision) return;
      if (error) {
        publish('unavailable');
        return;
      }
      if (!data?.user) {
        signedOut();
        return;
      }
      const decision = options.authorize ? await options.authorize(data.user) : 'allowed';
      if (disposed || ticket !== revision) return;
      publish(decision === 'allowed' || decision === 'denied' ? decision : 'unavailable');
    } catch {
      if (!disposed && ticket === revision) publish('unavailable');
    }
  }

  function checkAgain() {
    const ticket = ++revision;
    publish('checking');
    // Never await Supabase auth/RPC operations inside onAuthStateChange.
    queueMicrotask(() => { void validate(ticket); });
  }

  publish('checking');
  try {
    const result = client.auth.onAuthStateChange((event, session) => {
      if (disposed) return;
      if (event === 'SIGNED_OUT' || !session) signedOut();
      else checkAgain();
    });
    subscription = result.data.subscription;
    if (!subscription || typeof subscription.unsubscribe !== 'function') {
      throw new Error('Auth subscription unavailable');
    }
    if (revision === 0) checkAgain();
  } catch {
    revision += 1;
    publish('unavailable');
  }

  return () => {
    if (disposed) return;
    disposed = true;
    revision += 1;
    subscription?.unsubscribe();
  };
}

/**
 * Require the server's explicit membership decision. Missing RPCs and malformed
 * responses deny access; this must never fall back to "any authenticated user".
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {Omit<AccessOptions, 'authorize'>} options
 */
export function createContractorAccessGuard(client, options) {
  return createVerifiedAccessGuard(client, {
    ...options,
    async authorize() {
      const { data, error } = await client.rpc('contractor_access_status');
      if (error || !data || typeof data !== 'object' || Array.isArray(data) ||
          !Object.hasOwn(data, 'is_admin') || typeof data.is_admin !== 'boolean') {
        return 'unavailable';
      }
      return data.is_admin === true ? 'allowed' : 'denied';
    }
  });
}
