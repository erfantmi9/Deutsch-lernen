import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function BackToListen() {
  const t = useTranslations("Listen");
  return (
    <Link href="/listen" className="btn-ghost">
      <span aria-hidden="true" className="me-1 rtl:-scale-x-100">←</span> {t("back")}
    </Link>
  );
}
