import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const reqPath = req.path;
      const pathAfterObjects = reqPath.replace(/^\/objects\//, "");

      // Try serving from public bucket paths directly
      try {
        const publicPaths = objectStorageService.getPublicObjectSearchPaths();
        for (const searchPath of publicPaths) {
          const normalized = searchPath.startsWith('/') ? searchPath : `/${searchPath}`;
          const parts = normalized.split('/');
          const bucketName = parts[1];
          const bucketPrefix = parts.slice(2).join('/');

          // Check if the requested path starts with the bucket prefix (e.g. "public/")
          if (bucketPrefix && pathAfterObjects.startsWith(bucketPrefix + '/')) {
            // Path already includes the prefix, use it directly
            const bucket = objectStorageClient.bucket(bucketName);
            const file = bucket.file(pathAfterObjects);
            const [exists] = await file.exists();
            if (exists) {
              return await objectStorageService.downloadObject(file, res);
            }
          }
          // Also try prepending the prefix for relative paths
          const fullObjectName = bucketPrefix ? `${bucketPrefix}/${pathAfterObjects}` : pathAfterObjects;
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(fullObjectName);
          const [exists] = await file.exists();
          if (exists) {
            return await objectStorageService.downloadObject(file, res);
          }
        }
      } catch (_e) {
        // Public search failed, try private
      }

      // Fall back to private entity file
      const objectFile = await objectStorageService.getObjectEntityFile(reqPath);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

