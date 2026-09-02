import "dotenv/config";
import type { NextFunction, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      familyId?: string;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const supabaseServerKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabasePublishableKey;
const authRequired = process.env.REQUIRE_AUTH === "true" || Boolean(supabaseUrl && supabaseServerKey);

const supabase =
  supabaseUrl && supabaseServerKey
    ? createClient(supabaseUrl, supabaseServerKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

export async function requireSupabaseUser(req: Request, res: Response, next: NextFunction) {
  if (!authRequired || !supabase) {
    return next();
  }

  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error?.message?.toLowerCase().includes("fetch failed")) {
    return res.status(503).json({ error: "Authentication provider unavailable", details: error.message });
  }

  if (error || !data.user) {
    const details = process.env.NODE_ENV === "production" ? undefined : error?.message;
    return res.status(401).json({ error: "Invalid authentication token", details });
  }

  req.userId = data.user.id;
  req.userEmail = data.user.email ?? undefined;
  return next();
}
