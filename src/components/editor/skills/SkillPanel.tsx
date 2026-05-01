import { useResumeStore } from "@/store/useResumeStore";
import { cn } from "@/lib/utils";
import Field from "../Field";
import SnippetImportButton from "../SnippetImportButton";

const SkillPanel = () => {
  const { activeResume, updateSkillContent } = useResumeStore();
  const { skillContent } = activeResume || {};
  const handleChange = (value: string) => {
    updateSkillContent(value);
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        "bg-card",
        "border-border"
      )}
    >
      <div className="flex justify-end mb-2">
        <SnippetImportButton targetType="skill" />
      </div>
      <Field
        value={skillContent}
        onChange={handleChange}
        type="editor"
        placeholder="描述你的技能、专长等..."
      />
    </div>
  );
};

export default SkillPanel;
