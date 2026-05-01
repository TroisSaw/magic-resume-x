/**
 * 语料库（Snippet）类型定义 - 完全独立于 Resume 类型
 *
 * 语料库是"经历/项目/技能"的素材库，支持多版本文案。
 * 在创建简历时像搭积木一样勾选组合。
 */

import { Experience, Project, Education, CustomItem } from "./resume";

/** 语料分类标签 */
export interface SnippetTag {
  id: string;
  name: string;
  color?: string;
}

/** 语料类型 - 对应简历模块 */
export type SnippetType = "experience" | "project" | "education" | "skill" | "selfEvaluation" | "custom";

/** 文案版本变体 */
export interface SnippetVariant<T> {
  id: string;
  /** 版本名称（如：前端方向、后端方向） */
  name: string;
  /** 版本描述 */
  description?: string;
  /** 变体数据 */
  data: T;
  createdAt: string;
}

/** 经历语料 */
export interface ExperienceSnippet {
  id: string;
  title: string;
  type: "experience";
  /** 默认版本数据 */
  data: Experience;
  /** 不同侧重点的文案版本 */
  variants: SnippetVariant<Experience>[];
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 项目语料 */
export interface ProjectSnippet {
  id: string;
  title: string;
  type: "project";
  data: Project;
  variants: SnippetVariant<Project>[];
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 教育语料 */
export interface EducationSnippet {
  id: string;
  title: string;
  type: "education";
  data: Education;
  variants: SnippetVariant<Education>[];
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 技能语料 */
export interface SkillSnippet {
  id: string;
  title: string;
  type: "skill";
  /** 技能描述 HTML */
  content: string;
  variants: SnippetVariant<{ content: string }>[];
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 自我评价语料 */
export interface SelfEvaluationSnippet {
  id: string;
  title: string;
  type: "selfEvaluation";
  content: string;
  variants: SnippetVariant<{ content: string }>[];
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 自定义语料 */
export interface CustomSnippet {
  id: string;
  title: string;
  type: "custom";
  data: CustomItem;
  variants: SnippetVariant<CustomItem>[];
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 语料项联合类型 */
export type Snippet =
  | ExperienceSnippet
  | ProjectSnippet
  | EducationSnippet
  | SkillSnippet
  | SelfEvaluationSnippet
  | CustomSnippet;

/** 语料库过滤条件 */
export interface SnippetFilter {
  type?: SnippetType;
  tagIds?: string[];
  keyword?: string;
}

/** 组装时选中的语料项 */
export interface AssembleSnippetItem {
  snippetId: string;
  variantId?: string; // 不填则使用默认版本
}
