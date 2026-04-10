import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { db } from "./db";
import { mcp_api_keys } from "@shared/schema";
import { eq, and } from "drizzle-orm";

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

const authCodes = new Map<string, { apiKey: string; clientId: string; redirectUri: string; expiresAt: number; codeChallenge?: string; codeChallengeMethod?: string }>();
const oauthClients = new Map<string, { clientId: string; clientSecret: string; redirectUris: string[]; clientName: string; createdAt: number }>();
const accessTokens = new Map<string, { apiKey: string; expiresAt: number }>();

const CODE_EXPIRY_MS = 5 * 60 * 1000;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [code, data] of authCodes) {
    if (data.expiresAt < now) authCodes.delete(code);
  }
  for (const [token, data] of accessTokens) {
    if (data.expiresAt < now) accessTokens.delete(token);
  }
}, 60_000);

export async function validateOAuthToken(token: string): Promise<boolean> {
  const tokenData = accessTokens.get(token);
  if (!tokenData) return false;
  if (tokenData.expiresAt < Date.now()) {
    accessTokens.delete(token);
    return false;
  }

  const keyHash = hashApiKey(tokenData.apiKey);
  const result = await db
    .select()
    .from(mcp_api_keys)
    .where(and(eq(mcp_api_keys.key_hash, keyHash), eq(mcp_api_keys.is_active, true)))
    .limit(1);

  if (result.length > 0) {
    db.update(mcp_api_keys)
      .set({ last_used_at: new Date() })
      .where(eq(mcp_api_keys.id, result[0].id))
      .catch(() => {});
    return true;
  }
  return false;
}

function getBaseUrl(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

function verifyCodeChallenge(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method === "S256") {
    const computed = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
    return computed === codeChallenge;
  }
  return codeVerifier === codeChallenge;
}

