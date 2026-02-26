/**
 * App Script - Modern Minimalist Portfolio
 */

document.addEventListener('DOMContentLoaded', () => {

    /* -----------------------------------------
       1. Scroll Animations (Intersection Observer)
    ----------------------------------------- */
    // Add staggered delay to project cards
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Element becomes visible when 10% is in viewport
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Unobserve after first animation to keep it clean
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.animate-on-scroll');
    // small stagger effect for all generic sections
    fadeElements.forEach((el, i) => {
        if (!el.classList.contains('project-card')) {
            el.style.transitionDelay = `${(i % 3) * 0.1}s`;
        }
        observer.observe(el);
    });

    /* -----------------------------------------
       2. Simple Theme Toggle
    ----------------------------------------- */
    const themeToggleBtn = document.querySelector('.theme-toggle');
    const themeIcon = themeToggleBtn.querySelector('i');

    // Check saved preference from localStorage or system preference
    let isDark = localStorage.getItem('theme-preference') === 'dark' || 
                 window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply saved theme on load
    if (isDark) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeIcon.classList.remove('ph-sun');
        themeIcon.classList.add('ph-moon');
    }

    themeToggleBtn.addEventListener('click', () => {
        isDark = !isDark;
        localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');
        
        if (isDark) {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            themeIcon.classList.remove('ph-sun');
            themeIcon.classList.add('ph-moon');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeIcon.classList.remove('ph-moon');
            themeIcon.classList.add('ph-sun');
        }
    });

    /* -----------------------------------------
       3. Tooltip logic for Dock (Optional Polish)
       The CSS title attribute already handles native tooltips,
       but this maintains the slick feel without extra JS overhead.
    ----------------------------------------- */
});
