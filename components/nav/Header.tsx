import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/theme/ThemeToggle";
import MainNav from "./MainNav";
import SearchLink from "./SearchLink";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between h-header gap-2 px-4">
        <Link href="/" className="rounded-full">
          <Logo />
        </Link>
        <MainNav />
        <div className="flex items-center gap-2">
          <SearchLink />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
