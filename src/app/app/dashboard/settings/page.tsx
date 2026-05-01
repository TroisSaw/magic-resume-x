import { useState, useEffect, useRef, useCallback } from "react";
import { Folder, Trash2, Download, Upload, Info } from "lucide-react";
import { useTranslations } from "@/i18n/compat/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getFileHandle,
  getConfig,
  storeFileHandle,
  storeConfig,
  verifyPermission,
  isFileSystemAccessSupported,
  selectDirectoryFallback,
  readResumeFilesFromFileList,
  exportResumeAsFileDownload,
} from "@/utils/fileSystem";
import { useResumeStore } from "@/store/useResumeStore";
import { syncResumesFromDirectory } from "@/utils/resumeFileSync";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const SettingsPage = () => {
  const [directoryHandle, setDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [folderPath, setFolderPath] = useState<string>("");
  const [fallbackFiles, setFallbackFiles] = useState<File[] | null>(null);
  const t = useTranslations();
  const updateResumeFromFile = useResumeStore(
    (state) => state.updateResumeFromFile
  );
  const resumes = useResumeStore((state) => state.resumes);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isModernFS = isFileSystemAccessSupported();

  useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        const handle = await getFileHandle("syncDirectory");
        const path = await getConfig("syncDirectoryPath");

        if (handle && path) {
          const hasPermission = await verifyPermission(handle);
          if (hasPermission) {
            setDirectoryHandle(handle as FileSystemDirectoryHandle);
            setFolderPath(path);
          }
        }
      } catch (error) {
        console.error("Error loading saved config:", error);
      }
    };

    loadSavedConfig();
  }, []);

  // Chrome/Edge: 使用 File System Access API
  const handleSelectDirectoryModern = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      const hasPermission = await verifyPermission(handle);
      if (hasPermission) {
        setDirectoryHandle(handle);
        const path = handle.name;
        setFolderPath(path);
        await storeFileHandle("syncDirectory", handle);
        await storeConfig("syncDirectoryPath", path);
        await syncResumesFromDirectory(updateResumeFromFile);
        toast.success("同步文件夹已设置");
      }
    } catch (error) {
      console.error("Error selecting directory:", error);
    }
  };

  // Firefox: 使用 fallback 方案
  const handleSelectDirectoryFallback = async () => {
    try {
      const { files, directoryName } = await selectDirectoryFallback();
      setFallbackFiles(files);
      setFolderPath(directoryName);
      await storeConfig("syncDirectoryPath", directoryName);

      // 读取已有的简历文件
      const result = await readResumeFilesFromFileList(files, updateResumeFromFile);
      if (result.synced > 0) {
        toast.success(`已同步 ${result.synced} 份简历`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} 份简历同步失败`);
      }
    } catch (error) {
      if ((error as Error).message !== "User cancelled") {
        console.error("Error selecting directory:", error);
        toast.error("选择文件夹失败");
      }
    }
  };

  const handleSelectDirectory = () => {
    if (isModernFS) {
      handleSelectDirectoryModern();
    } else {
      handleSelectDirectoryFallback();
    }
  };

  const handleRemoveDirectory = async () => {
    try {
      setDirectoryHandle(null);
      setFolderPath("");
      setFallbackFiles(null);
      await storeFileHandle("syncDirectory", null as any);
      await storeConfig("syncDirectoryPath", "");
      toast.success("已移除同步文件夹");
    } catch (error) {
      console.error("Error removing directory:", error);
    }
  };

  // Firefox: 手动导出所有简历到下载文件夹
  const handleExportAll = useCallback(() => {
    const resumeList = Object.values(resumes);
    if (resumeList.length === 0) {
      toast.info("没有可导出的简历");
      return;
    }
    resumeList.forEach((resume) => {
      exportResumeAsFileDownload(resume);
    });
    toast.success(`已导出 ${resumeList.length} 份简历到下载文件夹`);
  }, [resumes]);

  // Firefox: 手动导入
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const result = await readResumeFilesFromFileList(files, updateResumeFromFile);
    if (result.synced > 0) {
      toast.success(`已导入 ${result.synced} 份简历`);
    }
    if (result.skipped > 0) {
      toast.info(`${result.skipped} 个文件已跳过`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} 个文件导入失败`);
    }

    // 清空 input 以便重复选择同一文件
    e.target.value = "";
  };

  const isConfigured = !!folderPath;

  return (
    <div className="w-full max-w-[1600px] mx-auto py-8 px-6 lg:px-8">
      <div className="flex flex-col space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t("dashboard.settings.title")}
          </h2>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-900/50">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800/50 pb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 shrink-0">
                  <Folder className="h-6 w-6 text-[#D97757] dark:text-[#D97757]/90" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {t("dashboard.settings.sync.title")}
                    </CardTitle>
                    {!isModernFS && (
                      <Badge variant="secondary" className="text-xs">
                        Firefox 兼容模式
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                    {isModernFS
                      ? t("dashboard.settings.sync.description")
                      : "您的浏览器不支持自动文件夹同步。请手动选择文件夹进行导入/导出，或使用 Chrome/Edge 获得完整体验。"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 px-6 pb-8 md:px-8">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex-1 relative group">
                  {isConfigured ? (
                    <div className="h-12 px-4 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors group-hover:border-[#D97757]/30 group-hover:bg-orange-50/30 dark:group-hover:bg-orange-900/10">
                      <Folder className="h-5 w-5 text-[#D97757]" />
                      <span className="truncate font-medium text-gray-700 dark:text-gray-300 font-mono text-sm">
                        {folderPath}
                      </span>
                    </div>
                  ) : (
                    <div className="h-12 px-4 flex items-center justify-center sm:justify-start text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                      {t("dashboard.settings.syncDirectory.noFolderConfigured")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    onClick={handleSelectDirectory}
                    variant="default"
                    className="flex-1 sm:flex-none h-12 px-6 text-white shadow-sm hover:shadow transition-all duration-200 rounded-xl font-medium cursor-pointer"
                  >
                    {isConfigured
                      ? t("dashboard.settings.syncDirectory.changeFolder")
                      : t("dashboard.settings.sync.select")}
                  </Button>
                  {isConfigured && (
                    <Button
                      onClick={handleRemoveDirectory}
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-xl border-gray-200 dark:border-gray-800 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-900/50 transition-colors"
                      title="Remove synced directory"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Firefox 兼容：手动导入/导出按钮 */}
              {!isModernFS && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Firefox 不支持自动同步，请使用手动导入/导出
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={handleImportClick}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      导入 JSON 简历
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportAll}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      导出全部简历
                    </Button>
                  </div>
                  {/* 隐藏的文件 input，用于手动导入 */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
export const runtime = "edge";

export default SettingsPage;
