import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors } from "../styles";

const styles = StyleSheet.create({
  fractionWrapper: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  numerator: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.text,
    textAlign: "center",
    paddingBottom: 1,
  },
  fractionLine: {
    height: 0.8,
    backgroundColor: colors.text,
    width: "100%",
    minWidth: 14,
  },
  denominator: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.text,
    textAlign: "center",
    paddingTop: 1,
  },
});

type Props = {
  numerator: string;
  denominator: string;
};

export default function PDFFraction({ numerator, denominator }: Props) {
  return (
    <View style={styles.fractionWrapper}>
      <Text style={styles.numerator}>{numerator}</Text>
      <View style={styles.fractionLine} />
      <Text style={styles.denominator}>{denominator}</Text>
    </View>
  );
}
