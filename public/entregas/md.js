/* Render de Markdown mínimo (sin dependencias) para los entregables.
   Soporta: títulos, tablas, bloques de código, listas, citas, reglas y
   formato inline (`code`, **negrita**, *cursiva*, [texto](url)). */
(function () {
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function inline(s) {
    let out = esc(s);
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    out = out.replace(/\*([^*]+)\*/g, "<i>$1</i>");
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => `<a href="${u}">${t}</a>`);
    return out;
  }

  function renderTable(rows) {
    const cells = rows.map((r) =>
      r
        .trim()
        .replace(/^\||\|$/g, "")
        .split(/(?<!\\)\|/)
        .map((c) => c.trim().replace(/\\\|/g, "|"))
    );
    const body = cells.filter((c) => !/^[-:\s]+$/.test(c.join("")));
    if (!body.length) return "";
    const head = body[0];
    const rest = body.slice(1);
    return (
      "<table><thead><tr>" +
      head.map((c) => `<th>${inline(c)}</th>`).join("") +
      "</tr></thead><tbody>" +
      rest.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") +
      "</tbody></table>"
    );
  }

  function render(md) {
    const lines = String(md).replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let i = 0;
    let table = [];
    let code = null;
    const flushTable = () => {
      if (table.length) {
        out.push(renderTable(table));
        table = [];
      }
    };

    while (i < lines.length) {
      const line = lines[i];

      if (line.trimStart().startsWith("```")) {
        if (code === null) {
          flushTable();
          code = [];
        } else {
          out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>");
          code = null;
        }
        i++;
        continue;
      }
      if (code !== null) {
        code.push(line);
        i++;
        continue;
      }
      if (line.trimStart().startsWith("|")) {
        table.push(line);
        i++;
        continue;
      }
      flushTable();

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const lvl = h[1].length;
        out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
        out.push("<hr>");
      } else if (/^\s*[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
          i++;
        }
        out.push("<ul>" + items.map((x) => `<li>${inline(x)}</li>`).join("") + "</ul>");
        continue;
      } else if (/^\s*>\s?/.test(line)) {
        const quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        out.push("<blockquote>" + inline(quote.join(" ")) + "</blockquote>");
        continue;
      } else if (line.trim()) {
        const para = [line.trim()];
        while (i + 1 < lines.length) {
          const nxt = lines[i + 1];
          if (
            !nxt.trim() ||
            nxt.startsWith("#") ||
            nxt.trimStart().startsWith("|") ||
            nxt.trimStart().startsWith("```") ||
            /^\s*[-*]\s+/.test(nxt) ||
            /^\s*>\s?/.test(nxt)
          )
            break;
          i++;
          para.push(nxt.trim());
        }
        out.push(`<p>${inline(para.join(" "))}</p>`);
      }
      i++;
    }
    flushTable();
    if (code !== null) out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>");
    return out.join("\n");
  }

  /* Reenvía los enlaces a .md al visor (md.html?f=...) para que también
     se rendericen en vez de mostrar texto crudo. */
  function rewriteMdLinks(root) {
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#") || href.startsWith("/")) return;
      const path = href.split("#")[0];
      if (path.endsWith(".md")) a.setAttribute("href", "md.html?f=" + href);
    });
  }

  window.renderMarkdown = render;
  window.rewriteMdLinks = rewriteMdLinks;
})();
