import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { ProductLogo, GitHubRepoButton, useIsLandingPage } from "@/src/components/core";
import ThemeSwitcher from "@/src/components/routes/root/ThemeSwitcher";
import ResponsiveSearchWrapper from "@/src/components/routes/root/ResponsiveSearchWrapper";
import { HEADER_STYLES } from "./styles";
import { cn } from "@/src/lib/utils";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Use the isLandingPage hook instead of router
  const isLandingPage = useIsLandingPage();

  // State to track scroll position
  const [scrolled, setScrolled] = useState(false);

  // Effect to handle scroll position
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrolled]);

  return (
    <header className={HEADER_STYLES.container(isLandingPage, scrolled)}>
      <nav className={HEADER_STYLES.nav}>
        <Link to="/" className={HEADER_STYLES.logo(isLandingPage)}>
          <ProductLogo
            size="small"
            withText={true}
            textClassName={cn("landing-text", HEADER_STYLES.logoText(isSearchOpen))}
          />
        </Link>

        {/* Adding a flex-grow spacer to push elements to edges */}
        <div className="flex-grow"></div>

        {/* Search bar in the middle with ability to grow/shrink */}
        <ResponsiveSearchWrapper
          onOpenChange={(isOpen: boolean) => {
            setIsSearchOpen(isOpen);
          }}
        />

        {/* Right section with fixed controls */}
        <div className={HEADER_STYLES.controls}>
          {/* Desktop: GitHub + Theme buttons */}
          <div className={HEADER_STYLES.githubContainer}>
            <GitHubRepoButton />
          </div>

          {/* Theme switcher - visible on all screen sizes */}
          <ThemeSwitcher />

          {/* Mobile menu button - hidden on desktop */}
          <button
            className={HEADER_STYLES.menuButton()}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>
    </header>
  );
}
