import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, spacing } from "../styles";

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: 20,
    left: spacing.page.left,
    right: spacing.page.right,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  disclaimer: {
    fontSize: 8,
    color: colors.caption,
    fontStyle: "italic",
    maxWidth: "80%",
  },
  pageNumber: {
    fontSize: 8,
    color: colors.caption,
  },
});

export default function PDFFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.disclaimer}>
        Gerado por Olhar Singular — Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}
