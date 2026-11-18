export function downloadText(filename: string, text: string, mime = "text/markdown;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** PDF = the browser's native print engine (real selectable text, full Unicode). The title becomes the suggested filename. */
export function printAsPdf(title: string) {
  const previous = document.title;
  document.title = title;
  window.print();
  document.title = previous;
}
