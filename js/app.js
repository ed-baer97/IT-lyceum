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

  function extractMath(markdown) {
    const chunks = [];
    const replaced = markdown
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
        const i = chunks.length;
        chunks.push({ display: true, tex: tex.trim() });
        return `@@MATH${i}@@`;
      })
      .replace(/\$([^$\n]+?)\$/g, (_, tex) => {
        const i = chunks.length;
        chunks.push({ display: false, tex: tex.trim() });
        return `@@MATH${i}@@`;
      });
    return { replaced, chunks };
  }

  function restoreMath(html, chunks) {
    return html.replace(/@@MATH(\d+)@@/g, (_, index) => {
      const chunk = chunks[Number(index)];
      if (!chunk || !window.katex) return chunk?.tex || "";
      try {
        return window.katex.renderToString(chunk.tex, {
          displayMode: chunk.display,
          throwOnError: false,
        });
      } catch {
        return chunk.tex;
      }
    });
  }

  function buildToc(article, tocRoot) {
    const headings = [...article.querySelectorAll("h2")];
    if (!headings.length) {
      tocRoot.hidden = true;
      return;
    }
    tocRoot.hidden = false;
    const items = headings
      .map((heading, index) => {
        const id = heading.id || `chast-${index + 1}`;
        heading.id = id;
        return `<li><a href="#${id}">${heading.textContent}</a></li>`;
      })
      .join("");
    tocRoot.querySelector("ol").innerHTML = items;
  }

  async function renderLesson() {
    const klass = findClass(params.get("klass"));
    const subject = findSubject(klass, params.get("predmet"));
    const lesson = findLesson(subject, params.get("id"));
    const crumbs = document.querySelector("[data-crumbs]");
    const article = document.querySelector("[data-article]");
    const toc = document.querySelector("[data-toc]");
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
      const markdown = await response.text();
      const { replaced, chunks } = extractMath(markdown);
      const html = window.marked.parse(replaced);
      article.innerHTML = restoreMath(html, chunks);
      if (status) status.remove();
      if (toc) buildToc(article, toc);
    } catch {
      if (status) {
        status.textContent =
          "Не удалось открыть файл урока. Запустите сайт через GitHub Pages или локальный сервер — браузер не читает .md напрямую с диска.";
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
