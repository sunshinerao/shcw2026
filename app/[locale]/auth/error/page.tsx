import { getTranslations } from "next-intl/server";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

export default async function AuthErrorPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { error?: string };
}) {
  const t = await getTranslations({ locale, namespace: "auth.error" });
  const errorMessages: Record<string, string> = {
    CredentialsSignin: t("messages.CredentialsSignin"),
    AccessDenied: t("messages.AccessDenied"),
    SessionRequired: t("messages.SessionRequired"),
    Default: t("messages.Default"),
  };

  const errorCode = searchParams?.error || "Default";
  const message = errorMessages[errorCode] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md w-full">
        <Card className="shadow-xl border-slate-100">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-slate-900">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-slate-600">{message}</p>
            <div className="flex flex-col gap-3">
              <Link href="/auth/login">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {t("actions.backToLogin")}
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("actions.backHome")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}