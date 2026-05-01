import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Snippet,
  SnippetTag,
  SnippetType,
  SnippetVariant,
  ExperienceSnippet,
  ProjectSnippet,
  EducationSnippet,
  SkillSnippet,
  SelfEvaluationSnippet,
  CustomSnippet,
} from "@/types/snippet";
import { Experience, Project, Education, CustomItem } from "@/types/resume";
import { generateUUID } from "@/utils/uuid";

// ==================== Store 接口 ====================

interface SnippetStore {
  // 数据
  snippets: Record<string, Snippet>;
  tags: Record<string, SnippetTag>;
  activeSnippetId: string | null;

  // 语料 CRUD
  addSnippet: (snippet: Omit<Snippet, "id" | "createdAt" | "updatedAt">) => string;
  updateSnippet: (id: string, data: Partial<Omit<Snippet, "id" | "createdAt">>) => void;
  deleteSnippet: (id: string) => void;
  setActiveSnippet: (id: string | null) => void;

  // 标签管理
  addTag: (tag: Omit<SnippetTag, "id">) => string;
  updateTag: (id: string, data: Partial<SnippetTag>) => void;
  deleteTag: (id: string) => void;

  // 变体管理
  addVariant: <T>(snippetId: string, variant: Omit<SnippetVariant<T>, "id" | "createdAt">) => void;
  updateVariant: <T>(snippetId: string, variantId: string, data: Partial<Omit<SnippetVariant<T>, "id" | "createdAt">>) => void;
  deleteVariant: (snippetId: string, variantId: string) => void;

  // 查询
  getSnippetsByType: (type: SnippetType) => Snippet[];
  getSnippetsByTag: (tagId: string) => Snippet[];
  searchSnippets: (keyword: string) => Snippet[];
}

type PersistedSnippetStore = Pick<SnippetStore, "snippets" | "tags" | "activeSnippetId">;

// ==================== Store 实现 ====================

export const useSnippetStore = create(
  persist<SnippetStore>(
    (set, get) => ({
      // 初始状态
      snippets: {},
      tags: {},
      activeSnippetId: null,

      // --- 语料 CRUD ---
      addSnippet: (snippet) => {
        const id = generateUUID();
        const now = new Date().toISOString();
        const newSnippet = {
          ...snippet,
          id,
          createdAt: now,
          updatedAt: now,
        } as Snippet;

        set((state) => ({
          snippets: { ...state.snippets, [id]: newSnippet },
          activeSnippetId: id,
        }));

        return id;
      },

      updateSnippet: (id, data) => {
        set((state) => {
          const snippet = state.snippets[id];
          if (!snippet) return state;

          const updated = {
            ...snippet,
            ...data,
            updatedAt: new Date().toISOString(),
          } as Snippet;

          return {
            snippets: { ...state.snippets, [id]: updated },
          };
        });
      },

      deleteSnippet: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.snippets;
          return {
            snippets: rest,
            activeSnippetId: state.activeSnippetId === id ? null : state.activeSnippetId,
          };
        });
      },

      setActiveSnippet: (id) => {
        set({ activeSnippetId: id });
      },

      // --- 标签管理 ---
      addTag: (tag) => {
        const id = generateUUID();
        const newTag = { ...tag, id };

        set((state) => ({
          tags: { ...state.tags, [id]: newTag },
        }));

        return id;
      },

      updateTag: (id, data) => {
        set((state) => {
          const tag = state.tags[id];
          if (!tag) return state;

          return {
            tags: { ...state.tags, [id]: { ...tag, ...data } },
          };
        });
      },

      deleteTag: (id) => {
        set((state) => {
          const { [id]: _, ...restTags } = state.tags;
          // 同时从所有语料中移除该标签
          const updatedSnippets = Object.fromEntries(
            Object.entries(state.snippets).map(([sid, snippet]) => [
              sid,
              { ...snippet, tagIds: snippet.tagIds.filter((tid) => tid !== id) },
            ])
          );
          return { tags: restTags, snippets: updatedSnippets };
        });
      },

      // --- 变体管理 ---
      addVariant: (snippetId, variant) => {
        const variantId = generateUUID();
        const now = new Date().toISOString();

        set((state) => {
          const snippet = state.snippets[snippetId];
          if (!snippet) return state;

          const newVariant = {
            ...variant,
            id: variantId,
            createdAt: now,
          };

          const updated = {
            ...snippet,
            variants: [...snippet.variants, newVariant],
            updatedAt: now,
          } as Snippet;

          return {
            snippets: { ...state.snippets, [snippetId]: updated },
          };
        });
      },

      updateVariant: (snippetId, variantId, data) => {
        set((state) => {
          const snippet = state.snippets[snippetId];
          if (!snippet) return state;

          const updatedVariants = snippet.variants.map((v) =>
            v.id === variantId ? { ...v, ...data } : v
          );

          const updated = {
            ...snippet,
            variants: updatedVariants,
            updatedAt: new Date().toISOString(),
          } as Snippet;

          return {
            snippets: { ...state.snippets, [snippetId]: updated },
          };
        });
      },

      deleteVariant: (snippetId, variantId) => {
        set((state) => {
          const snippet = state.snippets[snippetId];
          if (!snippet) return state;

          const updatedVariants = snippet.variants.filter((v) => v.id !== variantId);

          const updated = {
            ...snippet,
            variants: updatedVariants,
            updatedAt: new Date().toISOString(),
          } as Snippet;

          return {
            snippets: { ...state.snippets, [snippetId]: updated },
          };
        });
      },

      // --- 查询 ---
      getSnippetsByType: (type) => {
        return Object.values(get().snippets).filter((s) => s.type === type);
      },

      getSnippetsByTag: (tagId) => {
        return Object.values(get().snippets).filter((s) => s.tagIds.includes(tagId));
      },

      searchSnippets: (keyword) => {
        const lower = keyword.toLowerCase();
        return Object.values(get().snippets).filter(
          (s) =>
            s.title.toLowerCase().includes(lower) ||
            s.variants.some((v) => v.name.toLowerCase().includes(lower))
        );
      },
    }),
    {
      name: "snippet-storage",
      partialize: (state): any => ({
        snippets: state.snippets,
        tags: state.tags,
        activeSnippetId: state.activeSnippetId,
      }),
    }
  )
);
