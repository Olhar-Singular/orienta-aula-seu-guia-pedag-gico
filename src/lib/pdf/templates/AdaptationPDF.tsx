import { View, Text, Document, Page } from "@react-pdf/renderer";
import PDFHeader from "../components/PDFHeader";
import PDFFooter from "../components/PDFFooter";
import PDFSection from "../components/PDFSection";
import PDFList from "../components/PDFList";
import PDFTextBlock from "../components/PDFTextBlock";
import PDFImage from "../components/PDFImage";
import { baseStyles } from "../styles";

const TYPE_LABELS: Record<string, string> = {
  prova: "Prova",
  exercicio: "Exercício",
  atividade_casa: "Atividade de Casa",
  trabalho: "Trabalho",
  resumo: "Resumo",
};

export type QuestionImageMap = Record<string, string[]>;

export type AdaptationPDFProps = {
  schoolName?: string;
  teacherName?: string;
  studentName?: string;
  activityType?: string;
  date: string;
  versionUniversal: string;
  versionDirected: string;
  strategiesApplied: string[];
  pedagogicalJustification: string;
  implementationTips: string[];
  questionImagesUniversal?: QuestionImageMap;
  questionImagesDirected?: QuestionImageMap;
};

export default function AdaptationPDF(props: AdaptationPDFProps) {
  const headerParts: string[] = [];
  if (props.schoolName) headerParts.push(props.schoolName);
  if (props.teacherName) headerParts.push(`Prof. ${props.teacherName}`);
  headerParts.push(props.date);

  const titleBlock = (
    <View style={{ marginBottom: 14 }}>
      <Text style={baseStyles.title}>Atividade Adaptada</Text>
      {props.activityType && (
        <Text style={baseStyles.metaLine}>
          Tipo: {TYPE_LABELS[props.activityType] || props.activityType}
        </Text>
      )}
      {props.studentName && (
        <Text style={baseStyles.metaLine}>Aluno: {props.studentName}</Text>
      )}
    </View>
  );

  // Helper to render text with inline images per question
  const renderSectionWithImages = (text: string, qImages?: QuestionImageMap) => {
    if (!qImages || Object.keys(qImages).length === 0) {
      return <PDFTextBlock text={text} />;
    }

    // Split text by question boundaries and insert images after each question
    const lines = text.split("\n");
    const segments: { lines: string[]; questionNumber?: string }[] = [];
    let currentLines: string[] = [];
    let currentQNum: string | undefined;

    const QUESTION_RE = /^(?:\*{0,2})(\d+)[\.\)]\s/;

    for (const line of lines) {
      const qMatch = line.trim().match(QUESTION_RE);
      if (qMatch) {
        // Flush previous segment
        if (currentLines.length > 0) {
          segments.push({ lines: [...currentLines], questionNumber: currentQNum });
        }
        currentLines = [line];
        currentQNum = qMatch[1];
      } else {
        currentLines.push(line);
      }
    }
    if (currentLines.length > 0) {
      segments.push({ lines: [...currentLines], questionNumber: currentQNum });
    }

    return (
      <View>
        {segments.map((seg, i) => (
          <View key={i} wrap={false}>
            <PDFTextBlock text={seg.lines.join("\n")} />
            {seg.questionNumber && qImages[seg.questionNumber] && qImages[seg.questionNumber].length > 0 && (
              <PDFImage urls={qImages[seg.questionNumber]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Document title="Atividade Adaptada" author={props.teacherName || "Olhar Singular"}>
      {/* Page 1: Versão Universal */}
      <Page size="A4" style={baseStyles.page} wrap>
        <PDFHeader headerParts={headerParts} />
        {titleBlock}
        <PDFSection title="Versão Universal (Design Universal para Aprendizagem)">
          {renderSectionWithImages(props.versionUniversal, props.questionImagesUniversal)}
        </PDFSection>
        <PDFFooter />
      </Page>

      {/* Page 2: Versão Direcionada */}
      <Page size="A4" style={baseStyles.page} wrap>
        <PDFHeader headerParts={headerParts} />
        <PDFSection title="Versão Direcionada">
          {renderSectionWithImages(props.versionDirected, props.questionImagesDirected)}
        </PDFSection>
        <PDFFooter />
      </Page>

      {/* Page 3: Estratégias, Justificativa e Dicas */}
      <Page size="A4" style={baseStyles.page} wrap>
        <PDFHeader headerParts={headerParts} />
        {props.strategiesApplied.length > 0 && (
          <PDFSection title="Estratégias Aplicadas">
            <PDFList items={props.strategiesApplied} />
          </PDFSection>
        )}
        {props.pedagogicalJustification && (
          <PDFSection title="Justificativa Pedagógica">
            <PDFTextBlock text={props.pedagogicalJustification} />
          </PDFSection>
        )}
        {props.implementationTips.length > 0 && (
          <PDFSection title="Dicas de Implementação">
            <PDFList items={props.implementationTips} ordered />
          </PDFSection>
        )}
        <PDFFooter />
      </Page>
    </Document>
  );
}
