import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { EditableActivity } from "./editableActivity";
import {
  renderContentBlock,
  renderActivityHeader,
  renderAnswerLines,
  contentRendererStyles,
} from "./contentRenderer";
import PDFRichLine from "./components/PDFRichLine";

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
  checkItem: {
    marginBottom: 5,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tfItem: {
    marginBottom: 5,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 10,
    height: 10,
    marginTop: 2,
    marginRight: 8,
    borderWidth: 0.8,
    borderColor: "#374151",
    borderStyle: "solid",
  },
  checkboxChecked: {
    backgroundColor: "#1f2937",
  },
  tfCircle: {
    width: 12,
    height: 12,
    marginTop: 1,
    marginRight: 8,
    borderWidth: 0.8,
    borderColor: "#374151",
    borderStyle: "solid",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tfCircleText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#111827",
    lineHeight: 1,
  },
  itemText: {
    flex: 1,
  },
  matchRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  matchLeft: {
    flex: 1,
    paddingRight: 8,
  },
  matchDivider: {
    width: 40,
    textAlign: "center",
    color: "#6b7280",
  },
  matchRight: {
    flex: 1,
    paddingLeft: 8,
  },
  orderRow: {
    flexDirection: "row",
    marginBottom: 5,
    alignItems: "flex-start",
  },
  orderBox: {
    width: 18,
    height: 18,
    marginTop: 1,
    marginRight: 8,
    borderWidth: 0.8,
    borderColor: "#374151",
    borderStyle: "solid",
  },
  table: {
    marginTop: 6,
    marginBottom: 6,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: "#6b7280",
    borderStyle: "solid",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCell: {
    flex: 1,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "#6b7280",
    borderStyle: "solid",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 10,
  },
  // General instructions (top of activity)
  generalInstructions: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#374151",
    backgroundColor: "#f3f4f6",
    borderLeftWidth: 3,
    borderLeftColor: "#6b7280",
    borderLeftStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  // Section title
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1d4ed8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#93c5fd",
    borderBottomStyle: "solid",
  },
  // Per-question instruction
  instruction: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#4b5563",
    marginBottom: 6,
  },
  // Strategies page styles
  pageSectionTitle: {
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

type QBody = EditableActivity["questions"][number];

function renderQuestionBody(q: QBody, altIndent: number) {
  const type = q.questionType;

  if (type === "multiple_answer" && q.checkItems && q.checkItems.length > 0) {
    return (
      <View style={{ marginLeft: altIndent }}>
        {q.checkItems.map((item, i) => (
          <View key={i} style={styles.checkItem}>
            <View
              style={
                item.checked
                  ? { ...styles.checkbox, ...styles.checkboxChecked }
                  : styles.checkbox
              }
            />
            <View style={styles.itemText}>
              <PDFRichLine text={item.text} style={styles.itemText} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (type === "true_false" && q.tfItems && q.tfItems.length > 0) {
    return (
      <View style={{ marginLeft: altIndent }}>
        {q.tfItems.map((item, i) => {
          const mark =
            item.marked === true ? "V" : item.marked === false ? "F" : "";
          return (
            <View key={i} style={styles.tfItem}>
              <View style={styles.tfCircle}>
                {mark ? <Text style={styles.tfCircleText}>{mark}</Text> : null}
              </View>
              <View style={styles.itemText}>
                <PDFRichLine text={item.text} style={styles.itemText} />
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  if (type === "matching" && q.matchPairs && q.matchPairs.length > 0) {
    return (
      <View style={{ marginLeft: altIndent }}>
        {q.matchPairs.map((pair, i) => (
          <View key={i} style={styles.matchRow}>
            <View style={styles.matchLeft}>
              <PDFRichLine text={pair.left} style={styles.matchLeft} />
            </View>
            <Text style={styles.matchDivider}>{"\u2014"}</Text>
            <View style={styles.matchRight}>
              <PDFRichLine text={pair.right} style={styles.matchRight} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (type === "ordering" && q.orderItems && q.orderItems.length > 0) {
    return (
      <View style={{ marginLeft: altIndent }}>
        {q.orderItems.map((item, i) => (
          <View key={i} style={styles.orderRow}>
            <View style={styles.orderBox} />
            <View style={styles.itemText}>
              <PDFRichLine text={item.text} style={styles.itemText} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (type === "table" && q.tableRows && q.tableRows.length > 0) {
    return (
      <View style={styles.table} wrap={false}>
        {q.tableRows.map((row, ri) => (
          <View key={ri} style={styles.tableRow}>
            {row.map((cell, ci) => {
              const trimmed = cell.trim();
              const isCircle = ri > 0 && ci > 0 && trimmed === "( )";
              const isSquare = ri > 0 && ci > 0 && trimmed === "[ ]";
              if (isCircle || isSquare) {
                return (
                  <View key={ci} style={{ ...styles.tableCell, alignItems: "center", justifyContent: "center" }}>
                    <View
                      style={{
                        width: 9,
                        height: 9,
                        borderWidth: 0.8,
                        borderColor: "#374151",
                        borderStyle: "solid",
                        borderRadius: isCircle ? 4.5 : 0,
                      }}
                    />
                  </View>
                );
              }
              return (
                <View key={ci} style={styles.tableCell}>
                  <PDFRichLine text={cell} style={styles.tableCell} />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  // Default: multiple_choice alternatives (or legacy activities without questionType)
  if (q.alternatives && q.alternatives.length > 0) {
    return (
      <>
        {q.alternatives.map((alt, i) => (
          <View key={i} style={{ ...styles.alternative, marginLeft: altIndent }}>
            <PDFRichLine text={alt} style={styles.alternative} />
          </View>
        ))}
      </>
    );
  }

  return null;
}

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

        {activity.generalInstructions && (
          <Text style={styles.generalInstructions}>
            {activity.generalInstructions}
          </Text>
        )}

        {activity.questions.map((q, qi) => {
          const showSep =
            q.showSeparator || (activity.globalShowSeparators && qi > 0);
          const spacingAfter = q.spacingAfter ?? 20;
          const altIndent = q.alternativeIndent ?? 12;
          const prevTitle = qi > 0 ? activity.questions[qi - 1].sectionTitle : undefined;
          const showSectionTitle = q.sectionTitle && q.sectionTitle !== prevTitle;

          return (
            <View
              key={q.id}
              style={{ ...styles.questionWrapper, marginBottom: spacingAfter }}
              wrap={true}
            >
              {showSectionTitle && (
                <Text style={styles.sectionTitle}>{q.sectionTitle}</Text>
              )}
              {showSep && <View style={contentRendererStyles.separator} />}
              <Text style={styles.questionHeader}>Questao {q.number}</Text>
              {q.instruction && (
                <Text style={styles.instruction}>{q.instruction}</Text>
              )}
              {q.content.map((block) => renderContentBlock(block))}
              {renderQuestionBody(q, altIndent)}
              {q.trailingContent?.map((block) => renderContentBlock(block))}
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
              <Text style={styles.pageSectionTitle}>Estrategias Aplicadas</Text>
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
              <Text style={styles.pageSectionTitle}>Justificativa Pedagogica</Text>
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
              <Text style={styles.pageSectionTitle}>Dicas de Implementacao</Text>
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
