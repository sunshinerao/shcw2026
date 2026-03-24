import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("notFoundPage");

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-7xl font-bold text-slate-200">404</div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("title")}</h2>
          <p className="text-slate-600">{t("description")}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              {t("home")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/events">
              <Search className="w-4 h-4 mr-2" />
              {t("events")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
