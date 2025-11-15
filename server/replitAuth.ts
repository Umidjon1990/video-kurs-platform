// Replit Auth integration
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // Required for cross-site auth to work in modern browsers
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  // Check if user exists
  const existingUser = await storage.getUser(claims["sub"]);
  
  if (existingUser) {
    // User exists, only update profile info, keep existing role
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: existingUser.role, // preserve existing role
    });
  } else {
    // New user, set default role
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: 'student', // default role for new users
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (process.env.REPLIT_DOMAINS) {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }

    app.get("/api/login", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any, info: any) => {
        if (err) {
          console.error('[OIDC Auth] Authentication error:', err);
          return next(err);
        }
        
        if (!user) {
          console.log('[OIDC Auth] Authentication failed:', info);
          return res.redirect("/api/login");
        }
        
        req.logIn(user, async (loginErr) => {
          if (loginErr) {
            console.error('[OIDC Auth] Login error:', loginErr);
            return next(loginErr);
          }
          
          try {
            const { db } = await import("./db");
            const { sql } = await import("drizzle-orm");
            const userId = user.claims?.sub;
            const currentSessionId = req.sessionID;
            
            if (userId && currentSessionId) {
              await db.execute(sql`
                DELETE FROM sessions 
                WHERE sess::jsonb->'passport'->'user'->'claims'->>'sub' = ${userId}
                AND sid != ${currentSessionId}
              `);
              
              console.log(`[Session Management] Destroyed old OIDC sessions for user ${userId}, keeping session ${currentSessionId}`);
            }
          } catch (sessionError: any) {
            console.error('[Session Management] Error destroying old OIDC sessions:', sessionError);
          }
          
          const returnTo = (req.session as any).returnTo || "/";
          delete (req.session as any).returnTo;
          return res.redirect(returnTo);
        });
      })(req, res, next);
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });
  } else {
    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });
  }

  // Local Strategy for phone/email + password login
  passport.use('local', new LocalStrategy(
    {
      usernameField: 'username', // can be phone or email
      passwordField: 'password'
    },
    async (username, password, done) => {
      try {
        // Find user by phone or email
        const user = await storage.getUserByPhoneOrEmail(username);
        
        if (!user) {
          return done(null, false, { message: 'Foydalanuvchi topilmadi' });
        }
        
        if (!user.passwordHash) {
          return done(null, false, { message: 'Parol sozlanmagan' });
        }
        
        // Check user status
        if (user.status === 'pending') {
          return done(null, false, { message: 'Akkauntingiz administratorning tasdig\'ini kutmoqda' });
        }
        
        if (user.status === 'rejected') {
          return done(null, false, { message: 'Akkauntingiz rad etilgan. Iltimos, administrator bilan bog\'laning' });
        }
        
        // Compare password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return done(null, false, { message: 'Parol noto\'g\'ri' });
        }
        
        // Create user object for session (same format as OIDC)
        const sessionUser = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
            role: user.role, // Include role for access checks
          },
          access_token: null,
          refresh_token: null,
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
        };
        
        return done(null, sessionUser);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // For local auth (no access_token), just check if authenticated
  if (!user.access_token) {
    // Local auth session - check if expired
    if (user.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (now > user.expires_at) {
        return res.status(401).json({ message: "Session expired" });
      }
    }
    return next();
  }

  // OIDC auth session - check expiry and refresh if needed
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  if (!user?.claims) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Use role from session claims if available (local auth)
  if (user.claims.role) {
    if (user.claims.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  }
  
  // Fallback to DB for OIDC sessions (no role in claims)
  const dbUser = await storage.getUser(user.claims.sub);
  if (!dbUser || dbUser.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  // Cache role in session for next requests
  user.claims.role = dbUser.role;
  next();
};

export const isInstructor: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  if (!user?.claims) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Use role from session claims if available (local auth)
  if (user.claims.role) {
    if (user.claims.role !== 'instructor' && user.claims.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  }
  
  // Fallback to DB for OIDC sessions (no role in claims)
  const dbUser = await storage.getUser(user.claims.sub);
  if (!dbUser || (dbUser.role !== 'instructor' && dbUser.role !== 'admin')) {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  // Cache role in session for next requests
  user.claims.role = dbUser.role;
  next();
};
