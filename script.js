/* =========================================================
   666 xk — dados salvos no localStorage do navegador.
   Isso roda 100% no cliente (site estático, sem servidor):
   um jogo adicionado no painel aparece nesse MESMO navegador.
   Pra levar o catálogo pra outro aparelho, usa Exportar/Importar
   backup no painel admin.
   ========================================================= */

const STORAGE_KEY = '666xk_data_v1';
const DEFAULT_PASSWORD = '66610092009';

function seedData() {
  const seed = {
    password: DEFAULT_PASSWORD,
    jogos: [
      {
        id: 'cyber-hunter',
        titulo: 'Cyber Hunter',
        categoria: 'Ação',
        descricao: 'Caçada futurista em mundo aberto.',
        capa: '',
        link: '',
        tamanho: ''
      },
      {
        id: 'dark-dungeon',
        titulo: 'Dark Dungeon',
        categoria: 'RPG',
        descricao: 'Exploração e sobrevivência em masmorras.',
        capa: '',
        link: '',
        tamanho: ''
      },
      {
        id: 'space-racer',
        titulo: 'Space Racer',
        categoria: 'Corrida',
        descricao: 'Corrida espacial com naves personalizáveis.',
        capa: '',
        link: '',
        tamanho: ''
      }
    ]
  };
  saveData(seed);
  return seed;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.jogos)) return parsed;
    }
  } catch (e) {
    console.warn('Falha ao ler dados salvos, recriando.', e);
  }
  return seedData();
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function slugify(text) {
  const base = text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base ? `${base}-${Date.now().toString(36)}` : `jogo-${Date.now().toString(36)}`;
}

let siteData = loadData();

/* =========================================================
   PÁGINA INICIAL — catálogo, busca e filtro
   ========================================================= */
const grid = document.getElementById('games-grid');
const countEl = document.getElementById('games-count');
const emptyMsg = document.getElementById('empty-msg');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');

function renderGames() {
  if (!grid) return;

  const termo = (searchInput?.value || '').trim().toLowerCase();
  const categoria = categorySelect?.value || 'todas';

  const filtrados = siteData.jogos.filter(jogo => {
    const matchTermo = jogo.titulo.toLowerCase().includes(termo);
    const matchCategoria = categoria === 'todas' || jogo.categoria === categoria;
    return matchTermo && matchCategoria;
  });

  grid.innerHTML = filtrados.map(jogo => `
    <div class="game-card">
      <div class="game-info">
        <h3>${jogo.titulo}</h3>
        <p>${jogo.descricao || ''}</p>
        <span class="game-cat">${jogo.categoria || 'Geral'}</span>
      </div>
      <a href="download.html?jogo=${encodeURIComponent(jogo.id)}" class="btn-download">Baixar</a>
    </div>
  `).join('');

  if (emptyMsg) emptyMsg.style.display = filtrados.length ? 'none' : 'block';
}

if (grid) {
  if (categorySelect) {
    const categorias = [...new Set(siteData.jogos.map(j => j.categoria).filter(Boolean))];
    categorias.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
    categorySelect.addEventListener('change', renderGames);
  }

  if (countEl) countEl.textContent = siteData.jogos.length;
  if (searchInput) searchInput.addEventListener('input', renderGames);

  renderGames();
}

/* =========================================================
   PÁGINA DE DOWNLOAD
   ========================================================= */
const downloadRoot = document.getElementById('download-root');

