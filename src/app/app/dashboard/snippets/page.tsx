"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Tag,
  Layers,
  Briefcase,
  Rocket,
  GraduationCap,
  Zap,
  MessageSquare,
  Puzzle,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  GitBranch,
} from "lucide-react";
import { useTranslations } from "@/i18n/compat/client";
import { useRouter } from "@/lib/navigation";
import { useSnippetStore } from "@/store/useSnippetStore";
import { useResumeStore } from "@/store/useResumeStore";
import { Snippet, SnippetType, SnippetTag, AssembleSnippetItem } from "@/types/snippet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateUUID } from "@/utils/uuid";
import { DEFAULT_TEMPLATES } from "@/components/templates/registry";
import { Experience, Project, Education, CustomItem, MenuSection } from "@/types/resume";

// ==================== 类型图标映射 ====================

const typeIcons: Record<SnippetType, React.ReactNode> = {
  experience: <Briefcase className="w-4 h-4" />,
  project: <Rocket className="w-4 h-4" />,
  education: <GraduationCap className="w-4 h-4" />,
  skill: <Zap className="w-4 h-4" />,
  selfEvaluation: <MessageSquare className="w-4 h-4" />,
  custom: <Puzzle className="w-4 h-4" />,
};

const typeColors: Record<SnippetType, string> = {
  experience: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  project: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  education: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  skill: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  selfEvaluation: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

// ==================== 主页面 ====================

export default function SnippetsPage() {
  const t = useTranslations("dashboard.snippets");
  const router = useRouter();

  const { snippets, tags, deleteSnippet, deleteTag } = useSnippetStore();
  const { createResume, setActiveResume, updateResume } = useResumeStore();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<SnippetType | "all">("all");
  const [filterTag, setFilterTag] = useState<string | "all">("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssembleOpen, setIsAssembleOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: "snippet" | "tag" } | null>(null);

  // 过滤语料
  const filteredSnippets = useMemo(() => {
    let result = Object.values(snippets);
    if (search.trim()) {
      const kw = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(kw) ||
          s.variants.some((v) => v.name.toLowerCase().includes(kw))
      );
    }
    if (filterType !== "all") {
      result = result.filter((s) => s.type === filterType);
    }
    if (filterTag !== "all") {
      result = result.filter((s) => s.tagIds.includes(filterTag));
    }
    return result;
  }, [snippets, search, filterType, filterTag]);

  // 按类型分组
  const groupedSnippets = useMemo(() => {
    const groups: Record<SnippetType, Snippet[]> = {
      experience: [],
      project: [],
      education: [],
      skill: [],
      selfEvaluation: [],
      custom: [],
    };
    filteredSnippets.forEach((s) => groups[s.type].push(s));
    return groups;
  }, [filteredSnippets]);

  // 组装简历
  const handleAssemble = (templateId: string, selected: AssembleSnippetItem[]) => {
    const resumeId = createResume(templateId, true);
    const state = useResumeStore.getState();
    const resume = state.resumes[resumeId];
    if (!resume) return;

    const experiences: Experience[] = [];
    const projects: Project[] = [];
    const educations: Education[] = [];
    let skillContent = "";
    let selfEvalContent = "";
    const customData: Record<string, CustomItem[]> = {};
    const menuSections: MenuSection[] = [
      { id: "basic", title: "基本信息", icon: "👤", enabled: true, order: 0 },
    ];
    let order = 1;

    for (const item of selected) {
      const snippet = snippets[item.snippetId];
      if (!snippet) continue;

      // 获取数据（使用变体或默认）
      let data: unknown;
      if (item.variantId) {
        const variant = snippet.variants.find((v) => v.id === item.variantId);
        data = variant?.data ?? ("data" in snippet ? (snippet as any).data : { content: (snippet as any).content });
      } else {
        data = "data" in snippet ? (snippet as any).data : { content: (snippet as any).content };
      }

      switch (snippet.type) {
        case "experience":
          experiences.push({ ...(data as Experience), id: generateUUID() });
          break;
        case "project":
          projects.push({ ...(data as Project), id: generateUUID() });
          break;
        case "education":
          educations.push({ ...(data as Education), id: generateUUID() });
          break;
        case "skill":
          skillContent = (data as { content: string }).content;
          break;
        case "selfEvaluation":
          selfEvalContent = (data as { content: string }).content;
          break;
        case "custom":
          {
            const customId = `custom-${Object.keys(customData).length + 1}`;
            customData[customId] = [{ ...(data as CustomItem), id: generateUUID() }];
          }
          break;
      }
    }

    // 构建 menuSections
    if (skillContent) {
      menuSections.push({ id: "skills", title: t("type.skill"), icon: "⚡", enabled: true, order: order++ });
    }
    if (experiences.length) {
      menuSections.push({ id: "experience", title: t("type.experience"), icon: "💼", enabled: true, order: order++ });
    }
    if (projects.length) {
      menuSections.push({ id: "projects", title: t("type.project"), icon: "🚀", enabled: true, order: order++ });
    }
    if (educations.length) {
      menuSections.push({ id: "education", title: t("type.education"), icon: "🎓", enabled: true, order: order++ });
    }
    if (selfEvalContent) {
      menuSections.push({ id: "selfEvaluation", title: t("type.selfEvaluation"), icon: "💬", enabled: true, order: order++ });
    }
    Object.keys(customData).forEach((key) => {
      menuSections.push({ id: key, title: key, icon: "➕", enabled: true, order: order++ });
    });

    updateResume(resumeId, {
      experience: experiences,
      projects,
      education: educations,
      skillContent,
      selfEvaluationContent: selfEvalContent,
      customData,
      menuSections,
      title: `${t("assemble.title")} ${new Date().toLocaleDateString()}`,
    });

    setIsAssembleOpen(false);
    setActiveResume(resumeId);
    toast.success("简历组装成功");
    router.push(`/app/workbench/${resumeId}`);
  };

  return (
    <ScrollArea className="h-[calc(100vh-2rem)] w-full">
      <div className="w-full max-w-[1600px] mx-auto py-8 px-4 sm:px-6">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsAssembleOpen(true)}>
              <Layers className="w-4 h-4 mr-2" />
              {t("assemble.title")}
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("addSnippet")}
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 mb-6"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as SnippetType | "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTypes")}</SelectItem>
              {(["experience", "project", "education", "skill", "selfEvaluation", "custom"] as SnippetType[]).map(
                (type) => (
                  <SelectItem key={type} value={type}>
                    {t(`type.${type}`)}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("allTags")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTags")}</SelectItem>
              {Object.values(tags).map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Tags Bar */}
        {Object.keys(tags).length > 0 && (
          <motion.div
            className="flex flex-wrap gap-2 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {Object.values(tags).map((tag) => (
              <Badge
                key={tag.id}
                variant={filterTag === tag.id ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setFilterTag(filterTag === tag.id ? "all" : tag.id)}
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag.name}
                <span
                  className="ml-1.5 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: tag.id, kind: "tag" });
                  }}
                >
                  <X className="w-3 h-3" />
                </span>
              </Badge>
            ))}
          </motion.div>
        )}

        {/* Snippets List */}
        <div className="space-y-8">
          {Object.entries(groupedSnippets).map(([type, items]) =>
            items.length > 0 ? (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {typeIcons[type as SnippetType]}
                  {t(`type.${type as SnippetType}`)}
                  <Badge variant="secondary">{items.length}</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((snippet) => (
                    <SnippetCard
                      key={snippet.id}
                      snippet={snippet}
                      tags={tags}
                      onDelete={() => setDeleteTarget({ id: snippet.id, kind: "snippet" })}
                    />
                  ))}
                </div>
              </motion.div>
            ) : null
          )}

          {filteredSnippets.length === 0 && (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noSnippets")}</h3>
              <p className="text-muted-foreground mt-1">{t("noSnippetsDesc")}</p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("addSnippet")}
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <SnippetCreateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Assemble Dialog */}
      <AssembleDialog open={isAssembleOpen} onOpenChange={setIsAssembleOpen} onAssemble={handleAssemble} />

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteTarget?.kind === "snippet" ? t("dialog.deleteTitle") : "删除标签"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {deleteTarget?.kind === "snippet"
              ? t("dialog.deleteConfirm")
              : "确定要删除这个标签吗？相关语料的标签关联也会被移除。"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget?.kind === "snippet") {
                  deleteSnippet(deleteTarget.id);
                  toast.success("删除成功");
                } else if (deleteTarget?.kind === "tag") {
                  deleteTag(deleteTarget.id);
                  toast.success("标签删除成功");
                }
                setDeleteTarget(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

// ==================== 语料卡片 ====================

function SnippetCard({
  snippet,
  tags,
  onDelete,
}: {
  snippet: Snippet;
  tags: Record<string, SnippetTag>;
  onDelete: () => void;
}) {
  const t = useTranslations("dashboard.snippets");
  const [expanded, setExpanded] = useState(false);

  const snippetTags = snippet.tagIds.map((id) => tags[id]).filter(Boolean);

  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("p-1.5 rounded-md", typeColors[snippet.type])}>
              {typeIcons[snippet.type]}
            </span>
            <h3 className="font-medium truncate">{snippet.title}</h3>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>

        {snippetTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {snippetTags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Variants */}
        {snippet.variants.length > 0 && (
          <div className="mt-3">
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {snippet.variants.length} {t("variants")}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1">
                    <div className="text-xs px-2 py-1 rounded bg-primary/5 text-primary font-medium">
                      {t("defaultVariant")}
                    </div>
                    {snippet.variants.map((v) => (
                      <div
                        key={v.id}
                        className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                      >
                        <GitBranch className="w-3 h-3 inline mr-1" />
                        {v.name}
                        {v.description && <span className="ml-1 opacity-60">- {v.description}</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 新建语料弹窗 ====================

function SnippetCreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useTranslations("dashboard.snippets");
  const { addSnippet, addTag, tags } = useSnippetStore();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<SnippetType>("experience");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");

  // 表单字段
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [date, setDate] = useState("");
  const [details, setDetails] = useState("");
  const [content, setContent] = useState("");

  const reset = () => {
    setTitle("");
    setType("experience");
    setSelectedTags([]);
    setCompany("");
    setPosition("");
    setDate("");
    setDetails("");
    setContent("");
    setNewTagName("");
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("请输入标题");
      return;
    }

    const base = {
      title: title.trim(),
      type,
      tagIds: selectedTags,
      variants: [],
    };

    let snippet: Omit<Snippet, "id" | "createdAt" | "updatedAt">;

    switch (type) {
      case "experience":
        snippet = {
          ...base,
          type: "experience",
          data: {
            id: "",
            company: company || "",
            position: position || "",
            date: date || "",
            details: details || "",
            visible: true,
          },
        } as any;
        break;
      case "project":
        snippet = {
          ...base,
          type: "project",
          data: {
            id: "",
            name: title,
            role: position || "",
            date: date || "",
            description: details || "",
            visible: true,
          },
        } as any;
        break;
      case "education":
        snippet = {
          ...base,
          type: "education",
          data: {
            id: "",
            school: company || "",
            major: position || "",
            degree: "",
            startDate: "",
            endDate: "",
            visible: true,
          },
        } as any;
        break;
      case "skill":
        snippet = {
          ...base,
          type: "skill",
          content: content || "",
        } as any;
        break;
      case "selfEvaluation":
        snippet = {
          ...base,
          type: "selfEvaluation",
          content: content || "",
        } as any;
        break;
      default:
        snippet = {
          ...base,
          type: "custom",
          data: {
            id: "",
            title: title,
            subtitle: "",
            dateRange: "",
            description: content || "",
            visible: true,
          },
        } as any;
    }

    addSnippet(snippet);
    toast.success("语料创建成功");
    reset();
    onOpenChange(false);
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    addTag({ name: newTagName.trim() });
    setNewTagName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialog.createTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("form.title")}</Label>
            <Input
              placeholder={t("form.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("form.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as SnippetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["experience", "project", "education", "skill", "selfEvaluation", "custom"] as SnippetType[]).map(
                  (tType) => (
                    <SelectItem key={tType} value={tType}>
                      {t(`type.${tType}`)}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 动态表单 */}
          {(type === "experience" || type === "project") && (
            <>
              <div className="space-y-2">
                <Label>{type === "experience" ? "公司" : "项目角色"}</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={type === "experience" ? "公司名称" : "项目角色"} />
              </div>
              <div className="space-y-2">
                <Label>{type === "experience" ? "职位" : "项目时间"}</Label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder={type === "experience" ? "职位" : "如 2023.01 - 2023.06"} />
              </div>
              <div className="space-y-2">
                <Label>时间</Label>
                <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="如 2021.07 - 2024.12" />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="详细描述..."
                />
              </div>
            </>
          )}

          {type === "education" && (
            <>
              <div className="space-y-2">
                <Label>学校</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="学校名称" />
              </div>
              <div className="space-y-2">
                <Label>专业</Label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="专业名称" />
              </div>
            </>
          )}

          {(type === "skill" || type === "selfEvaluation" || type === "custom") && (
            <div className="space-y-2">
              <Label>{t("form.content")}</Label>
              <textarea
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入内容..."
              />
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label>{t("form.tags")}</Label>
            <div className="flex flex-wrap gap-2">
              {Object.values(tags).map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedTags((prev) =>
                      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                    )
                  }
                >
                  {selectedTags.includes(tag.id) && <Check className="w-3 h-3 mr-1" />}
                  {tag.name}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("tagName")}
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 组装简历弹窗 ====================

function AssembleDialog({
  open,
  onOpenChange,
  onAssemble,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAssemble: (templateId: string, selected: AssembleSnippetItem[]) => void;
}) {
  const t = useTranslations("dashboard.snippets");
  const { snippets } = useSnippetStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(DEFAULT_TEMPLATES[0]?.id || "");
  const [selected, setSelected] = useState<AssembleSnippetItem[]>([]);

  const allSnippets = Object.values(snippets);
  const grouped = useMemo(() => {
    const g: Record<SnippetType, Snippet[]> = {
      experience: [], project: [], education: [],
      skill: [], selfEvaluation: [], custom: [],
    };
    allSnippets.forEach((s) => g[s.type].push(s));
    return g;
  }, [allSnippets]);

  const toggleSnippet = (snippetId: string, variantId?: string) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.snippetId === snippetId && p.variantId === variantId);
      if (exists) {
        return prev.filter((p) => !(p.snippetId === snippetId && p.variantId === variantId));
      }
      return [...prev, { snippetId, variantId }];
    });
  };

  const isSelected = (snippetId: string, variantId?: string) =>
    selected.some((p) => p.snippetId === snippetId && p.variantId === variantId);

  const reset = () => {
    setStep(1);
    setSelectedTemplate(DEFAULT_TEMPLATES[0]?.id || "");
    setSelected([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("assemble.title")}</DialogTitle>
        </DialogHeader>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <Badge variant={step >= 1 ? "default" : "outline"}>1</Badge>
          <span className={step >= 1 ? "text-foreground" : "text-muted-foreground"}>{t("assemble.step1")}</span>
          <span className="text-muted-foreground">→</span>
          <Badge variant={step >= 2 ? "default" : "outline"}>2</Badge>
          <span className={step >= 2 ? "text-foreground" : "text-muted-foreground"}>{t("assemble.step2")}</span>
          <span className="text-muted-foreground">→</span>
          <Badge variant={step >= 3 ? "default" : "outline"}>3</Badge>
          <span className={step >= 3 ? "text-foreground" : "text-muted-foreground"}>{t("assemble.step3")}</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-muted-foreground">{t("assemble.selectTemplate")}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DEFAULT_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    "border rounded-lg p-3 cursor-pointer transition-all",
                    selectedTemplate === template.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  )}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="aspect-[210/297] bg-muted rounded mb-2" />
                  <p className="text-sm font-medium text-center">{template.name}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>{t("assemble.step2")} →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">{t("assemble.selectSnippets")}</p>
              <Badge variant="secondary">{t("assemble.selectedCount", { count: selected.length })}</Badge>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {Object.entries(grouped).map(([type, items]) =>
                  items.length > 0 ? (
                    <div key={type}>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        {typeIcons[type as SnippetType]}
                        {t(`type.${type as SnippetType}`)}
                      </h4>
                      <div className="space-y-2">
                        {items.map((snippet) => (
                          <div key={snippet.id} className="space-y-1">
                            {/* 默认版本 */}
                            <div
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors",
                                isSelected(snippet.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:bg-accent"
                              )}
                              onClick={() => toggleSnippet(snippet.id)}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center",
                                isSelected(snippet.id) ? "bg-primary border-primary" : "border-input"
                              )}>
                                {isSelected(snippet.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                              </div>
                              <span className="flex-1 text-sm">{snippet.title}</span>
                              <Badge variant="outline" className="text-xs">{t("defaultVariant")}</Badge>
                            </div>

                            {/* 变体版本 */}
                            {snippet.variants.map((v) => (
                              <div
                                key={v.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ml-6",
                                  isSelected(snippet.id, v.id)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:bg-accent"
                                )}
                                onClick={() => toggleSnippet(snippet.id, v.id)}
                              >
                                <div className={cn(
                                  "w-5 h-5 rounded border flex items-center justify-center",
                                  isSelected(snippet.id, v.id) ? "bg-primary border-primary" : "border-input"
                                )}>
                                  {isSelected(snippet.id, v.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                                </div>
                                <GitBranch className="w-3 h-3 text-muted-foreground" />
                                <span className="flex-1 text-sm">{v.name}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}

                {allSnippets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="w-8 h-8 mx-auto mb-2" />
                    <p>暂无语料，请先创建语料</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← {t("assemble.step1")}</Button>
              <Button onClick={() => setStep(3)} disabled={selected.length === 0}>
                {t("assemble.step3")} →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h4 className="font-medium">{t("assemble.preview")}</h4>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">模板：</span>
                {DEFAULT_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">已选语料：</span>
                {selected.length} 条
              </p>
              <div className="space-y-1">
                {selected.map((item) => {
                  const snippet = snippets[item.snippetId];
                  if (!snippet) return null;
                  const variant = item.variantId
                    ? snippet.variants.find((v) => v.id === item.variantId)
                    : null;
                  return (
                    <div key={`${item.snippetId}-${item.variantId}`} className="text-sm flex items-center gap-2">
                      {typeIcons[snippet.type]}
                      <span>{snippet.title}</span>
                      {variant && (
                        <Badge variant="outline" className="text-xs">
                          <GitBranch className="w-3 h-3 mr-1" />
                          {variant.name}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>← {t("assemble.step2")}</Button>
              <Button onClick={() => onAssemble(selectedTemplate, selected)}>
                <Layers className="w-4 h-4 mr-2" />
                {t("assemble.create")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
