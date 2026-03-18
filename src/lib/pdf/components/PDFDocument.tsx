import { Document, Page } from "@react-pdf/renderer";
import { baseStyles } from "../styles";
import PDFHeader from "./PDFHeader";
import PDFFooter from "./PDFFooter";
import type { ReactNode } from "react";

type Props = {
  title: string;
  author?: string;
  headerParts?: string[];
  children: ReactNode;
};

export default function PDFDocument({ title, author, headerParts, children }: Props) {
  return (
    <Document title={title} author={author || "Olhar Singular"}>
      <Page size="A4" style={baseStyles.page} wrap>
        <PDFHeader headerParts={headerParts} />
        {children}
        <PDFFooter />
      </Page>
    </Document>
  );
}
