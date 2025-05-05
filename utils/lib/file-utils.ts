// lib/file-utils.ts
/**
 * Process file names to handle duplicates and clean up display names
 * @param files Array of file objects
 * @returns Processed files with displayName property
 */
export function processFileNames(files: any[]) {
  // Create a map to track name occurrences
  const nameCount: Record<string, number> = {};

  return files.map((file) => {
    // Get base name without extension
    const originalName = file.original_name || "";
    const lastDotIndex = originalName.lastIndexOf(".");
    const baseName =
      lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
    const extension =
      lastDotIndex > 0
        ? originalName.substring(lastDotIndex + 1).toLowerCase()
        : "";

    // Track this name in our counter
    nameCount[baseName] = (nameCount[baseName] || 0) + 1;

    // Create display name with numbering for duplicates
    const count = nameCount[baseName];
    const displayName = count > 1 ? `${baseName}-${count}` : baseName;

    return {
      ...file,
      displayName,
      extension,
    };
  });
}

/**
 * Gets appropriate icon based on file type and original name
 * @param fileType The MIME type of the file
 * @param originalName The original filename
 * @returns JSX Element with the appropriate icon
 */
export function getFileTypeIcon(fileType: string, originalName: string) {
  // Implementation can be moved from components to here
  // This function would be imported and used in both FileList and FileGrid
}
