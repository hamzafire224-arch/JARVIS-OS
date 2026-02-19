# PersonalJARVIS — Supabase Email Templates

## How to Apply

1. Go to **[supabase.com/dashboard](https://supabase.com/dashboard)**
2. Select your **JARVIS-OS** project
3. Click **Authentication** → **Email Templates**
4. For each template below, paste the HTML into the corresponding template field
5. Click **Save**

---

## 1. Confirm Signup

**Template name:** `Confirm signup`

**Subject:** `Welcome to PersonalJARVIS — Verify Your Email`

**HTML Body:**

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:28px 32px;text-align:center;">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;text-align:center;vertical-align:middle;">
              <span style="font-size:18px;">⚡</span>
            </td>
            <td style="padding-left:12px;color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
              PersonalJARVIS
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:36px 32px 28px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Verify your email</h1>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
          Thanks for signing up! Click the button below to verify your email address and activate your account.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 32px;color:white;text-decoration:none;font-weight:600;font-size:15px;">
                Verify Email Address
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
          If the button doesn't work, copy and paste this URL into your browser:<br>
          <a href="{{ .ConfirmationURL }}" style="color:#8b5cf6;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">
          © PersonalJARVIS · You received this because you signed up at app.personaljarvis.dev
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset Password

**Template name:** `Reset password`

**Subject:** `PersonalJARVIS — Reset Your Password`

**HTML Body:**

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:28px 32px;text-align:center;">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;text-align:center;vertical-align:middle;">
              <span style="font-size:18px;">🔒</span>
            </td>
            <td style="padding-left:12px;color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
              PersonalJARVIS
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:36px 32px 28px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Reset your password</h1>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
          We received a request to reset your password. Click the button below to set a new one. If you didn't request this, you can safely ignore this email.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 32px;color:white;text-decoration:none;font-weight:600;font-size:15px;">
                Reset Password
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 16px;color:#9ca3af;font-size:13px;line-height:1.5;">
          If the button doesn't work, copy and paste this URL:<br>
          <a href="{{ .ConfirmationURL }}" style="color:#8b5cf6;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
        <p style="margin:0;padding:12px 16px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:13px;">
          ⚠️ This link expires in 24 hours. If it has expired, request a new one from the login page.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">
          © PersonalJARVIS · You received this because a password reset was requested for your account
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Magic Link (Optional)

**Template name:** `Magic link`

**Subject:** `PersonalJARVIS — Your Login Link`

**HTML Body:**

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <tr>
      <td style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:28px 32px;text-align:center;">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;text-align:center;vertical-align:middle;">
              <span style="font-size:18px;">✨</span>
            </td>
            <td style="padding-left:12px;color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
              PersonalJARVIS
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px 28px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Your login link</h1>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
          Click the button below to sign in to your PersonalJARVIS dashboard. This link is single-use and expires in 1 hour.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 32px;color:white;text-decoration:none;font-weight:600;font-size:15px;">
                Sign In
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0;color:#9ca3af;font-size:13px;">
          <a href="{{ .ConfirmationURL }}" style="color:#8b5cf6;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">
          © PersonalJARVIS · If you didn't request this link, you can safely ignore it
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```
