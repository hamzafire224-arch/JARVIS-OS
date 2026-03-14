/* ═══════════════════════════════════════════════════════════════════════════
   PersonalJARVIS — Main JavaScript
   Navigation, scroll reveals, particles, counters, FAQ, mobile menu
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollReveal();
    initParticles();
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

    // Scroll state
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            nav?.classList.add('scrolled');
        } else {
            nav?.classList.remove('scrolled');
        }
    });

    // Mobile toggle
    toggle?.addEventListener('click', () => {
        toggle.classList.toggle('open');
        links?.classList.toggle('mobile-open');
    });

    // Close mobile on link click
    links?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            toggle?.classList.remove('open');
            links?.classList.remove('mobile-open');
        });
    });

    // Active link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    links?.querySelectorAll('a').forEach(link => {
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
                    // Don't unobserve — keeps effect on scroll
                }
            });
        },
        { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    revealElements.forEach(el => observer.observe(el));
}

/* ─── Floating Particles ────────────────────────────────────────────────── */
function initParticles() {
    const container = document.querySelector('.particles-container');
    if (!container) return;

    const shapes = ['particle-triangle', 'particle-circle', 'particle-square'];
    const count = 15;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        const shape = shapes[Math.floor(Math.random() * shapes.length)];

        particle.classList.add('particle', shape);
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${15 + Math.random() * 20}s`;
        particle.style.animationDelay = `${Math.random() * 15}s`;

        container.appendChild(particle);
    }
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

        // Ease out cubic
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
            // Close others
            faqItems.forEach(other => {
                if (other !== item) other.classList.remove('open');
            });
            // Toggle current
            item.classList.toggle('open');
        });
    });
}

/* ─── Card Glow Effect ──────────────────────────────────────────────────── */
function initCardGlow() {
    const cards = document.querySelectorAll('.card-glow');

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
        'manage your workflow',
        'automate everything',
        'ship with confidence',
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

        let delay = isDeleting ? 40 : 80;

        if (!isDeleting && charIndex === current.length) {
            delay = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            delay = 500;
        }

        setTimeout(type, delay);
    }

    type();
}
