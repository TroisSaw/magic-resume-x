// 存储文件句柄和配置信息
const DB_NAME = "FileHandleDB";
const HANDLE_STORE = "handles";
const CONFIG_STORE = "config";
const DB_VERSION = 2;

let db: IDBDatabase | null = null;

const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve();
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE);
      }
    };
  });
};

export const storeFileHandle = async (
  key: string,
  handle: FileSystemHandle
): Promise<void> => {
  await initDB();
  if (!db) throw new Error("Database not initialized");

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HANDLE_STORE, "readwrite");
    const store = transaction.objectStore(HANDLE_STORE);
    const request = store.put(handle, key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getFileHandle = async (
  key: string
): Promise<FileSystemHandle | null> => {
  await initDB();
  if (!db) throw new Error("Database not initialized");

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HANDLE_STORE, "readonly");
    const store = transaction.objectStore(HANDLE_STORE);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

export const storeConfig = async (key: string, value: any): Promise<void> => {
  await initDB();
  if (!db) throw new Error("Database not initialized");

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONFIG_STORE, "readwrite");
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.put(value, key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getConfig = async (key: string): Promise<any> => {
  await initDB();
  if (!db) throw new Error("Database not initialized");

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONFIG_STORE, "readonly");
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

export const verifyPermission = async (
  handle: FileSystemHandle,
  mode: FileSystemPermissionMode = "readwrite"
): Promise<boolean> => {
  if (!handle) {
    return false;
  }

  const options = { mode };

  // 检查当前权限
  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }

  // 请求权限
  if ((await handle.requestPermission(options)) === "granted") {
    return true;
  }

  return false;
};

// ==================== Firefox 兼容：传统文件选择 ====================

/**
 * 检测浏览器是否支持 File System Access API (showDirectoryPicker)
 */
export const isFileSystemAccessSupported = (): boolean => {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
};

/**
 * Firefox 兼容：使用 <input type="file" webkitdirectory> 选择文件夹
 * 返回用户选择的文件列表，以及一个模拟的目录句柄（用于存储到 IndexedDB）
 */
export const selectDirectoryFallback = (): Promise<{
  files: File[];
  directoryName: string;
}> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    (input as any).webkitdirectory = true;
    (input as any).directory = true;
    input.multiple = true;
    input.style.display = "none";

    const cleanup = () => {
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    input.addEventListener("change", () => {
      const files = Array.from(input.files || []);
      cleanup();
      if (files.length === 0) {
        reject(new Error("No files selected"));
        return;
      }
      const directoryName = files[0].webkitRelativePath?.split("/")[0] || "sync";
      resolve({ files, directoryName });
    });

    input.addEventListener("cancel", () => {
      cleanup();
      reject(new Error("User cancelled"));
    });

    document.body.appendChild(input);
    input.click();
  });
};

/**
 * Firefox 兼容：从文件列表中读取简历 JSON 文件
 */
export const readResumeFilesFromFileList = async (
  files: File[],
  updateResumeFromFile: (resume: any, sourceModifiedAt?: number) => boolean
): Promise<{ synced: number; skipped: number; failed: number }> => {
  const result = { synced: 0, skipped: 0, failed: 0 };

  for (const file of files) {
    if (!file.name.endsWith(".json")) {
      result.skipped++;
      continue;
    }

    try {
      const content = await file.text();
      const resumeData = JSON.parse(content);

      if (!resumeData || typeof resumeData.id !== "string") {
        result.skipped++;
        continue;
      }

      const imported = updateResumeFromFile(resumeData, file.lastModified);
      if (imported) {
        result.synced++;
      } else {
        result.skipped++;
      }
    } catch (error) {
      result.failed++;
      console.error(`Error reading resume file "${file.name}":`, error);
    }
  }

  return result;
};

/**
 * Firefox 兼容：将简历数据导出为文件下载（批量导出到同一文件夹）
 */
export const exportResumeAsFileDownload = (
  resumeData: any,
  fileName?: string
): void => {
  const json = JSON.stringify(resumeData, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName || resumeData.title || "resume"}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
