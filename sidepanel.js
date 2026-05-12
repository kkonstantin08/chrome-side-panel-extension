document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_SITES = [
    {
      id: "default-google-translate",
      url: "https://translate.google.com",
      name: "translate.google.com",
      isPinned: false,
    },
    {
      id: "default-deepl",
      url: "https://www.deepl.com/translator",
      name: "deepl.com",
      isPinned: false,
    },
  ];

  const elements = {
    addForm: document.getElementById("add-form"),
    urlInput: document.getElementById("url-input"),
    formFeedback: document.getElementById("form-feedback"),
    siteList: document.getElementById("site-list"),
    resetDefaults: document.getElementById("reset-defaults"),
    viewerTitle: document.getElementById("viewer-title"),
    viewerUrl: document.getElementById("viewer-url"),
    openExternalLink: document.getElementById("open-external-link"),
    contentFrame: document.getElementById("content-frame"),
    emptyState: document.getElementById("empty-state"),
  };

  let sites = [];
  let activeSiteId = null;

  initialize();

  function initialize() {
    chrome.storage.local.get(["sites", "activeSiteId"], (result) => {
      const normalizedSites = Array.isArray(result.sites)
        ? result.sites.map(normalizeSiteRecord).filter(Boolean)
        : [];
      const shouldPersistNormalized = normalizedSites.length > 0 && normalizedSites.some(
        (site, index) => result.sites[index]?.isPinned !== site.isPinned
      );

      sites = normalizedSites.length
        ? normalizedSites
        : [...DEFAULT_SITES];
      activeSiteId = typeof result.activeSiteId === "string"
        ? result.activeSiteId
        : null;

      if (!normalizedSites.length) {
        persistSites();
      } else if (shouldPersistNormalized) {
        persistSites();
      }

      const activeSite = sites.find((site) => site.id === activeSiteId) ?? sites[0] ?? null;

      if (activeSite) {
        openSite(activeSite, false);
      } else {
        renderSites();
      }
    });

    elements.addForm.addEventListener("submit", handleAddSite);
    elements.resetDefaults.addEventListener("click", resetDefaults);
  }

  function handleAddSite(event) {
    event.preventDefault();

    const rawValue = elements.urlInput.value.trim();

    if (!rawValue) {
      setFormFeedback("Enter a website address first.", "error");
      return;
    }

    let normalizedUrl;
    try {
      normalizedUrl = normalizeUrl(rawValue);
    } catch (error) {
      setFormFeedback("Use a valid http or https address.", "error");
      return;
    }

    const duplicateSite = sites.find((site) => site.url.toLowerCase() === normalizedUrl.toLowerCase());
    if (duplicateSite) {
      openSite(duplicateSite);
      setFormFeedback("This website is already in your dock.", "success");
      elements.urlInput.value = "";
      return;
    }

    const parsedUrl = new URL(normalizedUrl);
    const newSite = {
      id: `site-${Date.now()}`,
      url: normalizedUrl,
      name: parsedUrl.hostname.replace(/^www\./, ""),
      isPinned: false,
    };

    sites.push(newSite);
    persistSites();
    openSite(newSite);
    elements.urlInput.value = "";
    setFormFeedback(`Added ${newSite.name} to your dock.`, "success");
  }

  function normalizeUrl(rawValue) {
    const candidate = /^https?:\/\//i.test(rawValue)
      ? rawValue
      : `https://${rawValue}`;
    const parsedUrl = new URL(candidate);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Unsupported protocol");
    }

    return parsedUrl.toString();
  }

  function normalizeSiteRecord(site) {
    if (!site || typeof site !== "object") {
      return null;
    }

    if (typeof site.id !== "string" || typeof site.url !== "string" || typeof site.name !== "string") {
      return null;
    }

    return {
      id: site.id,
      url: site.url,
      name: site.name,
      isPinned: Boolean(site.isPinned),
    };
  }

  function persistSites() {
    chrome.storage.local.set({ sites });
  }

  function persistActiveSite() {
    chrome.storage.local.set({ activeSiteId });
  }

  function resetDefaults() {
    sites = [...DEFAULT_SITES];
    activeSiteId = DEFAULT_SITES[0].id;
    persistSites();
    persistActiveSite();
    openSite(DEFAULT_SITES[0], false);
    setFormFeedback("Default tools restored.", "success");
  }

  function deleteSite(siteId) {
    const deletedSite = sites.find((site) => site.id === siteId);
    if (!deletedSite) {
      return;
    }

    sites = sites.filter((site) => site.id !== siteId);
    persistSites();

    if (!sites.length) {
      activeSiteId = null;
      persistActiveSite();
      closeViewer();
      renderSites();
      setFormFeedback("The dock is empty. Reset defaults or add a new site.", "error");
      return;
    }

    if (activeSiteId === siteId) {
      activeSiteId = sites[0].id;
      persistActiveSite();
      openSite(sites[0], false);
    } else {
      renderSites();
    }

    setFormFeedback(`Removed ${deletedSite.name}.`, "success");
  }

  function togglePinned(siteId) {
    const site = sites.find((entry) => entry.id === siteId);
    if (!site) {
      return;
    }

    site.isPinned = !site.isPinned;
    persistSites();
    renderSites();
    setFormFeedback(
      site.isPinned ? `${site.name} added to favorites.` : `${site.name} removed from favorites.`,
      "success"
    );
  }

  function openSite(site, persist = true) {
    activeSiteId = site.id;
    if (persist) {
      persistActiveSite();
      persistSites();
    }

    elements.contentFrame.src = site.url;
    elements.contentFrame.style.display = "block";
    elements.emptyState.style.display = "none";
    elements.viewerTitle.textContent = site.name;
    elements.viewerUrl.textContent = site.url;
    elements.openExternalLink.href = site.url;
    elements.openExternalLink.classList.remove("ghost-btn--disabled");
    elements.openExternalLink.setAttribute("aria-disabled", "false");
    renderSites();
  }

  function closeViewer() {
    elements.contentFrame.src = "";
    elements.contentFrame.style.display = "none";
    elements.emptyState.style.display = "grid";
    elements.viewerTitle.textContent = "Choose a website";
    elements.viewerUrl.textContent = "Your selected tool will open here inside the side panel.";
    elements.openExternalLink.href = "#";
    elements.openExternalLink.classList.add("ghost-btn--disabled");
    elements.openExternalLink.setAttribute("aria-disabled", "true");
  }

  function setFormFeedback(message, tone = "") {
    elements.formFeedback.textContent = message;
    elements.formFeedback.classList.remove("is-error", "is-success");

    if (tone === "error") {
      elements.formFeedback.classList.add("is-error");
    }

    if (tone === "success") {
      elements.formFeedback.classList.add("is-success");
    }
  }

  function renderSites() {
    elements.siteList.innerHTML = "";

    if (!sites.length) {
      const emptyCard = document.createElement("div");
      emptyCard.className = "site-list__empty";
      emptyCard.textContent = "No saved websites yet. Add one above to start your workspace.";
      elements.siteList.appendChild(emptyCard);
      return;
    }

    const pinnedSites = sites.filter((site) => site.isPinned);
    const allSites = sites
      .filter((site) => !site.isPinned)
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name));

    if (pinnedSites.length) {
      elements.siteList.appendChild(buildSection("Favorites", pinnedSites, {
        countLabel: `${pinnedSites.length}`,
      }));
    }

    elements.siteList.appendChild(buildSection("All sites", allSites, {
      countLabel: `${allSites.length}`,
      emptyMessage: "No regular sites yet. Add a new one above or unpin a favorite.",
    }));
  }

  function buildSection(title, sectionSites, options = {}) {
    const section = document.createElement("section");
    section.className = "site-section";

    const header = document.createElement("div");
    header.className = "site-section__header";

    const heading = document.createElement("h3");
    heading.className = "site-section__title";
    heading.textContent = title;

    const count = document.createElement("span");
    count.className = "site-section__count";
    count.textContent = options.countLabel ?? String(sectionSites.length);

    header.append(heading, count);
    section.appendChild(header);

    if (!sectionSites.length) {
      const emptyCard = document.createElement("div");
      emptyCard.className = "site-list__empty";
      emptyCard.textContent = options.emptyMessage ?? "Nothing here yet.";
      section.appendChild(emptyCard);
      return section;
    }

    const rows = document.createElement("div");
    rows.className = "site-rows";
    rows.setAttribute("role", "list");

    for (const site of sectionSites) {
      rows.appendChild(buildSiteRow(site));
    }

    section.appendChild(rows);
    return section;
  }

  function buildSiteRow(site) {
    const isActive = site.id === activeSiteId;
    const row = document.createElement("article");
    row.className = `site-row${isActive ? " is-active" : ""}`;
    row.setAttribute("role", "listitem");

    const pinButton = document.createElement("button");
    pinButton.className = `icon-btn${site.isPinned ? " is-pinned" : ""}`;
    pinButton.type = "button";
    pinButton.title = site.isPinned ? `Remove ${site.name} from favorites` : `Add ${site.name} to favorites`;
    pinButton.setAttribute("aria-pressed", String(site.isPinned));
    pinButton.setAttribute("aria-label", pinButton.title);
    pinButton.innerHTML = getPinIcon(site.isPinned);
    pinButton.addEventListener("click", () => togglePinned(site.id));

    const mainButton = document.createElement("button");
    mainButton.className = "site-row__main";
    mainButton.type = "button";
    mainButton.title = site.url;
    mainButton.setAttribute("aria-pressed", String(isActive));
    mainButton.addEventListener("click", () => openSite(site));

    const name = document.createElement("span");
    name.className = "site-row__name";
    name.textContent = site.name;

    mainButton.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "site-row__actions";

    if (isActive) {
      const status = document.createElement("span");
      status.className = "site-row__status";
      status.textContent = "Active";
      actions.appendChild(status);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "site-section__count";
      spacer.textContent = "";
      spacer.setAttribute("aria-hidden", "true");
      actions.appendChild(spacer);
    }

    const deleteButton = document.createElement("button");
    deleteButton.className = "ghost-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Remove";
    deleteButton.title = `Remove ${site.name}`;
    deleteButton.addEventListener("click", () => deleteSite(site.id));

    actions.appendChild(deleteButton);

    row.append(pinButton, mainButton, actions);
    return row;
  }

  function getPinIcon(isPinned) {
    if (isPinned) {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M15.6 3.6a1 1 0 0 1 1.4 0l3.4 3.4a1 1 0 0 1 0 1.4l-2 2v4a2 2 0 0 1-.59 1.42l-3.6 3.6a1 1 0 0 1-1.41 0l-1.43-1.43-4.7 4.7a1 1 0 1 1-1.41-1.41l4.7-4.7-1.43-1.43a1 1 0 0 1 0-1.41l3.6-3.6A2 2 0 0 1 13.2 10h4l2-2a1 1 0 0 1 1.4 0L15.6 3.6Z"></path>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 3l7 7-2.5 2.5v3.2c0 .4-.16.78-.44 1.06l-3.76 3.76-5.06-5.06 3.76-3.76c.28-.28.66-.44 1.06-.44h3.2L14 3Z"></path>
        <path d="M9.24 15.44l-5.3 5.3"></path>
      </svg>
    `;
  }
});
