import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GRADE_CATEGORIES, isCanonicalGrade } from "@/lib/grades";

const OTHER_VALUE = "__OTHER__";
const NONE_VALUE = "__NONE__";

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  required?: boolean;
}

export default function GradeSelect({ value, onChange, label = "Série", required = false }: Props) {
  const [mode, setMode] = useState<"canonical" | "other" | "none">(() => {
    if (!value) return "none";
    return isCanonicalGrade(value) ? "canonical" : "other";
  });
  const [otherText, setOtherText] = useState(value && !isCanonicalGrade(value) ? value : "");

  useEffect(() => {
    if (!value) {
      setMode("none");
      return;
    }
    if (isCanonicalGrade(value)) {
      setMode("canonical");
    } else {
      setMode("other");
      setOtherText(value);
    }
  }, [value]);

  const handleSelectChange = (next: string) => {
    if (next === NONE_VALUE) {
      setMode("none");
      onChange(null);
    } else if (next === OTHER_VALUE) {
      setMode("other");
      onChange(otherText || null);
    } else {
      setMode("canonical");
      onChange(next);
    }
  };

  const handleOtherChange = (text: string) => {
    setOtherText(text);
    onChange(text.trim() || null);
  };

  const selectValue = mode === "none" ? NONE_VALUE : mode === "other" ? OTHER_VALUE : (value ?? NONE_VALUE);

  return (
    <div>
      <Label>{label}{required && " *"}</Label>
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value={NONE_VALUE}>Sem série</SelectItem>}
          {GRADE_CATEGORIES.map((cat) => (
            <SelectGroup key={cat.type}>
              <SelectLabel>{cat.label}</SelectLabel>
              {cat.items.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          <SelectItem value={OTHER_VALUE}>Outro...</SelectItem>
        </SelectContent>
      </Select>
      {mode === "other" && (
        <Input
          className="mt-2"
          value={otherText}
          onChange={(e) => handleOtherChange(e.target.value)}
          placeholder="Ex: Curso técnico, EJA, etc."
        />
      )}
    </div>
  );
}
