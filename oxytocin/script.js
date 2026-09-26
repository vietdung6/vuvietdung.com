document.addEventListener('DOMContentLoaded', function () {
    const progressWrap = document.createElement('div');
    progressWrap.className = 'reading-progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress-bar';
    progressWrap.appendChild(progressBar);
    document.body.insertBefore(progressWrap, document.body.firstChild);

    const controls = document.createElement('div');
    controls.className = 'reading-controls';
    controls.innerHTML = `
        <button class="control-btn" id="themeToggle" title="Chuyển chế độ sáng/tối (T)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </button>
        <button class="control-btn" id="fontToggle" title="Thay đổi cỡ chữ (F)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
        </button>
        <a class="control-btn" id="homeBtn" href="index.php" title="Về trang chủ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </a>
    `;
    document.body.appendChild(controls);

    const homeBtn = document.getElementById('homeBtn');
    if (document.body.querySelector('.home-hero') || document.querySelector('.breadcrumb')) {
        if (homeBtn && window.location.pathname.endsWith('index.php')) {
            homeBtn.style.display = 'none';
        }
    }

    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.title = 'Quay lại đầu trang';
    backToTopBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
    `;
    document.body.appendChild(backToTopBtn);

    const themeToggle = document.getElementById('themeToggle');
    const fontToggle = document.getElementById('fontToggle');
    const savedTheme = localStorage.getItem('reading_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('theme-light');
        themeToggle.classList.add('active');
    }

    themeToggle.addEventListener('click', function () {
        const isLight = document.body.classList.toggle('theme-light');
        themeToggle.classList.toggle('active', isLight);
        localStorage.setItem('reading_theme', isLight ? 'light' : 'dark');
    });

    const fontSizes = ['', 'font-large', 'font-xl'];
    const savedFont = localStorage.getItem('reading_fontsize') || '';
    let currentFontIndex = fontSizes.indexOf(savedFont);
    if (currentFontIndex > 0) {
        document.body.classList.add(fontSizes[currentFontIndex]);
    }

    fontToggle.addEventListener('click', function () {
        document.body.classList.remove(fontSizes[currentFontIndex]);
        currentFontIndex = (currentFontIndex + 1) % fontSizes.length;
        if (currentFontIndex > 0) {
            document.body.classList.add(fontSizes[currentFontIndex]);
        }
        localStorage.setItem('reading_fontsize', fontSizes[currentFontIndex]);
    });

    const episodes = document.querySelectorAll('.episode');

    episodes.forEach(function (episode) {
        const savedState = localStorage.getItem('episode_' + episode.id);
        if (savedState === 'collapsed') {
            episode.classList.add('collapsed');
        }

        const header = episode.querySelector('.episode-header');
        if (header) {
            header.addEventListener('click', function (e) {
                if (e.target.closest('a')) return;
                episode.classList.toggle('collapsed');
                localStorage.setItem('episode_' + episode.id,
                    episode.classList.contains('collapsed') ? 'collapsed' : 'expanded');
            });
        }
    });

    let controlsVisible = false;
    function updateScrollState() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = progress + '%';

        const show = scrollTop > 300;
        if (show !== controlsVisible) {
            controlsVisible = show;
            const toggleList = [backToTopBtn, themeToggle, fontToggle];
            if (homeBtn && !window.location.pathname.endsWith('index.php')) {
                toggleList.push(homeBtn);
            }
            toggleList.forEach(function (el) {
                if (show) el.classList.add('visible');
                else el.classList.remove('visible');
            });
        }
    }

    function updateActiveArc() {
        const arcSections = document.querySelectorAll('section.arc[id]');
        const arcTabs = document.querySelectorAll('.arc-tab');
        if (!arcSections.length || !arcTabs.length) return;

        const scrollPos = window.pageYOffset + 150;
        let currentId = '';

        arcSections.forEach(function (arc) {
            const top = arc.offsetTop;
            const bottom = top + arc.offsetHeight;
            if (scrollPos >= top && scrollPos < bottom) {
                currentId = arc.id;
            }
        });

        if (!currentId && arcSections.length) {
            currentId = arcSections[0].id;
        }
        if (currentId) {
            arcTabs.forEach(function (tab) {
                const match = tab.getAttribute('data-arc') === currentId;
                tab.classList.toggle('active', match);
            });
        }
    }

    let ticking = false;
    window.addEventListener('scroll', function () {
        if (!ticking) {
            window.requestAnimationFrame(function () {
                updateScrollState();
                updateActiveArc();
                ticking = false;
            });
            ticking = true;
        }
    });
    updateScrollState();
    updateActiveArc();

    backToTopBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const episode = target.closest('.episode');
                if (episode && episode.classList.contains('collapsed')) {
                    episode.classList.remove('collapsed');
                    localStorage.setItem('episode_' + episode.id, 'expanded');
                }
                setTimeout(function () {
                    window.scrollTo({
                        top: target.getBoundingClientRect().top + window.pageYOffset - 70,
                        behavior: 'smooth'
                    });
                }, 50);
            }
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (e.key === 'End') {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else if (e.key === 't' || e.key === 'T') {
            if (!e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                themeToggle.click();
            }
        } else if (e.key === 'f' || e.key === 'F') {
            if (!e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                fontToggle.click();
            }
        } else if (e.key === 'ArrowLeft') {
            if (!e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                const prev = document.querySelector('.nav-arrow:not(.disabled):first-of-type, .bottom-nav-btn:not(.disabled):first-of-type');
                if (prev && prev.href && !prev.getAttribute('aria-disabled')) {
                    window.location.href = prev.href;
                }
            }
        } else if (e.key === 'ArrowRight') {
            if (!e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                const epNavs = document.querySelectorAll('.page-nav-arrows .nav-arrow:not(.disabled)');
                const bottom = document.querySelectorAll('.bottom-nav-btn:not(.disabled):last-of-type');
                let target = null;
                if (epNavs.length > 0) {
                    target = epNavs[epNavs.length - 1];
                } else if (bottom.length > 0) {
                    target = bottom[bottom.length - 1];
                }
                if (target && target.href && !target.getAttribute('aria-disabled')) {
                    window.location.href = target.href;
                }
            }
        }
    });

});