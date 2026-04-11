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
});

type Props = {
  activity: EditableActivity;
};

export default function PreviewPdfDocument({ activity }: Props) {
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
              style={[styles.questionWrapper, { marginBottom: spacingAfter }]}
              wrap={true}
            >
              {showSep && <View style={contentRendererStyles.separator} />}
              <Text style={styles.questionHeader}>Questao {q.number}</Text>
              {q.content.map((block) => renderContentBlock(block))}
              {q.alternatives?.map((alt, i) => (
                <Text
                  key={i}
                  style={[styles.alternative, { marginLeft: altIndent }]}
                >
                  {alt}
                </Text>
              ))}
              {renderAnswerLines(q.answerLines ?? 0)}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
