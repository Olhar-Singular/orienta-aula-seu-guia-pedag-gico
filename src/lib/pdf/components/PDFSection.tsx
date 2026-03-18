import { View, Text } from "@react-pdf/renderer";
import { baseStyles } from "../styles";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  wrap?: boolean;
};

export default function PDFSection({ title, children, wrap = true }: Props) {
  return (
    <View style={baseStyles.sectionWrapper} wrap={wrap}>
      <Text style={baseStyles.heading}>{title}</Text>
      {children}
    </View>
  );
}
