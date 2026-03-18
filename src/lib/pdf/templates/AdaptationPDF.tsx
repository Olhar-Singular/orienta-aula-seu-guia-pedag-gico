import { View, Text } from "@react-pdf/renderer";
import PDFDocument from "../components/PDFDocument";
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
  imagesUniversal?: string[];
  imagesDirected?: string[];
};

export default function AdaptationPDF(props: AdaptationPDFProps) {
  const headerParts: string[] = [];
  if (props.schoolName) headerParts.push(props.schoolName);
  if (props.teacherName) headerParts.push(`Prof. ${props.teacherName}`);
  headerParts.push(props.date);

  return (
    <PDFDocument
      title="Atividade Adaptada"
      author={props.teacherName}
      headerParts={headerParts}
    >
      {/* Title block */}
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

      {/* Universal Version */}
      <PDFSection title="Versão Universal (Design Universal para Aprendizagem)">
        <PDFTextBlock text={props.versionUniversal} />
        {props.imagesUniversal && props.imagesUniversal.length > 0 && (
          <PDFImage urls={props.imagesUniversal} />
        )}
      </PDFSection>

      {/* Directed Version */}
      <PDFSection title="Versão Direcionada">
        <PDFTextBlock text={props.versionDirected} />
        {props.imagesDirected && props.imagesDirected.length > 0 && (
          <PDFImage urls={props.imagesDirected} />
        )}
      </PDFSection>

      {/* Strategies */}
      {props.strategiesApplied.length > 0 && (
        <PDFSection title="Estratégias Aplicadas">
          <PDFList items={props.strategiesApplied} />
        </PDFSection>
      )}

      {/* Justification */}
      {props.pedagogicalJustification && (
        <PDFSection title="Justificativa Pedagógica">
          <PDFTextBlock text={props.pedagogicalJustification} />
        </PDFSection>
      )}

      {/* Tips */}
      {props.implementationTips.length > 0 && (
        <PDFSection title="Dicas de Implementação">
          <PDFList items={props.implementationTips} ordered />
        </PDFSection>
      )}
    </PDFDocument>
  );
}