if (downloadRoot) {
  const params = new URLSearchParams(window.location.search);
  const jogoId = params.get('jogo');
  const jogo = siteData.jogos.find(j => j.id === jogoId);

  if (!jogo) {
    downloadRoot.innerHTML = `
      <div class="download-card">
        <h1>Jogo não encontrado</h1>
        <p class="download-desc">Esse link não existe ou o jogo foi removido do catálogo.</p>
        <a href="index.html" class="btn-entrar" style="margin-top:1.5rem;">← Voltar ao catálogo</a>
      </div>
    `;
  } else {
    downloadRoot.innerHTML = `
      <div class="download-card">
        ${jogo.capa ? `<img src="${jogo.capa}" alt="Capa de ${jogo.titulo}" class="download-cover">` : ''}
        <span class="game-cat">${jogo.categoria || 'Geral'}</span>
        <h1>${jogo.titulo}</h1>
        <p class="download-desc">${jogo.descricao || 'Sem descrição.'}</p>
        ${jogo.tamanho ? `<p class="download-size">📦 Tamanho: ${jogo.tamanho}</p>` : ''}
        ${jogo.link
          ? `<a href="${jogo.link}" download class="btn-entrar">⬇ Baixar agora</a>`
          : `<p class="download-desc">O link de download ainda não foi configurado no painel admin.</p>`}
        <a href="index.html" class="back-link">← Voltar ao catálogo</a>
      </div>
    `;
  }
}

/* =========================================================
   PAINEL ADMIN
   ========================================================= */
const loginWrap = document.getElementById('login-wrap');
const adminShell = document.getElementById('admin-shell');

if (loginWrap && adminShell) {
  const loginForm = document.getElementById('login-form');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  const navButtons = document.querySelectorAll('.admin-nav button');
  const panels = document.querySelectorAll('.panel');

  const gameForm = document.getElementById('game-form');
  const gamesListEl = document.getElementById('games-list');
  const gamesTotalEl = document.getElementById('games-total');

  const exportBtn = document.getElementById('export-btn');
  const importInput = document.getElementById('import-input');

  const passwordForm = document.getElementById('password-form');
  const passwordError = document.getElementById('password-error');
  const passwordSuccess = document.getElementById('password-success');

  function showAdmin() {
    loginWrap.style.display = 'none';
    adminShell.style.display = 'block';
    renderGamesList();
  }

  if (sessionStorage.getItem('666xk_admin_ok') === '1') {
    showAdmin();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (loginPassword.value === siteData.password) {
        sessionStorage.setItem('666xk_admin_ok', '1');
        loginError.textContent = '';
        showAdmin();
      } else {
        loginError.textContent = 'Senha incorreta.';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('666xk_admin_ok');
      adminShell.style.display = 'none';
loginWrap.style.display = 'flex';
      if (loginForm) loginForm.reset();
    });
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel)?.classList.add('active');
    });
  });

  function renderGamesList() {
    if (!gamesListEl) return;
    if (gamesTotalEl) gamesTotalEl.textContent = siteData.jogos.length;

    if (!siteData.jogos.length) {
      gamesListEl.innerHTML = '<p class="desc">Nenhum jogo cadastrado ainda.</p>';
      return;
    }

    gamesListEl.innerHTML = siteData.jogos.map(jogo => `
      <div class="admin-game-row" data-id="${jogo.id}">
        <div>
          <strong>${jogo.titulo}</strong>
          <span class="game-cat">${jogo.categoria || 'Geral'}</span>
        </div>
        <div class="admin-game-actions">
          <button type="button" class="btn-outline-sm copy-link" data-id="${jogo.id}">🔗 Copiar link</button>
          <button type="button" class="btn-outline-sm danger delete-game" data-id="${jogo.id}">🗑 Excluir</button>
        </div>
      </div>
    `).join('');

    gamesListEl.querySelectorAll('.copy-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}download.html?jogo=${btn.dataset.id}`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => {
            btn.textContent = '✅ Copiado!';
            setTimeout(() => (btn.textContent = '🔗 Copiar link'), 1500);
          });
        } else {
          prompt('Copie o link:', url);
        }
      });
    });

    gamesListEl.querySelectorAll('.delete-game').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Excluir este jogo do catálogo?')) return;
        siteData.jogos = siteData.jogos.filter(j => j.id !== btn.dataset.id);
        saveData(siteData);
        renderGamesList();
      });
    });
  }

  if (gameForm) {
    gameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const titulo = document.getElementById('game-title').value.trim();
      const categoria = document.getElementById('game-category').value.trim() || 'Geral';
      const link = document.getElementById('game-download-url').value.trim();
      const descricao = document.getElementById('game-description').value.trim();
      const capa = document.getElementById('game-cover-url').value.trim();
      const tamanho = document.getElementById('game-size').value.trim();

      if (!titulo || !link) return;

      siteData.jogos.push({
        id: slugify(titulo),
        titulo,
        categoria,
        descricao,
        capa,
        link,
        tamanho
      });
      saveData(siteData);
      gameForm.reset();
      renderGamesList();
      alert('Jogo publicado! Ele já aparece no catálogo do site (nesse navegador).');
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(siteData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '666xk-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!Array.isArray(parsed.jogos)) throw new Error('Formato inválido');
          siteData = parsed;
          saveData(siteData);
          renderGamesList();
          alert('Backup importado com sucesso!');
        } catch (err) {
          alert('Arquivo inválido: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const atual = document.getElementById('current-password').value;
      const nova = document.getElementById('new-password').value;
      passwordError.textContent = '';
      passwordSuccess.textContent = '';

      if (atual !== siteData.password) {
        passwordError.textContent = 'Senha atual incorreta.';
        return;
      }
      if (nova.length < 4) {
        passwordError.textContent = 'A nova senha precisa ter ao menos 4 caracteres.';
        return;
      }
      siteData.password = nova;
      saveData(siteData);
      passwordForm.reset();
      passwordSuccess.textContent = 'Senha atualizada!';
    });
  }
}

