import { memo, useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X, Home, BookOpen, Gift, MessageSquare, User, Coins, Flame, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const Layout = memo(() => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();

  // Mock user data - replace with context/store in real app
  const coins = 1247;
  const streak = 12;

  // Memoized nav items to prevent unnecessary re-renders
  const navItems = useMemo(
    () => [
      { title: t('home'), url: '/', icon: Home },
      { title: t('srs'), url: '/srs', icon: BookOpen },
      { title: t('decks'), url: '/decks', icon: BookOpen },
      { title: t('rewards'), url: '/rewards', icon: Gift },
      { title: t('forum'), url: '/forum', icon: MessageSquare },
      { title: t('profile'), url: '/profile', icon: User },
      { title: t('about'), url: '/about', icon: Globe },
    ],
    [t]
  );

  return (
    <div
      className="min-h-screen bg-background geometric-pattern"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{ willChange: 'transform' }} // Optimize for animations
    >
      {/* Top Navigation Bar */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">عربي SRS</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''} transition-colors duration-200 hover:text-accent-foreground`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              ))}
            </nav>

            {/* Language Toggle, Stats & Mobile Menu */}
            <div className="flex items-center space-x-4">
              {/* Language Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLanguage}
                className="transition-transform duration-200 hover:scale-110"
              >
                <Globe className="w-5 h-5" />
              </Button>

              {/* Stats Display */}
              <div className="hidden sm:flex items-center space-x-3">
                <div className="coin-counter flex items-center space-x-1 animate-fade-in-up">
                  <Coins className="w-4 h-4" />
                  <span>{coins.toLocaleString()}</span>
                </div>
                <div className="streak-badge flex items-center space-x-1 animate-fade-in-up">
                  <Flame className="w-4 h-4" />
                  <span>{streak}</span>
                </div>
              </div>

              {/* Mobile Menu */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="transition-transform duration-200 hover:scale-110">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side={language === 'ar' ? 'left' : 'right'} className="w-80">
                  <SheetHeader>
                    <SheetTitle className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <span>عربي SRS</span>
                    </SheetTitle>
                  </SheetHeader>

                  {/* Mobile Stats */}
                  <div className="flex items-center justify-center space-x-4 mt-6 mb-8">
                    <div className="coin-counter flex items-center space-x-1 animate-fade-in-up">
                      <Coins className="w-4 h-4" />
                      <span>{coins.toLocaleString()}</span>
                    </div>
                    <div className="streak-badge flex items-center space-x-1 animate-fade-in-up">
                      <Flame className="w-4 h-4" />
                      <span>{streak}</span>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="space-y-2">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `nav-item w-full ${isActive ? 'active' : ''} transition-colors duration-200 hover:bg-secondary/70`
                        }
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-muted p-4 text-center text-muted-foreground">
        &copy; 2025 Gulf Arabic Flashcards
      </footer>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;