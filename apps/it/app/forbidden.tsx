import { ItUnifiedErrorPage } from "../components/ItUnifiedErrorPage";

export default function Forbidden() {
  return <ItUnifiedErrorPage statusCode={403} />;
}
