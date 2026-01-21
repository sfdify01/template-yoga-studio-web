/**
 * Simple markdown parser for blog content
 * Handles basic markdown syntax without external dependencies
 */

export const parseMarkdown = (markdown: string): string => {
  let html = markdown;

  // Headers (h2 and h3)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');

  // Bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Ordered lists - convert numbered lists to HTML
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ol-item">$1</li>');
  
  // Unordered lists - convert markdown bullet points to HTML
  html = html.replace(/^- (.*$)/gim, '<li class="ul-item">$1</li>');
  
  // Wrap consecutive <li class="ol-item"> tags in <ol>
  html = html.replace(/(<li class="ol-item">.*?<\/li>\n?)+/gs, (match) => {
    return `<ol class="markdown-ordered-list">${match}</ol>`;
  });
  
  // Wrap consecutive <li class="ul-item"> tags in <ul>
  html = html.replace(/(<li class="ul-item">.*?<\/li>\n?)+/gs, (match) => {
    return `<ul class="markdown-list">${match}</ul>`;
  });

  // Paragraphs - split by double newlines
  const lines = html.split('\n\n');
  html = lines.map(line => {
    // Skip if already has HTML tags
    if (line.trim().startsWith('<')) {
      return line;
    }
    // Single line breaks within paragraphs
    const formatted = line.replace(/\n/g, '<br />');
    return `<p>${formatted}</p>`;
  }).join('\n');

  return html;
};

export const getReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};
