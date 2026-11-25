import { WebUnifiedErrorPage } from "../../components/shared/WebUnifiedErrorPage";

export default function LocaleNotFoundPage() {
  return <WebUnifiedErrorPage statusCode={404} showQuickLinks />;
}
