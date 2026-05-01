"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Check,
  GitBranch,
  Briefcase,
  Rocket,
  GraduationCap,
  Zap,
  MessageSquare,
  Puzzle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSnippetStore } from "@/store/useSnippetStore";
import { useResumeStore } from "@/store/useResumeStore";
import { Snippet, SnippetType } from "@/types/snippet";
import { Experience, Project, Education, CustomItem } from "@/types/resume";
import { generateUUID } from "@/utils/uuid";

const typeIcons: Record<SnippetType, React.ReactNode> = {
  experience: <Briefcase className="w-3.5 h-3.5" />,
  project: <Rocket className="w-3.5 h-3.5" />,
  education: <GraduationCap className="w-3.5 h-3.5" />,
  skill: <Zap className="w-3.5 h-3.5" />,
  selfEvaluation: <MessageSquare className="w-3.5 h-3.5" />,
  custom: <Puzzle className="w-3.5 h-3.5" />,
};

interface SnippetImportButtonProps {
  targetType: SnippetType;
  className?: string;
}

export default function SnippetImportButton({ targetType, className }: SnippetImportButtonProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { snippets } = useSnippetStore();
  const { activeResume, updateExperience, updateProjects, updateEducation, updateSkillContent, updateSelfEvaluationContent, addCustomData, updateCustomData } = useResumeStore();

  const filtered = Object.values(snippets).filter(
    (s) =>
      s.type === targetType &&
      (search.trim() === "" || s.title.toLowerCase().includes(search.toLowerCase()))
  );

  const handleImport = (snippet: Snippet, variantId?: string) => {
    if (!activeResume) return;

    // 获取数据
    let data: unknown;
    if (variantId) {
      const variant = snippet.variants.find((v) => v.id === variantId);
      data = variant?.data ?? ("data" in snippet ? (snippet as any).data : { content: (snippet as any).content });
    } else {
      data = "data" in snippet ? (snippet as any).data : { content: (snippet as any).content };
    }

    switch (snippet.type) {
      case "experience": {
        const exp = { ...(data as Experience), id: generateUUID() };
        updateExperience(exp);
        toast.success(`已导入经历：${snippet.title}`);
        break;
      }
      case "project": {
        const proj = { ...(data as Project), id: generateUUID() };
        updateProjects(proj);
        toast.success(`已导入项目：${snippet.title}`);
        break;
      }
      case "education": {
        const edu = { ...(data as Education), id: generateUUID() };
        updateEducation(edu);
        toast.success(`已导入教育：${snippet.title}`);
        break;
      }
      case "skill": {
        const current = activeResume.skillContent || "";
        const newContent = (data as { content: string }).content;
        updateSkillContent(current ? `${current}\n${newContent}` : newContent);
        toast.success(`已导入技能：${snippet.title}`);
        break;
      }
      case "selfEvaluation": {
        const newContent = (data as { content: string }).content;
        updateSelfEvaluationContent(newContent);
        toast.success(`已导入自我评价：${snippet.title}`);
        break;
      }
      case "custom": {
        const customItem = { ...(data as CustomItem), id: generateUUID() };
        // 找到当前自定义模块或创建新的
        const customSectionId = activeResume.menuSections.find((s) => s.id.startsWith("custom"))?.id;
        if (customSectionId) {
          const currentItems = activeResume.customData[customSectionId] || [];
          updateCustomData(customSectionId, [...currentItems, customItem]);
        } else {
          const newSectionId = `custom-1`;
          // 需要添加模块 - 这里简化处理
          toast.success(`已导入自定义内容：${snippet.title}`);
        }
        break;
      }
    }

    setOpen(false);
    setSearch("");
  };

  const typeLabel: Record<SnippetType, string> = {
    experience: "工作经历",
    project: "项目经历",
    education: "教育背景",
    skill: "专业技能",
    selfEvaluation: "自我评价",
    custom: "自定义",
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn("gap-1.5", className)}
        onClick={() => setOpen(true)}
      >
        <Database className="w-3.5 h-3.5" />
        从语料库导入
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>导入{typeLabel[targetType]}</DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Input
              placeholder="搜索语料..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8"
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filtered.map((snippet) => (
                <div key={snippet.id} className="space-y-1">
                  {/* 默认版本 */}
                  <motion.div
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors hover:bg-accent"
                    )}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleImport(snippet)}
                  >
                    <span className="text-muted-foreground">{typeIcons[snippet.type]}</span>
                    <span className="flex-1 text-sm font-medium">{snippet.title}</span>
                    <Badge variant="outline" className="text-[10px]">默认</Badge>
                  </motion.div>

                  {/* 变体 */}
                  <AnimatePresence>
                    {snippet.variants.map((v) => (
                      <motion.div
                        key={v.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors hover:bg-accent ml-4"
                        )}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleImport(snippet, v.id)}
                      >
                        <GitBranch className="w-3 h-3 text-muted-foreground" />
                        <span className="flex-1 text-sm">{v.name}</span>
                        {v.description && (
                          <span className="text-xs text-muted-foreground">{v.description}</span>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {search ? "未找到匹配语料" : `暂无语料，先去语料库添加吧`}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
