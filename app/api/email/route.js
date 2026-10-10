import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function verifyIdToken(token) {
  if (!token) return { error: 'missing-token' };
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: 'missing-key' };
  try {
    const { data, error } = await supabase.auth.getUser(token);
    const user = data && data.user;
    if (error || !user) return { error: `lookup:${(error && error.message) || 'no-user'}` };
    const meta = user.user_metadata || {};
    return {
      user: {
        uid: user.id,
        email: user.email || '',
        displayName: meta.name || meta.full_name || '',
      },
    };
  } catch (err) {
    return { error: `network:${err.message}` };
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function welcomeHtml(name) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0c;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0c;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#121215;border:1px solid #26262b;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:34px 30px;text-align:center;">
              <div style="font-size:18px;font-weight:800;letter-spacing:4px;color:#d9ac3d;">FOUNDATORS</div>
              <div style="font-size:22px;font-weight:800;color:#ffffff;margin-top:24px;">Welcome, ${escapeHtml(name)}!</div>
              <p style="font-size:14px;line-height:1.65;color:#a1a1aa;margin:14px 0 0;">You just joined a network of founders who build in public, find co-founders and ship faster &mdash; together.</p>
              <p style="font-size:14px;line-height:1.65;color:#a1a1aa;margin:18px 0 0;text-align:left;">Here is what to do first:</p>
              <p style="font-size:14px;line-height:1.9;color:#a1a1aa;margin:6px 0 0;text-align:left;">&bull;&nbsp; Complete your founder profile<br>&bull;&nbsp; Post your first idea or update<br>&bull;&nbsp; Join a Foundators Voice room</p>
              <a href="https://foundators-flame.vercel.app/home" style="display:inline-block;margin-top:26px;background-color:#d9ac3d;color:#1a1300;font-size:15px;font-weight:800;padding:13px 32px;border-radius:999px;text-decoration:none;">Open Foundators</a>
              <div style="font-size:11px;color:#5b5b64;margin-top:28px;line-height:1.6;">You are receiving this because you created a Foundators account with this address.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }
  const { idToken, type } = body || {};

  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const auth = await verifyIdToken(bearer || idToken || '');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  if (type !== 'welcome') {
    return NextResponse.json({ error: 'unknown-type' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'missing-key',
        hint: 'Add RESEND_API_KEY (Resend dashboard -> API Keys) to the server environment',
      },
      { status: 503 }
    );
  }
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return NextResponse.json(
      {
        error: 'missing-from',
        hint: 'Add EMAIL_FROM using your verified Resend domain, e.g. "FOUNDATORS <hello@yourdomain.com>" (resend.com/domains)',
      },
      { status: 503 }
    );
  }

  const displayName = (auth.user.displayName || '').trim();
  const firstName =
    displayName.split(' ')[0] || (auth.user.email.split('@')[0] || 'Founder');

  const resend = new Resend(apiKey);
  let result;
  try {
    result = await resend.emails.send({
      from,
      to: [auth.user.email],
      subject: 'Welcome to FOUNDATORS',
      html: welcomeHtml(firstName),
      idempotencyKey: `welcome-user/${auth.user.uid}`,
      tags: [
        { name: 'category', value: 'welcome' },
        { name: 'user_id', value: auth.user.uid },
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'network', message: err.message },
      { status: 502 }
    );
  }

  const { data, error } = result;
  if (error) {
    const status =
      error.name === 'rate_limit_exceeded'
        ? 429
        : error.name === 'validation_error'
          ? 422
          : 502;
    return NextResponse.json(
      { error: error.name || 'send-failed', message: error.message },
      { status }
    );
  }
  return NextResponse.json({ ok: true, id: (data && data.id) || null });
}
