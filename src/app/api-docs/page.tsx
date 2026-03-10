import { SwaggerUIClient } from "@/features/api-docs/swagger-ui";
import { swaggerSpec } from "@/shared/config/swagger";

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SwaggerUIClient spec={swaggerSpec} />
    </div>
  );
}