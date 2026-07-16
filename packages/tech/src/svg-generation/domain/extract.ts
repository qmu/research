/**
 * Unwrap the SVG document from a model's raw completion text. Models often wrap
 * SVG in a Markdown code fence and/or add prose; the adapter feeds that raw text
 * here so the rest of the domain only ever sees SVG source. Pure and total: if no
 * `<svg>` is found it returns the trimmed input unchanged, and render-validity
 * then scores it 0.
 */
export const extractSvg = (text: string): string => {
  const fence = text.match(/```(?:svg|xml|html)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : text;
  const start = body.search(/<svg[\s>]/i);
  if (start === -1) return body.trim();
  const closeIndex = body.toLowerCase().lastIndexOf("</svg>");
  if (closeIndex === -1) return body.slice(start).trim();
  return body.slice(start, closeIndex + "</svg>".length).trim();
};
