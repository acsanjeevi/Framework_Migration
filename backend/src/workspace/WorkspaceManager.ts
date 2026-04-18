import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

// ── Workspace root lives next to the backend source ──────────────────────────
export const WORKSPACE_ROOT = path.resolve(process.cwd(), 'workspace');
export const INPUT_ROOT = path.join(WORKSPACE_ROOT, 'INPUT');
export const OUTPUT_ROOT = path.join(WORKSPACE_ROOT, 'OUTPUT');

// Extensions the migration pipeline can handle
const SUPPORTED_EXTENSIONS = new Set(['.ts', '.js', '.java', '.py', '.feature', '.xml']);

// ─────────────────────────────────────────────────────────────────────────────
// Shared types (mirrored in frontend types/api.ts)
// ─────────────────────────────────────────────────────────────────────────────

export interface FolderNode {
  name: string;
  /** Path relative to the INPUT or OUTPUT root for this job */
  path: string;
  type: 'file' | 'folder';
  size?: number;
  extension?: string;
  children?: FolderNode[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Recursively build a FolderNode tree from a directory on disk. */
function buildTree(dirPath: string, rootDir: string): FolderNode[] {
  if (!fs.existsSync(dirPath)) return [];

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .sort((a, b) => {
      // Folders first, then files, both alphabetically
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((entry) => {
      const full = path.join(dirPath, entry.name);
      const rel = path.relative(rootDir, full).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: rel,
          type: 'folder' as const,
          children: buildTree(full, rootDir),
        };
      }

      const { size } = fs.statSync(full);
      const extension = path.extname(entry.name).toLowerCase();
      return { name: entry.name, path: rel, type: 'file' as const, size, extension };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface ZipExtractionResult {
  inputDir: string;
  tree: FolderNode[];
  extractedFiles: string[];   // relative paths of supported files
  skippedFiles: string[];     // relative paths of unsupported files
}

/**
 * Extract a ZIP archive to workspace/INPUT/<jobId>.
 * Only files with supported extensions are written to disk.
 * Returns the folder tree + lists of extracted/skipped files.
 */
export function extractZipToInput(zipFilePath: string, jobId: string): ZipExtractionResult {
  const inputDir = path.join(INPUT_ROOT, jobId);
  fs.mkdirSync(inputDir, { recursive: true });

  const zip = new AdmZip(zipFilePath);
  const extractedFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;

    const entryName = entry.entryName.replace(/\\/g, '/');
    const ext = path.extname(entryName).toLowerCase();

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      skippedFiles.push(entryName);
      continue;
    }

    const target = path.join(inputDir, entryName);
    // Guard against path traversal
    if (!target.startsWith(inputDir + path.sep) && target !== inputDir) {
      skippedFiles.push(entryName);
      continue;
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.getData());
    extractedFiles.push(entryName);
  }

  return {
    inputDir,
    tree: buildTree(inputDir, inputDir),
    extractedFiles,
    skippedFiles,
  };
}

/**
 * Copy plain (non-zip) uploaded files to workspace/INPUT/<jobId>.
 * Returns the folder tree.
 */
export function copyFilesToInput(
  files: Array<{ originalname: string; path: string }>,
  jobId: string
): { inputDir: string; tree: FolderNode[] } {
  const inputDir = path.join(INPUT_ROOT, jobId);
  fs.mkdirSync(inputDir, { recursive: true });

  for (const f of files) {
    const safe = path.basename(f.originalname).replace(/[^a-zA-Z0-9._\-]/g, '_');
    fs.copyFileSync(f.path, path.join(inputDir, safe));
  }

  return { inputDir, tree: buildTree(inputDir, inputDir) };
}

/**
 * Write migrated output files to workspace/OUTPUT/<jobId>.
 * Returns the updated folder tree for the job.
 */
export function writeOutputFiles(
  jobId: string,
  files: Array<{ name: string; content: string }>
): FolderNode[] {
  const outputDir = path.join(OUTPUT_ROOT, jobId);
  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of files) {
    const fp = path.join(outputDir, file.name);
    // Guard against path traversal
    if (!fp.startsWith(outputDir + path.sep) && fp !== outputDir) continue;
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, file.content, 'utf-8');
  }

  return buildTree(outputDir, outputDir);
}

/** Return the OUTPUT folder tree for a completed job (read-only). */
export function getOutputTree(jobId: string): FolderNode[] {
  return buildTree(path.join(OUTPUT_ROOT, jobId), path.join(OUTPUT_ROOT, jobId));
}