export function registerMcpOAuthRoutes(app: Express) {
  app.get("/.well-known/oauth-authorization-server", (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
      code_challenge_methods_supported: ["S256", "plain"],
      scopes_supported: ["mcp:read"],
    });
  });

  app.post("/oauth/register", (req: Request, res: Response) => {
    try {
      const { redirect_uris, client_name } = req.body;

      if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
        res.status(400).json({ error: "invalid_request", error_description: "redirect_uris is required" });
        return;
      }

      const clientId = `mcp_client_${crypto.randomBytes(16).toString("hex")}`;
      const clientSecret = `mcp_secret_${crypto.randomBytes(32).toString("hex")}`;

      oauthClients.set(clientId, {
        clientId,
        clientSecret,
        redirectUris: redirect_uris,
        clientName: client_name || "MCP Client",
        createdAt: Date.now(),
      });

      res.status(201).json({
        client_id: clientId,
        client_secret: clientSecret,
        client_name: client_name || "MCP Client",
        redirect_uris,
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "client_secret_post",
      });
    } catch (error) {
      console.error("OAuth register error:", error);
      res.status(500).json({ error: "server_error" });
    }
  });

  app.get("/oauth/authorize", (req: Request, res: Response) => {
    const { client_id, redirect_uri, state, response_type, code_challenge, code_challenge_method, scope } = req.query as Record<string, string>;

    if (response_type !== "code") {
      res.status(400).send("unsupported response_type");
      return;
    }

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MPBF - تفويض الوصول لـ MCP</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { background: #1e293b; border-radius: 16px; padding: 40px; max-width: 440px; width: 90%; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo h1 { font-size: 28px; color: #60a5fa; margin-bottom: 4px; }
    .logo p { color: #94a3b8; font-size: 14px; }
    .info { background: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #334155; }
    .info p { font-size: 13px; color: #94a3b8; line-height: 1.8; }
    .info strong { color: #60a5fa; }
    label { display: block; margin-bottom: 8px; font-size: 14px; color: #cbd5e1; }
    input[type="password"] { width: 100%; padding: 12px 16px; border: 2px solid #334155; border-radius: 8px; background: #0f172a; color: #e2e8f0; font-size: 16px; direction: ltr; text-align: left; transition: border-color 0.2s; }
    input[type="password"]:focus { outline: none; border-color: #60a5fa; }
    .btn { width: 100%; padding: 14px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 16px; transition: all 0.2s; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-primary:disabled { background: #475569; cursor: not-allowed; }
    .btn-cancel { background: transparent; color: #94a3b8; border: 1px solid #334155; margin-top: 8px; }
    .btn-cancel:hover { background: #334155; }
    .error { color: #f87171; font-size: 13px; margin-top: 8px; display: none; }
    .spinner { display: none; width: 20px; height: 20px; border: 2px solid #ffffff44; border-top: 2px solid white; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🏭 MPBF</h1>
      <p>نظام إدارة مصنع الأكياس البلاستيكية</p>
    </div>
    <div class="info">
      <p>
        يطلب <strong>ChatGPT</strong> الإذن للوصول إلى بيانات المصنع (قراءة فقط).
        <br>أدخل مفتاح API الخاص بـ MCP للمتابعة.
        <br>يمكنك إنشاء مفتاح من صفحة <strong>إعدادات MCP</strong> في التطبيق.
      </p>
    </div>
    <form id="authForm">
      <label for="apiKey">مفتاح API</label>
      <input type="password" id="apiKey" name="apiKey" placeholder="mpbf_..." required autocomplete="off">
      <div class="error" id="errorMsg"></div>
      <button type="submit" class="btn btn-primary" id="submitBtn">
        <span id="btnText">تفويض الوصول</span>
        <div class="spinner" id="spinner"></div>
      </button>
      <button type="button" class="btn btn-cancel" onclick="cancelAuth()">إلغاء</button>
    </form>
  </div>
  <script>
    const form = document.getElementById('authForm');
    const errorMsg = document.getElementById('errorMsg');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.style.display = 'none';
      submitBtn.disabled = true;
      btnText.style.display = 'none';
      spinner.style.display = 'block';
      
      const apiKey = document.getElementById('apiKey').value.trim();
      if (!apiKey) {
        showError('الرجاء إدخال مفتاح API');
        return;
      }
      
      try {
        const res = await fetch('/oauth/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            client_id: '${client_id || ""}',
            redirect_uri: '${redirect_uri || ""}',
            state: '${state || ""}',
            code_challenge: '${code_challenge || ""}',
            code_challenge_method: '${code_challenge_method || ""}',
            scope: '${scope || ""}'
          })
        });
        
        const data = await res.json();
        if (data.redirect) {
          window.location.href = data.redirect;
        } else {
          showError(data.error_description || 'مفتاح API غير صالح');
        }
      } catch (err) {
        showError('حدث خطأ في الاتصال');
      }
    });
    
    function showError(msg) {
      errorMsg.textContent = msg;
      errorMsg.style.display = 'block';
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
    }
    
    function cancelAuth() {
      const redirectUri = '${redirect_uri || ""}';
      const state = '${state || ""}';
      if (redirectUri) {
        window.location.href = redirectUri + '?error=access_denied&state=' + encodeURIComponent(state);
      } else {
        window.close();
      }
    }
  </script>
</body>
</html>`;
    
    res.type("html").send(html);
  });

  app.post("/oauth/authorize", async (req: Request, res: Response) => {
    try {
      const { api_key, client_id, redirect_uri, state, code_challenge, code_challenge_method } = req.body;

      if (!api_key) {
        res.status(400).json({ error: "invalid_request", error_description: "مفتاح API مطلوب" });
        return;
      }

      const keyHash = hashApiKey(api_key);
      const result = await db
        .select()
        .from(mcp_api_keys)
        .where(and(eq(mcp_api_keys.key_hash, keyHash), eq(mcp_api_keys.is_active, true)))
        .limit(1);

      if (result.length === 0) {
        res.status(401).json({ error: "invalid_grant", error_description: "مفتاح API غير صالح أو غير نشط" });
        return;
      }

      const code = crypto.randomBytes(32).toString("hex");
      authCodes.set(code, {
        apiKey: api_key,
        clientId: client_id || "",
        redirectUri: redirect_uri || "",
        expiresAt: Date.now() + CODE_EXPIRY_MS,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method || "plain",
      });

      if (redirect_uri) {
        const url = new URL(redirect_uri);
        url.searchParams.set("code", code);
        if (state) url.searchParams.set("state", state);
        res.json({ redirect: url.toString() });
      } else {
        res.json({ code });
      }
    } catch (error) {
      console.error("OAuth authorize error:", error);
      res.status(500).json({ error: "server_error" });
    }
  });

  app.post("/oauth/token", async (req: Request, res: Response) => {
    try {
      const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier } = req.body;

      if (grant_type !== "authorization_code") {
        res.status(400).json({ error: "unsupported_grant_type" });
        return;
      }

      if (!code) {
        res.status(400).json({ error: "invalid_request", error_description: "code is required" });
        return;
      }

      const codeData = authCodes.get(code);
      if (!codeData) {
        res.status(400).json({ error: "invalid_grant", error_description: "Invalid or expired authorization code" });
        return;
      }

      if (codeData.expiresAt < Date.now()) {
        authCodes.delete(code);
        res.status(400).json({ error: "invalid_grant", error_description: "Authorization code expired" });
        return;
      }

      if (codeData.codeChallenge && code_verifier) {
        if (!verifyCodeChallenge(code_verifier, codeData.codeChallenge, codeData.codeChallengeMethod || "plain")) {
          authCodes.delete(code);
          res.status(400).json({ error: "invalid_grant", error_description: "code_verifier mismatch" });
          return;
        }
      }

      authCodes.delete(code);

      const accessToken = crypto.randomBytes(48).toString("hex");
      accessTokens.set(accessToken, {
        apiKey: codeData.apiKey,
        expiresAt: Date.now() + TOKEN_EXPIRY_MS,
      });

      res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: Math.floor(TOKEN_EXPIRY_MS / 1000),
        scope: "mcp:read",
      });
    } catch (error) {
      console.error("OAuth token error:", error);
      res.status(500).json({ error: "server_error" });
    }
  });

  console.log("✅ MCP OAuth 2.1 routes registered");
}
