import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import dbHero from '../../assets/dbHero.png';
import { Features } from '../../components/layout/Features';
import HowItWorks from '../../components/layout/HowItWorks';
import FAQ from '../../components/layout/FAQ';
import { Footer } from '../../components/layout/Footer';
import { CreditCard } from 'lucide-react';
import './HomePage.css';



const HomePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const imageContainerRef = useRef(null);

  useEffect(() => {
    const scrollToId = searchParams.get('scrollTo');
    if (scrollToId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollToId);
        if (element) {
          if (window.lenis) {
            window.lenis.scrollTo(element, { offset: -90 });
          } else {
            const yOffset = -90;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);


  useEffect(() => {
    const handleScroll = () => {
      if (!imageContainerRef.current) return;
      
      const scrollY = window.scrollY;
      const maxScroll = 1200; // Animation completes ultra-smoothly over 1200px of scrolling
      const progress = Math.min(scrollY / maxScroll, 1);
      
      // Smooth cubic-bezier easing for fluid feel
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      // Gentle interpolation:
      // At scroll 0: rotateX = 4deg, scale = 0.98, translateY = -10px
      // At scroll 1200: rotateX = 0deg, scale = 1.0, translateY = 0px
      const rotateX = 4 * (1 - easedProgress);
      const scale = 0.98 + 0.02 * easedProgress;
      const translateY = -10 * (1 - easedProgress);
      
      imageContainerRef.current.style.transform = `perspective(1200px) rotateX(${rotateX}deg) translateY(${translateY}px) scale(${scale})`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once initially
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="landing-container">
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero-section">


        <div className="hero-content">
          {/* Trusted Badge */}
          <div className="slide-up" style={{ '--slide-delay': '0ms' }}>
            <div className="trusted-badge">
              <span className="trusted-text">10+ companies registered</span>
            </div>
          </div>

          {/* Heading — word-by-word left-to-right blur reveal */}
          <h1 className="hero-title">
            {['Boost', 'Business', 'Efficiency'].map((word, i) => (
              <span
                key={word}
                className="word-blur-reveal"
                style={{ '--word-delay': `${80 + i * 80}ms` }}
              >
                {word}{' '}
              </span>
            ))}
            <br />
            {['with', 'our'].map((word, i) => (
              <span
                key={word}
                className="word-blur-reveal"
                style={{ '--word-delay': `${320 + i * 80}ms` }}
              >
                {word}{' '}
              </span>
            ))}
            <span
              className="highlight-text word-blur-reveal"
              style={{ '--word-delay': '480ms' }}
            >
              ERP{' '}
            </span>
            <span
              className="highlight-text word-blur-reveal"
              style={{ '--word-delay': '560ms' }}
            >
              solutions
            </span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle blur-reveal" style={{ '--blur-delay': '680ms' }}>
            Monitor every movement across your business—<br />
            from purchase orders to product delivery.
          </p>

          {/* CTA Group */}
          <div className="hero-cta-group">
            <div className="slide-up" style={{ '--slide-delay': '820ms' }}>
              <button className="hero-cta-btn" onClick={() => navigate('/login')}>
                Get Started For Free
              </button>
            </div>
            <div className="slide-up" style={{ '--slide-delay': '940ms' }}>
              <span className="hero-subtext">
                <CreditCard size={14} style={{ color: '#FF540E', strokeWidth: 2 }} />
                No credit card required
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Showcase Image with X-Axis perspective rotation */}
        <div className="hero-image-wrapper">
          <div ref={imageContainerRef} className="hero-image-container">
            <img src={dbHero} alt="Dashboard Analytics Preview" className="hero-dashboard-img" />
          </div>
        </div>
      </section>

      {/* Unique Features Section */}
      <Features />

      {/* How It Works Section */}
      <HowItWorks />

      {/* FAQ Section */}
      <FAQ />

      {/* Footer Section */}
      <Footer />
    </div>
  );
};

export default HomePage;
