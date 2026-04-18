import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// Augment Express Request to carry an upload session directory per request
declare global {
  namespace Express {
    interface Request {
      uploadSessionId?: string;
    }
  }
}

const ALLOWED_EXTENSIONS = new Set(['.ts', '.js', '.java', '.py', '.feature', '.xml', '.zip']);

export const UPLOAD_CONFIG = {
  maxFileSizeBytes: 5 * 1024 * 1024 * 1024, // 5 GB
  maxFiles: 50,
  allowedExtensions: Array.from(ALLOWED_EXTENSIONS),
};

const storage = multer.diskStorage({
  destination(req: Request, _file, cb) {
    // Reuse the session directory created by assignUploadSession
    const sessionId = req.uploadSessionId ?? uuidv4();
    const uploadDir = path.join(os.tmpdir(), 'migration-tool', sessionId);
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    // Sanitise: strip path separators and non-safe characters
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type '${ext}' is not allowed. Allowed types: ${UPLOAD_CONFIG.allowedExtensions.join(', ')}`
      )
    );
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSizeBytes,
    files: UPLOAD_CONFIG.maxFiles,
  },
});

/** Creates a unique upload session ID and attaches it to the request. Must run before handleUpload. */
export function assignUploadSession(req: Request, _res: Response, next: NextFunction): void {
  req.uploadSessionId = uuidv4();
  next();
}

/** Wraps multer.array so that MulterError and fileFilter errors are returned as structured 400 responses. */
export function handleUpload(req: Request, res: Response, next: NextFunction): void {
  upload.array('files')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ status: 'error', code: err.code, message: err.message });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ status: 'error', message: err.message });
      return;
    }
    next();
  });
}
