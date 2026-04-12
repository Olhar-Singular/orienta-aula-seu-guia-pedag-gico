import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { EditableActivity } from "./editableActivity";
import {
  renderContentBlock,
  renderActivityHeader,
  renderAnswerLines,
  contentRendererStyles,
} from "./contentRenderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.5,
    color: "#1f2937",
  },
  questionWrapper: {
    marginBottom: 20,
  },
  questionHeader: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },
  alternative: {
    marginBottom: 3,
  },
  // Strategies page styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
    marginTop: 16,
  },
  bulletItem: {
    fontSize: 11,
    marginBottom: 6,
    paddingLeft: 12,
    lineHeight: 1.6,
  },
  numberedItem: {
    fontSize: 11,
    marginBottom: 6,
    paddingLeft: 12,
    lineHeight: 1.6,
  },
  bodyText: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 8,
    textAlign: "justify",
  },
  separator: {
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    borderTopStyle: "solid",
    marginVertical: 14,
  },
});

export type StrategiesData = {
  strategiesApplied: string[];
  pedagogicalJustification: string;
  implementationTips: string[];
};

type Props = {
  activity: EditableActivity;
  strategies?: StrategiesData;
};

export default function PreviewPdfDocument({ activity, strategies }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {renderActivityHeader(activity.header)}

        {activity.questions.map((q, qi) => {
          const showSep =
            q.showSeparator || (activity.globalShowSeparators && qi > 0);
          const spacingAfter = q.spacingAfter ?? 20;
          const altIndent = q.alternativeIndent ?? 12;

          return (
            <View
              key={q.id}
              style={{ ...styles.questionWrapper, marginBottom: spacingAfter }}
              wrap={true}
            >
              {showSep && <View style={contentRendererStyles.separator} />}
              <Text style={styles.questionHeader}>Questao {q.number}</Text>
              {q.content.map((block) => renderContentBlock(block))}
              {q.alternatives?.map((alt, i) => (
                <Text
                  key={i}
                  style={{ ...styles.alternative, marginLeft: altIndent }}
                >
                  {alt}
                </Text>
              ))}
              {renderAnswerLines(q.answerLines ?? 0)}
            </View>
          );
        })}
      </Page>

      {/* Strategies / Justification / Tips page */}
      {strategies && (
        <Page size="A4" style={styles.page} wrap>
          {strategies.strategiesApplied.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Estrategias Aplicadas</Text>
              <View style={styles.separator} />
              {strategies.strategiesApplied.map((s, i) => (
                <Text key={i} style={styles.bulletItem}>
                  {"\u2022"} {s}
                </Text>
              ))}
            </View>
          )}

          {strategies.pedagogicalJustification && (
            <View>
              <Text style={styles.sectionTitle}>Justificativa Pedagogica</Text>
              <View style={styles.separator} />
              {strategies.pedagogicalJustification.split("\n\n").map((p, i) => (
                <Text key={i} style={styles.bodyText}>
                  {p}
                </Text>
              ))}
            </View>
          )}

          {strategies.implementationTips.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Dicas de Implementacao</Text>
              <View style={styles.separator} />
              {strategies.implementationTips.map((tip, i) => (
                <Text key={i} style={styles.numberedItem}>
                  {i + 1}. {tip}
                </Text>
              ))}
            </View>
          )}
        </Page>
      )}
    </Document>
  );
}
