"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

type Props = {
  spec: object;
};

export function SwaggerUIClient({ spec }: Props) {
  return <SwaggerUI spec={spec} />;
}