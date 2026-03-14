export type CsvStudent = {
  nome: string;
  matricula: string;
};

export type CsvParseResult = {
  students: CsvStudent[];
  errors: string[];
};

export function parseCsv(text: string): CsvParseResult {
  const lines = text.trim().split(/\r?\n/);
  const students: CsvStudent[] = [];
  const errors: string[] = [];

  if (lines.length === 0) {
    errors.push("Arquivo vazio.");
    return { students, errors };
  }

  // Check if first line is header
  const firstLine = lines[0].toLowerCase().trim();
  const startIndex = firstLine.includes("nome") ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim());
    const nome = parts[0] || "";
    const matricula = parts[1] || "";

    if (!nome) {
      errors.push(`Linha ${i + 1}: nome vazio.`);
      continue;
    }

    students.push({ nome, matricula });
  }

  if (students.length === 0 && errors.length === 0) {
    errors.push("Nenhum aluno encontrado no arquivo.");
  }

  return { students, errors };
}
