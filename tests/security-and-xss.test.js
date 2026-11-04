import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  normalizeThemeColor,
  formatNewsContent,
  applyInlineColors
} from '../src/lib/newsContent.js';
import {
  createVerifiedAccessGuard,
  createContractorAccessGuard
} from '../src/lib/verifiedAccess.js';

test('escapeHtml neutralizes all dangerous HTML characters', () => {
  const payload = '<script>alert("XSS & harm")</script>\'';
  const escaped = escapeHtml(payload);
  assert.equal(escaped.includes('<script>'), false);
  assert.equal(escaped.includes('</script>'), false);
  assert.equal(escaped, '&lt;script&gt;alert(&quot;XSS &amp; harm&quot;)&lt;/script&gt;&#39;');
});

test('normalizeThemeColor rejects malicious CSS injections and falls back safely', () => {
  assert.equal(normalizeThemeColor('#123456'), '#123456');
  assert.equal(normalizeThemeColor('#ABCDEF'), '#ABCDEF');
  assert.equal(normalizeThemeColor('red; background:url(evil)'), '#b91c1c');
  assert.equal(normalizeThemeColor('javascript:alert(1)'), '#b91c1c');
  assert.equal(normalizeThemeColor(''), '#b91c1c');
  assert.equal(normalizeThemeColor(null), '#b91c1c');
});

test('formatNewsContent neutralizes stored XSS payloads in paragraphs and lists', () => {
  const maliciousText = `
<img src=x onerror=alert(1)>
[red]<script>evil()</script>[/red]

• <iframe src="evil.com"></iframe>
• Normal bullet point

Single Line Subheading <script>alert(2)</script>:
`;
  const formatted = formatNewsContent(maliciousText, '#2563eb');
  assert.equal(formatted.includes('<img'), false);
  assert.equal(formatted.includes('<script'), false);
  assert.equal(formatted.includes('<iframe'), false);
  assert.ok(formatted.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(formatted.includes('&lt;script&gt;evil()&lt;/script&gt;'));
  assert.ok(formatted.includes('&lt;iframe src=&quot;evil.com&quot;&gt;&lt;/iframe&gt;'));
});

test('createVerifiedAccessGuard unsubscribes cleanly and ignores stale events', async () => {
  let unsubscribed = false;
  let currentState = null;
  let signedOutCalled = false;

  const mockClient = {
    auth: {
      onAuthStateChange(callback) {
        return {
          data: {
            subscription: {
              unsubscribe() {
                unsubscribed = true;
              }
            }
          }
        };
      },
      async getUser() {
        return { data: { user: { id: 'usr-1' } }, error: null };
      }
    }
  };

  const stop = createVerifiedAccessGuard(mockClient, {
    onStateChange(s) {
      currentState = s;
    },
    onSignedOut() {
      signedOutCalled = true;
    }
  });

  // Wait for initial queueMicrotask
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(currentState, 'allowed');
  assert.equal(signedOutCalled, false);

  stop();
  assert.equal(unsubscribed, true);
});

test('createContractorAccessGuard fails closed when RPC is missing or fails', async () => {
  let currentState = null;

  const mockClient = {
    auth: {
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async getUser() {
        return { data: { user: { id: 'admin-uuid' } }, error: null };
      }
    },
    async rpc(name) {
      assert.equal(name, 'contractor_access_status');
      // Simulate RPC not existing on remote Supabase
      return { data: null, error: { message: 'function contractor_access_status() does not exist' } };
    }
  };

  createContractorAccessGuard(mockClient, {
    onStateChange(s) {
      currentState = s;
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(currentState, 'unavailable');
});

test('createContractorAccessGuard allows only verified admin and denies non-admin', async () => {
  let adminState = null;
  let nonAdminState = null;

  const adminClient = {
    auth: {
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async getUser() {
        return { data: { user: { id: 'admin-uuid' } }, error: null };
      }
    },
    async rpc() {
      return { data: { is_admin: true }, error: null };
    }
  };

  createContractorAccessGuard(adminClient, {
    onStateChange(s) {
      adminState = s;
    }
  });

  const nonAdminClient = {
    auth: {
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async getUser() {
        return { data: { user: { id: 'user-uuid' } }, error: null };
      }
    },
    async rpc() {
      return { data: { is_admin: false }, error: null };
    }
  };

  createContractorAccessGuard(nonAdminClient, {
    onStateChange(s) {
      nonAdminState = s;
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(adminState, 'allowed');
  assert.equal(nonAdminState, 'denied');
});
