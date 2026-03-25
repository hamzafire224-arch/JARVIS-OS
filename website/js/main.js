/* ═══════════════════════════════════════════════════════════════════════════
   PersonalJARVIS — Main JavaScript
   Navigation, scroll reveals, counters, FAQ, card glow, typing effect
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollReveal();
    initCountUp();
    initFAQ();
    initCardGlow();
    initTypingEffect();
});

/* ─── Navigation ────────────────────────────────────────────────────────── */
function initNavigation() {
    const nav = document.querySelector('.nav');
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            nav?.classList.add('scrolled');
        } else {
            nav?.classList.remove('scrolled');
        }
    });

    toggle?.addEventListener('click', () => {
        toggle.classList.toggle('open');
        links?.classList.toggle('mobile-open');
    });

    links?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            toggle?.classList.remove('open');
            links?.classList.remove('mobile-open');
        });
    });

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    links?.querySelectorAll('a:not(.btn)').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}

/* ─── Scroll Reveal ─────────────────────────────────────────────────────── */
function initScrollReveal() {
    const revealElements = document.querySelectorAll(
        '.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children'
    );

    if (revealElements.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach(el => observer.observe(el));
}

/* ─── Count-Up Animation ────────────────────────────────────────────────── */
function initCountUp() {
    const counters = document.querySelectorAll('.count-up');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.5 }
    );

    counters.forEach(el => observer.observe(el));
}

function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'), 10);
    const suffix = element.getAttribute('data-suffix') || '';
    const prefix = element.getAttribute('data-prefix') || '';
    const duration = 2000;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);

        element.textContent = `${prefix}${current}${suffix}`;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/* ─── FAQ Accordion ─────────────────────────────────────────────────────── */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question?.addEventListener('click', () => {
            faqItems.forEach(other => {
                if (other !== item) other.classList.remove('open');
            });
            item.classList.toggle('open');
        });
    });
}

/* ─── Card Glow Effect ──────────────────────────────────────────────────── */
function initCardGlow() {
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });
}

/* ─── Typing Effect ─────────────────────────────────────────────────────── */
function initTypingEffect() {
    const element = document.querySelector('.typing-text');
    if (!element) return;

    const phrases = [
        'build features faster',
        'debug code instantly',
        'automate your workflow',
        'ship with confidence',
        'learn from your habits',
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
        const current = phrases[phraseIndex];

        if (isDeleting) {
            element.textContent = current.substring(0, charIndex - 1);
            charIndex--;
        } else {
            element.textContent = current.substring(0, charIndex + 1);
            charIndex++;
        }

        let delay = isDeleting ? 35 : 70;

        if (!isDeleting && charIndex === current.length) {
            delay = 2500;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            delay = 400;
        }

        setTimeout(type, delay);
    }

    type();
}
