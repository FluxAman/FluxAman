// Smooth scroll for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Enhanced fade-in on scroll with stagger effect
const cards = document.querySelectorAll('.card');

const observer = new IntersectionObserver(entries => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.style.opacity = 1;
        entry.target.style.transform = 'translateY(0)';
      }, index * 100);
    }
  });
}, { threshold: 0.1 });

cards.forEach(card => {
  card.style.opacity = 0;
  card.style.transform = 'translateY(30px)';
  card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
  observer.observe(card);
});

// Animated counter for stats
const animateCounter = (element, target) => {
  let current = 0;
  const increment = target / 50;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target + '+';
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current) + '+';
    }
  }, 30);
};

const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const h3 = entry.target.querySelector('h3');
      const targetValue = parseInt(h3.textContent);
      animateCounter(h3, targetValue);
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stats-grid > div').forEach(stat => {
  statsObserver.observe(stat);
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual) {
    heroVisual.style.transform = `translateY(${scrolled * 0.3}px)`;
  }
});

// Typing animation for hero text
const heroTitle = document.querySelector('.hero h1');
if (heroTitle) {
  const text = heroTitle.innerHTML;
  heroTitle.innerHTML = '';
  heroTitle.style.opacity = 1;

  let i = 0;
  const typeWriter = () => {
    if (i < text.length) {
      heroTitle.innerHTML += text.charAt(i);
      i++;
      setTimeout(typeWriter, 50);
    }
  };

  setTimeout(typeWriter, 500);
}

// Cursor glow effect
const cursorGlow = document.createElement('div');
cursorGlow.style.cssText = `
  position: fixed;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.4), transparent);
  pointer-events: none;
  z-index: 9999;
  transition: transform 0.1s ease;
  filter: blur(10px);
`;
document.body.appendChild(cursorGlow);

document.addEventListener('mousemove', (e) => {
  cursorGlow.style.left = e.clientX - 10 + 'px';
  cursorGlow.style.top = e.clientY - 10 + 'px';
});

// Button hover effects
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mouseenter', function () {
    this.style.transform = 'translateY(-2px) scale(1.05)';
  });

  btn.addEventListener('mouseleave', function () {
    this.style.transform = 'translateY(0) scale(1)';
  });
});
