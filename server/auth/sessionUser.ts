import { Request } from "express";
import { storage } from "../storage";
import type { SafeUser } from "@shared/schema";
import { logger } from "../lib/logger";

/**
 * Resolves the current user from either username/password session or Replit Auth session
 * Returns a normalized SafeUser object for consistency across the application
 * 
 * Priority order:
 * 1. Check req.session.userId (username/password auth)
 * 2. Check req.user?.claims.sub (Replit Auth)
 * 
 * @param req - Express request object
 * @returns SafeUser object or null if no authenticated session found
 */
export async function resolveSessionUser(req: Request): Promise<SafeUser | null> {
  try {
    // First, check for traditional username/password session
    if (req.session?.userId && typeof req.session.userId === "number") {
      const user = await storage.getUserById(req.session.userId);
      if (user && user.status === "active") {
        logger.debug("User resolved from session.userId", req.session.userId);
        const { password, ...safeUser } = user;
        return safeUser;
      } else {
        logger.debug("Session userId found but user not active or not found");
      }
    }

    // Second, check for Replit Auth session
    const replitUser = req.user as any;
    if (replitUser?.claims?.sub) {
      const replitUserId = replitUser.claims.sub;
      const user = await storage.getUserByReplitId(replitUserId);
      
      if (user && user.status === "active") {
        logger.debug("User resolved from Replit Auth", replitUserId);
        
        // Store the numeric user ID in session for backward compatibility with existing middleware
        // This allows requireAuth and other middleware to work with both auth types
        if (!req.session.userId) {
          req.session.userId = user.id;
          // Save session asynchronously
          req.session.save((err: any) => {
            if (err) {
              logger.error("Error saving session after Replit auth", err);
            }
          });
        }
        
        const { password, ...safeUser } = user;
        return safeUser;
      } else {
        logger.debug("Replit user ID found but user not active or not found");
      }
    }

    logger.debug("No authenticated session found");
    return null;
  } catch (error) {
    logger.error("Error resolving session user", error);
    return null;
  }
}

/**
 * Middleware to require authentication from either auth type
 * Alternative to the existing requireAuth middleware that works with both systems
 */
export async function requireUnifiedAuth(req: Request, res: any, next: any) {
  const user = await resolveSessionUser(req);
  
  if (!user) {
    return res.status(401).json({ 
      message: "Unauthorized",
      success: false 
    });
  }
  
  // Attach user to request for downstream handlers
  (req as any).currentUser = user;
  next();
}
