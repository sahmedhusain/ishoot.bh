import { View,Image as PdfImage,Text } from "@react-pdf/renderer";
import type { CompanySettings } from "@ishoot/database/types";

interface PdfBrandLogoProps {
  company?: CompanySettings;
  theme?: "light" | "dark";
  iconHeight?: number;
  wordmarkHeight?: number;
}

export function PdfBrandLogo({
  company,
  theme = "dark",
  iconHeight = 26,
  wordmarkHeight = 18,
}: PdfBrandLogoProps) {
  const logo = theme === "dark" ? (company?.dark_logo_url || company?.logo_url) : company?.logo_url;
  const icon = theme === "dark" ? (company?.dark_icon_url || company?.icon_url) : company?.icon_url;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 }}>
      {icon ? (
        <PdfImage src={icon as any} style={{ height: iconHeight, width: iconHeight, objectFit: "contain" }} />
      ) : null}
      {logo ? (
        <PdfImage src={logo as any} style={{ height: wordmarkHeight, width: 160, objectFit: "contain" }} />
      ) : (
        <Text style={{ fontSize: wordmarkHeight, color: theme === "dark" ? "#FFFFFF" : "#014842" }}>
          {company?.company_name_en || ""}
        </Text>
      )}
    </View>
  );
}
