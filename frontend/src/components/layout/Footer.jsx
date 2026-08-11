import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Globe, Share2, MessageCircle } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import './Footer.css';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];

export function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [footerRef, inView] = useInView({ threshold: 0.1 });

  const handleLinkClick = (e, href) => {
    const targetId = href.replace('#', '');
    if (location.pathname === '/') {
      e.preventDefault();
      const element = document.getElementById(targetId);
      if (element) {
        if (window.lenis) {
          window.lenis.scrollTo(element);
        } else {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      e.preventDefault();
      navigate(`/?scrollTo=${targetId}`);
    }
  };

  return (
    <footer ref={footerRef} className={`ft-footer ${inView ? 'is-visible' : ''}`}>
      {/* Headline */}
      <h2 className="ft-headline ft-reveal" style={{ '--delay': '0ms' }}>
        Streamline your enterprise operations —<br />
        <span className="ft-gradient">automatically</span>.
      </h2>

      {/* Nav links */}
      <nav className="ft-nav ft-reveal" style={{ '--delay': '150ms' }}>
        {NAV_LINKS.map(l => (
          <a
            key={l.label}
            href={l.href}
            onClick={(e) => handleLinkClick(e, l.href)}
            className="ft-nav-link"
          >
            {l.label}
          </a>
        ))}
        <Link to="/login" className="ft-nav-link ft-nav-link--cta">Get Started</Link>
      </nav>

      {/* Legal + social row */}
      <div className="ft-bottom-row ft-reveal" style={{ '--delay': '300ms' }}>
        <a href="#" className="ft-legal-link">Terms & Conditions</a>
        <a href="#" className="ft-legal-link">Privacy Policy</a>

        {/* Social icons */}
        <div className="ft-socials">
          <a href="#" className="ft-social" aria-label="Website">
            <Globe size={16} />
          </a>
          <a href="#" className="ft-social" aria-label="Share">
            <Share2 size={16} />
          </a>
          <a href="#" className="ft-social" aria-label="Community">
            <MessageCircle size={16} />
          </a>
        </div>
      </div>

      {/* Watermark brand name */}
      <div className="ft-watermark ft-watermark-reveal" style={{ '--delay': '450ms' }} aria-hidden="true">RAPID</div>

      {/* Copyright */}
      <p className="ft-copy ft-reveal" style={{ '--delay': '550ms' }}>© {new Date().getFullYear()} Rapid ERP. All rights reserved.</p>
    </footer>
  );
}
