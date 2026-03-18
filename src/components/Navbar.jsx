import { useState, useEffect } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav className={`kp-navbar ${scrolled ? "kp-navbar-scrolled" : ""}`}>
        <div className="kp-nav-container">
          <a href="/" className="kp-logo">
            KickPredict
          </a>

          <ul className="kp-nav-links">
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/about">About</a>
            </li>
            <li>
              <a href="/predictions">Predictions</a>
            </li>
            <li>
              <a href="/contact">Contact</a>
            </li>
          </ul>

          <div
            className={`kp-hamburger ${menuOpen ? "open" : ""}`}
            onClick={toggleMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className={`kp-mobile-menu ${menuOpen ? "active" : ""}`}>
        {/* <div className="kp-mobile-logo">KickPredict</div> */}

        <ul>
          <li>
            <a onClick={toggleMenu} href="/">
              Home
            </a>
          </li>
          <li>
            <a onClick={toggleMenu} href="/about">
              About
            </a>
          </li>
          <li>
            <a onClick={toggleMenu} href="/predictions">
              Predictions
            </a>
          </li>
          <li>
            <a onClick={toggleMenu} href="/contact">
              Contact
            </a>
          </li>
        </ul>
      </div>
    </>
  );
}