/* =========================================================
   TELA "BEM VINDO" — some ao clicar em ENTRAR e libera o áudio
   (navegador só deixa tocar som depois de um clique/toque do usuário,
   por isso o áudio começa exatamente nesse botão)
   ========================================================= */
const ENTERED_KEY = '666xk_entered';
const welcomeOverlay = document.getElementById('welcome-overlay');
const welcomeEnterBtn = document.getElementById('welcome-enter');
const bgAudio = document.getElementById('bg-audio');

function entrarNoSite() {
  if (welcomeOverlay) welcomeOverlay.classList.add('hidden');
  sessionStorage.setItem(ENTERED_KEY, '1');
  tocarMusica();
}

if (welcomeOverlay) {
  // se a pessoa já entrou nessa sessão (ex: voltou do catálogo pro download),
  // não mostra a tela de novo
  if (sessionStorage.getItem(ENTERED_KEY) === '1') {
    welcomeOverlay.classList.add('hidden');
  }
  if (welcomeEnterBtn) welcomeEnterBtn.addEventListener('click', entrarNoSite);
} else if (bgAudio && sessionStorage.getItem(ENTERED_KEY) === '1') {
  // páginas sem tela de bem-vindo (ex: download.html): retoma a música
  // automaticamente se a pessoa já tinha liberado o áudio antes
  tocarMusica();
}

/* =========================================================
   BOLINHA DE ÁUDIO FLUTUANTE (tocar / pausar)
   ========================================================= */
const audioBubble = document.getElementById('audio-bubble');
const audioBubbleIcon = document.getElementById('audio-bubble-icon');

function atualizarBolinha() {
  if (!audioBubble || !bgAudio) return;
  const tocando = !bgAudio.paused;
  audioBubble.classList.toggle('playing', tocando);
  if (audioBubbleIcon) audioBubbleIcon.textContent = tocando ? '❚❚' : '▶';
}

function tocarMusica() {
  if (!bgAudio) return;
  bgAudio.play().catch(() => {
    // se o navegador bloquear o autoplay, só atualiza o ícone;
    // a pessoa toca na bolinha e a música inicia normalmente
  });
  atualizarBolinha();
}

if (audioBubble && bgAudio) {
  audioBubble.addEventListener('click', () => {
    if (bgAudio.paused) {
      bgAudio.play().catch(() => {});
    } else {
      bgAudio.pause();
    }
    sessionStorage.setItem(ENTERED_KEY, '1');
    atualizarBolinha();
  });
  bgAudio.addEventListener('play', atualizarBolinha);
  bgAudio.addEventListener('pause', atualizarBolinha);
  atualizarBolinha();
}

console.log('666 xk — carregado.');
