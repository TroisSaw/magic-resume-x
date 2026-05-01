import { useResumeStore } from "@/store/useResumeStore";
import { cn } from "@/lib/utils";
import Field from "../Field";
import SnippetImportButton from "../SnippetImportButton";

const SelfEvaluationPanel = () => {
    const { activeResume, updateSelfEvaluationContent } = useResumeStore();
    const selfEvaluationContent = activeResume?.selfEvaluationContent ?? "";
    const handleChange = (value: string) => {
        updateSelfEvaluationContent(value);
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
                <SnippetImportButton targetType="selfEvaluation" />
            </div>
            <Field
                value={selfEvaluationContent}
                onChange={handleChange}
                type="editor"
                placeholder="描述你的自我评价..."
            />
        </div>
    );
};

export default SelfEvaluationPanel;
