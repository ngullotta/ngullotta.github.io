document.addEventListener("DOMContentLoaded", () => {
  const sections = Array.from(document.querySelectorAll(".stored-section"));
  const display = document.getElementById("display-content");
  const pageKeyDisplay = document.getElementById("page-key");
  const links = document.querySelectorAll(".nav-link");
  const searchInput = document.getElementById("babel-search");
  const redactToggle = document.getElementById("redact-toggle");

  let currentIndex = -1;

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function generateKey(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36).toUpperCase();
  }

  const borgesChars = "abcdefghijklmnopqrstuvwxyz, .";
  const MAX_DOC_LEN = 1500;

  function generateBabelText(length) {
    let res = "";
    for (let i = 0; i < length; i++) {
      let next = Math.floor(Math.random() * borgesChars.length);
      res += borgesChars[next];
    }

    return `<p class="babel-generated-text">${res}</p>`;
  }

  function spliceText(a, b) {
    if (!b.length || a.length < b.length) return a;
    const pos = Math.floor(Math.random() * (b.length - a.length));
    return a.slice(0, pos) + b + a.slice(pos, a.length);
  }

  // Safely wraps matching text in <span class="match"> without breaking HTML tags
  function highlightQuery(container, query) {
    if (!query) return;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );
    const nodesToReplace = [];
    let node;

    while (node = walker.nextNode()) {
      if (node.nodeValue.toLowerCase().includes(query)) {
        nodesToReplace.push(node);
      }
    }

    nodesToReplace.forEach((node) => {
      const text = node.nodeValue;
      const regex = new RegExp(`(${query})`, "gi");
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      text.replace(regex, (match, p1, offset) => {
        if (offset > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex, offset)),
          );
        }
        const span = document.createElement("span");
        span.className = "match";
        span.textContent = match;
        fragment.appendChild(span);

        lastIndex = offset + match.length;
        return match;
      });

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      node.parentNode.replaceChild(fragment, node);
    });
  }

  function scrambleNode(node, originalText) {
    let i = 0;
    const maxIterations = Math.random() * 16;

    const interval = setInterval(() => {
      node.nodeValue = originalText.split("").map((char) => {
        if (char === " " || char === "\n") return char;
        return borgesChars[Math.floor(Math.random() * borgesChars.length)];
      }).join("");

      if (i++ >= maxIterations) {
        clearInterval(interval);
        node.nodeValue = originalText;
      }
    }, 40);
  }

  function applyBabelEffect(container) {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );
    const textNodes = [];
    let node;

    while (node = walker.nextNode()) {
      if (node.parentNode.classList.contains("match")) continue;

      if (node.nodeValue.trim() !== "") {
        textNodes.push({ node: node, text: node.nodeValue });
      }
    }

    textNodes.forEach(({ node, text }) => scrambleNode(node, text));
  }

  function loadSection(index, query = "") {
    if (index < 0 || index >= sections.length) return;
    currentIndex = index;

    links.forEach((link) => link.classList.remove("active"));
    const activeLink = document.querySelector(
      `.nav-link[data-index="${index}"]`,
    );
    if (activeLink) activeLink.classList.add("active");

    const sectionTitle = sections[index].dataset.title;
    pageKeyDisplay.textContent = `REF: ${generateKey(sectionTitle)}`;

    display.innerHTML = sections[index].innerHTML;
    if (query) highlightQuery(display, query);
    applyBabelEffect(display);
  }

  function loadGeneratedPage(query) {
    currentIndex = -1;
    links.forEach((link) => link.classList.remove("active"));

    const docKey = generateKey(query);
    pageKeyDisplay.textContent = `HEX: ${docKey}`;

    const page = generateBabelText(MAX_DOC_LEN);
    const spliced = spliceText(page, query);

    display.innerHTML = `
            <h3>${docKey.substring(8)}</h3>
            ${spliced}
        `;

    highlightQuery(display, query);
    applyBabelEffect(display);
  }

  redactToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.body.classList.add("redact-enabled");
    } else {
      document.body.classList.remove("redact-enabled");
    }
  });

  function handleManualNav(index) {
    searchInput.value = "";
    loadSection(index);
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      handleManualNav(parseInt(e.target.dataset.index));
    });
  });

  document.getElementById("nav-left").addEventListener("click", () => {
    if (sections.length === 0) return;
    let newIndex = currentIndex - 1;
    if (newIndex < 0) newIndex = sections.length - 1;
    handleManualNav(newIndex);
  });

  document.getElementById("nav-right").addEventListener("click", () => {
    if (sections.length === 0) return;
    let newIndex = currentIndex + 1;
    if (newIndex >= sections.length) newIndex = 0;
    handleManualNav(newIndex);
  });

  const handleSearch = debounce((e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length < 2) {
      if (currentIndex !== -1) loadSection(currentIndex);
      return;
    }

    const matchIndex = sections.findIndex((sec) =>
      sec.textContent.toLowerCase().includes(query) ||
      sec.dataset.title.toLowerCase().includes(query)
    );

    if (matchIndex !== -1) {
      loadSection(matchIndex, query);
    } else {
      loadGeneratedPage(query);
    }
  }, 600);

  searchInput.addEventListener("input", handleSearch);

  applyBabelEffect(display);
  loadSection(0);
});
