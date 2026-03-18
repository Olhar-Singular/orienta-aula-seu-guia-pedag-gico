import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors } from "../styles";

const styles = StyleSheet.create({
  table: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    minHeight: 24,
  },
  headerCell: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    padding: 5,
  },
  cell: {
    fontSize: 10,
    color: colors.text,
    padding: 5,
    lineHeight: 1.4,
  },
});

type Column = {
  key: string;
  header: string;
  width?: string; // percentage like "30%"
};

type Props = {
  columns: Column[];
  data: Record<string, string>[];
};

export default function PDFTable({ columns, data }: Props) {
  const defaultWidth = `${Math.floor(100 / columns.length)}%`;

  return (
    <View style={styles.table}>
      <View style={styles.headerRow} wrap={false}>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[styles.headerCell, { width: col.width || defaultWidth }]}
          >
            {col.header}
          </Text>
        ))}
      </View>
      {data.map((row, i) => (
        <View key={i} style={styles.row} wrap={false}>
          {columns.map((col) => (
            <Text
              key={col.key}
              style={[styles.cell, { width: col.width || defaultWidth }]}
            >
              {row[col.key] || "—"}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
