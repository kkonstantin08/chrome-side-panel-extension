document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('url-input');
  const addForm = document.getElementById('add-form');
  const siteList = document.getElementById('site-list');
  const contentFrame = document.getElementById('content-frame');
  const emptyState = document.getElementById('empty-state');

  let sites = [];

  // Загружаем сохраненный список из chrome.storage
  chrome.storage.local.get(['sites'], (result) => {
    if (result.sites) {
      sites = result.sites;
      renderSites();
    } else {
      // Добавим популярные переводчики по умолчанию
      sites = [
        { id: '1', url: 'https://translate.google.com', name: 'Google Translate' },
        { id: '2', url: 'https://www.deepl.com/translator', name: 'DeepL' }
      ];
      saveSites();
      renderSites();
    }
  });

  // Добавление нового сайта в список
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let url = urlInput.value.trim();

    if (url) {
      // Подставляем https:// если пользователь его не ввёл
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      // Достаём красивое имя из домена
      let name = url;
      try {
        const urlObj = new URL(url);
        name = urlObj.hostname.replace(/^www\./, '');
      } catch(e) {}

      const newSite = { id: Date.now().toString(), url, name };
      sites.push(newSite);
      saveSites();
      renderSites();
      urlInput.value = '';
      openSite(newSite.url);
    }
  });

  function saveSites() {
    chrome.storage.local.set({ sites });
  }

  function deleteSite(id) {
    const site = sites.find(s => s.id === id);
    sites = sites.filter(s => s.id !== id);
    saveSites();
    renderSites();
    
    // Если удаляем открытый сейчас сайт, очищаем iframe
    if (site && contentFrame.src === site.url) {
      contentFrame.src = '';
      contentFrame.style.display = 'none';
      emptyState.style.display = 'block';
    }
  }

  function openSite(url) {
    contentFrame.src = url;
    contentFrame.style.display = 'block';
    emptyState.style.display = 'none';
  }

  function renderSites() {
    siteList.innerHTML = '';
    sites.forEach(site => {
      const container = document.createElement('div');
      container.className = 'site-btn-container';

      const btn = document.createElement('button');
      btn.className = 'site-btn';
      btn.textContent = site.name;
      btn.title = site.url;
      btn.addEventListener('click', () => openSite(site.url));

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '✕';
      delBtn.title = 'Удалить';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Не открывать сайт при удалении
        deleteSite(site.id);
      });

      container.appendChild(btn);
      container.appendChild(delBtn);
      siteList.appendChild(container);
    });
  }
});