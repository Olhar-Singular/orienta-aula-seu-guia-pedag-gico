import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors } from "../styles";

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    fontSize: 9,
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
  },
  meta: {
    fontSize: 8,
    color: colors.caption,
    textAlign: "right",
  },
});

type Props = {
  headerParts?: string[];
};

export default function PDFHeader({ headerParts }: Props) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.brand}>Olhar Singular</Text>
      {headerParts && headerParts.length > 0 && (
        <Text style={styles.meta}>{headerParts.join(" • ")}</Text>
      )}
    </View>
  );
}
