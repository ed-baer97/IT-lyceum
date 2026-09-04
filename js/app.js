(function () {
  const data = window.LYCEUM;
  const params = new URLSearchParams(location.search);

  function findClass(id) {
    return data.classes.find((item) => item.id === String(id));
  }

  function findSubject(klass, subjectId) {
    return klass?.subjects.find((item) => item.id === subjectId);
  }

  function findLesson(subject, lessonId) {
    return subject?.lessons.find((item) => item.id === lessonId);
  }

  function lessonCount(klass) {
    return klass.subjects.reduce((sum, subject) => sum + subject.lessons.length, 0);
  }

  function pluralLessons(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} урок`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} урока`;
    return `${count} уроков`;
  }

  function setHeader() {
    const brand = document.querySelector("[data-brand-name]");
    const tag = document.querySelector("[data-brand-tag]");
    if (brand) brand.textContent = data.name;
    if (tag) tag.textContent = data.tagline;
  }

  function renderHome() {
    const root = document.querySelector("[data-home-grid]");
    if (!root) return;
    root.innerHTML = data.classes
      .map((klass) => {
        const subjects = klass.subjects.map((s) => s.title).join(" · ");
        const count = lessonCount(klass);
        return `
          <a class="card" href="klass.html?id=${klass.id}">
            <div class="card-num">${klass.id.padStart(2, "0")}</div>
            <h2>${klass.title}</h2>
            <p>${subjects}</p>
            <div class="card-foot">
              <span class="chip">${pluralLessons(count)}</span>
              <span class="arrow">→</span>
            </div>
          </a>
        `;
      })
      .join("");
  }

  function renderClass() {
    const klass = findClass(params.get("id"));
    const title = document.querySelector("[data-page-title]");
    const crumbs = document.querySelector("[data-crumbs]");
    const grid = document.querySelector("[data-subject-grid]");
    if (!klass || !grid) {
      if (title) title.textContent = "Класс не найден";
      return;
    }
    document.title = `${klass.title} — ${data.name}`;
    if (title) title.textContent = klass.title;
    if (crumbs) {
      crumbs.innerHTML = `<a href="index.html">Главная</a> <span>/</span> <span>${klass.title}</span>`;
    }
    grid.innerHTML = klass.subjects
      .map((subject) => {
        const count = subject.lessons.length;
        return `
          <a class="card" href="predmet.html?klass=${klass.id}&id=${subject.id}">
            <span class="chip ${subject.id === "informatika" ? "teal" : ""}">${subject.title}</span>
            <h3>${subject.title}</h3>
            <p>${count ? "Открытые уроки по теме" : "Уроки появятся позже"}</p>
            <div class="card-foot">
              <span>${pluralLessons(count)}</span>
              <span class="arrow">→</span>
            </div>
          </a>
        `;
      })
      .join("");
  }

  function renderSubject() {
    const klass = findClass(params.get("klass"));
    const subject = findSubject(klass, params.get("id"));
    const title = document.querySelector("[data-page-title]");
    const crumbs = document.querySelector("[data-crumbs]");
    const list = document.querySelector("[data-lesson-list]");
    if (!klass || !subject || !list) {
      if (title) title.textContent = "Предмет не найден";
      return;
    }
    document.title = `${subject.title}, ${klass.title} — ${data.name}`;
    if (title) title.textContent = subject.title;
    if (crumbs) {
      crumbs.innerHTML = `
        <a href="index.html">Главная</a> <span>/</span>
        <a href="klass.html?id=${klass.id}">${klass.title}</a> <span>/</span>
        <span>${subject.title}</span>
      `;
    }
    if (!subject.lessons.length) {
      list.innerHTML = `<div class="empty">Пока нет уроков. Скоро появятся материалы по этому предмету.</div>`;
      return;
    }
    list.innerHTML = subject.lessons
      .map((lesson, index) => {
        const n = String(index + 1).padStart(2, "0");
        return `
          <a class="lesson-row" href="urok.html?klass=${klass.id}&predmet=${subject.id}&id=${lesson.id}">
            <span class="n">${n}</span>
            <span>${lesson.title}</span>
            <span class="arrow">→</span>
          </a>
        `;
      })
      .join("");
  }

  function renderTex(root) {
    if (!window.katex) return;
    root.querySelectorAll(".tex, .tex-display").forEach((el) => {
      try {
        window.katex.render(el.textContent, el, {
          displayMode: el.classList.contains("tex-display"),
          throwOnError: false,
          trust: (ctx) => ctx.command === "\\htmlClass",
          macros: {
            "\\dm": "\\dfrac{\\htmlClass{addm}{\\htmlClass{addm-hat}{#3}#1}}{#2}",
          },
        });
      } catch {
        /* keep original text */
      }
    });
  }

  function tabLabel(text) {
    return text.replace(/^Урок\s+\d+\.\s*/i, "").trim();
  }

  function activateTab(root, index, scrollTab = true) {
    const tabs = [...root.querySelectorAll("[data-tab]")];
    const panels = [...root.querySelectorAll("[data-panel]")];
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
    const id = tabs[index]?.dataset.tab;
    if (id && location.hash !== `#${id}`) {
      history.replaceState(null, "", `#${id}`);
    }
    if (scrollTab) {
      tabs[index]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }

  function buildTabs(article) {
    const headings = [...article.querySelectorAll("h2")];
    if (!headings.length) return;

    const introNodes = [];
    for (const node of [...article.childNodes]) {
      if (node === headings[0]) break;
      introNodes.push(node);
    }

    const sections = headings.map((heading, index) => {
      const nodes = [];
      let node = heading.nextSibling;
      const stop = headings[index + 1];
      while (node && node !== stop) {
        const current = node;
        node = node.nextSibling;
        if (current.nodeType === Node.ELEMENT_NODE && current.tagName === "HR") continue;
        nodes.push(current);
      }
      return { heading, nodes };
    });

    const intro = document.createElement("div");
    intro.className = "lesson-intro";
    introNodes.forEach((node) => intro.appendChild(node));

    const tablist = document.createElement("div");
    tablist.className = "tabs";
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Темы урока");

    const panels = document.createElement("div");
    panels.className = "tab-panels";

    sections.forEach((section, index) => {
      const id = `tema-${index + 1}`;
      const label = tabLabel(section.heading.textContent);
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "tab";
      tab.id = `tab-${id}`;
      tab.dataset.tab = id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", id);
      tab.setAttribute("aria-label", label);
      tab.title = label;
      tab.textContent = String(index + 1);
      tab.addEventListener("click", () => activateTab(article, index));
      tablist.appendChild(tab);

      section.heading.textContent = `${index + 1}. ${label}`;

      const panel = document.createElement("section");
      panel.className = "tab-panel";
      panel.id = id;
      panel.dataset.panel = "";
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.hidden = index !== 0;
      panel.appendChild(section.heading);
      section.nodes.forEach((node) => panel.appendChild(node));
      panels.appendChild(panel);
    });

    tablist.addEventListener("keydown", (event) => {
      const tabs = [...tablist.querySelectorAll("[data-tab]")];
      const current = tabs.findIndex((tab) => tab.classList.contains("is-active"));
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next =
        event.key === "ArrowRight"
          ? (current + 1) % tabs.length
          : (current - 1 + tabs.length) % tabs.length;
      activateTab(article, next);
      tabs[next].focus();
    });

    article.replaceChildren(intro, tablist, panels);

    const fromHash = tablist.querySelector(`[data-tab="${location.hash.slice(1)}"]`);
    const start = fromHash ? [...tablist.children].indexOf(fromHash) : 0;
    activateTab(article, start, false);
  }

  async function renderLesson() {
    const klass = findClass(params.get("klass"));
    const subject = findSubject(klass, params.get("predmet"));
    const lesson = findLesson(subject, params.get("id"));
    const crumbs = document.querySelector("[data-crumbs]");
    const article = document.querySelector("[data-article]");
    const status = document.querySelector("[data-status]");
    if (!klass || !subject || !lesson || !article) {
      if (status) status.textContent = "Урок не найден.";
      return;
    }
    document.title = `${lesson.title} — ${subject.title}, ${klass.title}`;
    if (crumbs) {
      crumbs.innerHTML = `
        <a href="index.html">Главная</a> <span>/</span>
        <a href="klass.html?id=${klass.id}">${klass.title}</a> <span>/</span>
        <a href="predmet.html?klass=${klass.id}&id=${subject.id}">${subject.title}</a> <span>/</span>
        <span>${lesson.title}</span>
      `;
    }
    try {
      const response = await fetch(lesson.file);
      if (!response.ok) throw new Error("no file");
      article.innerHTML = await response.text();
      renderTex(article);
      if (status) status.remove();
      buildTabs(article);
    } catch {
      if (status) {
        status.textContent =
          "Не удалось открыть файл урока. Запустите сайт через GitHub Pages или локальный сервер.";
      }
    }
  }

  const page = document.body.dataset.page;
  setHeader();
  if (page === "home") renderHome();
  if (page === "klass") renderClass();
  if (page === "predmet") renderSubject();
  if (page === "urok") renderLesson();
})();
