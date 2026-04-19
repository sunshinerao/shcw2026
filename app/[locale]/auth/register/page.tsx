"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, CheckCircle, Phone, Briefcase, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Link } from "@/i18n/routing";
import { COUNTRIES } from "@/data/countries";
import { combinePhoneNumber, getLocalizedSalutationOptions, getPhoneAreaByCountry } from "@/lib/user-form-options";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const common = useTranslations("common");
  const layout = useTranslations("adminLayout");
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showOrgSection, setShowOrgSection] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [phoneAreaSearch, setPhoneAreaSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    salutation: "",
    country: "",
    phoneArea: "",
    phone: "",
    title: "",
    bio: "",
    organizationName: "",
    organizationIndustry: "",
    organizationWebsite: "",
    organizationDescription: "",
  });
  const salutationOptions = getLocalizedSalutationOptions(locale === "en" ? "en" : "zh");
  const phoneAreaOptions = Object.values(
    COUNTRIES.reduce<Record<string, { value: string; countries: string[]; searchText: string[] }>>((acc, country) => {
      const areaCode = getPhoneAreaByCountry(country.code);
      if (!areaCode) {
        return acc;
      }

      if (!acc[areaCode]) {
        acc[areaCode] = { value: areaCode, countries: [], searchText: [] };
      }

      acc[areaCode].countries.push(locale === "zh" ? `${country.zh}/${country.en}` : `${country.en}/${country.zh}`);
      acc[areaCode].searchText.push(country.zh, country.en, country.code, areaCode);
      return acc;
    }, {})
  )
    .map((option) => ({
      value: option.value,
      label: `${option.value} (${option.countries.join(", ")})`,
      searchText: option.searchText.join(" ").toLowerCase(),
    }))
    .sort((a, b) => a.value.localeCompare(b.value));

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push(`/${locale}/auth/login`);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [success, locale, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError(t("errors.passwordMismatch"));
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError(t("errors.passwordTooShort"));
      setIsLoading(false);
      return;
    }

    if (!formData.title.trim()) {
      setError(t("errors.titleRequired"));
      setIsLoading(false);
      return;
    }

    if (!formData.organizationName.trim()) {
      setError(t("errors.organizationRequired"));
      setIsLoading(false);
      return;
    }

    if (!formData.country) {
      setError(t("errors.countryRequired"));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          salutation: formData.salutation || undefined,
          phone: combinePhoneNumber(formData.phoneArea, formData.phone) || undefined,
          country: formData.country,
          title: formData.title.trim(),
          bio: formData.bio || undefined,
          organization: {
            name: formData.organizationName.trim(),
            industry: formData.organizationIndustry || undefined,
            website: formData.organizationWebsite || undefined,
            description: formData.organizationDescription || undefined,
          },
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || t("errors.failed"));
        return;
      }

      setSuccess(true);
    } catch {
      setError(t("errors.failed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("successTitle")}</h2>
            <p className="text-slate-600 mb-6">{t("successSubtitle")}</p>
            <Link href="/auth/login">
              <Button className="bg-emerald-600 hover:bg-emerald-700">{t("login")}</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-slate-50 pt-6 pb-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full"
      >
        <div className="text-center mb-6 pt-1">
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt={layout("logoAlt")}
              width={260}
              height={72}
              priority
              sizes="(max-width: 640px) 200px, 260px"
              className="h-12 sm:h-16 w-auto object-contain mx-auto"
            />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">{t("pageTitle")}</h1>
            <p className="text-slate-500 mt-2">{t("pageSubtitle")}</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salutation">{t("salutationLabel")}</Label>
                <Select
                  value={formData.salutation}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, salutation: value }))}
                >
                  <SelectTrigger id="salutation">
                    <SelectValue placeholder={t("salutationPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {salutationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t("nameLabel")} *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t("namePlaceholder")}
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("emailLabel")} *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t("titleLabel")} *</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="title"
                    type="text"
                    placeholder={t("titlePlaceholder")}
                    value={formData.title}
                    onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgName">{t("orgNameLabel")} *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="orgName"
                    type="text"
                    placeholder={t("orgNamePlaceholder")}
                    value={formData.organizationName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, organizationName: event.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">{t("countryLabel")} *</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    country: value,
                    phoneArea: getPhoneAreaByCountry(value) || prev.phoneArea,
                  }));
                  setCountrySearch("");
                }}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder={t("countryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 pb-2">
                    <Input
                      placeholder={locale === "zh" ? "输入搜索..." : "Search..."}
                      value={countrySearch}
                      onChange={(event) => setCountrySearch(event.target.value)}
                      className="h-8"
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </div>
                  {COUNTRIES.filter((country) => {
                    if (!countrySearch) return true;
                    const q = countrySearch.toLowerCase();
                    return country.zh.includes(q) || country.en.toLowerCase().includes(q) || country.code.toLowerCase().includes(q);
                  }).map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {locale === "zh" ? `${country.zh} [${country.en}]` : `${country.en} [${country.zh}]`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneArea">{t("phoneAreaLabel")}</Label>
                <Select
                  value={formData.phoneArea}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, phoneArea: value }));
                    setPhoneAreaSearch("");
                  }}
                >
                  <SelectTrigger id="phoneArea">
                    <SelectValue placeholder={t("phoneAreaPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2">
                      <Input
                        placeholder={locale === "zh" ? "输入国家或区号..." : "Search country or code..."}
                        value={phoneAreaSearch}
                        onChange={(event) => setPhoneAreaSearch(event.target.value)}
                        className="h-8"
                        onKeyDown={(event) => event.stopPropagation()}
                      />
                    </div>
                    {phoneAreaOptions
                      .filter((option) => {
                        if (!phoneAreaSearch) return true;
                        const query = phoneAreaSearch.toLowerCase();
                        return option.searchText.includes(query);
                      })
                      .map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("phoneLabel")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t("phonePlaceholder")}
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t("bioLabel")}</Label>
              <Textarea
                id="bio"
                placeholder={t("bioPlaceholder")}
                value={formData.bio}
                onChange={(event) => setFormData((prev) => ({ ...prev, bio: event.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("passwordLabel")} *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={formData.password}
                  onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")} *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("confirmPasswordPlaceholder")}
                  value={formData.confirmPassword}
                  onChange={(event) => setFormData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Organization section (collapsible) */}
            <div className="border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setShowOrgSection(!showOrgSection)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-slate-700">{t("organizationSection")}</span>
                  <span className="text-xs text-slate-400">{t("organizationOptional")}</span>
                </div>
                {showOrgSection ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              {showOrgSection && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgIndustry">{t("orgIndustryLabel")}</Label>
                      <Input
                        id="orgIndustry"
                        placeholder={t("orgIndustryPlaceholder")}
                        value={formData.organizationIndustry}
                        onChange={(event) => setFormData((prev) => ({ ...prev, organizationIndustry: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgWebsite">{t("orgWebsiteLabel")}</Label>
                      <Input
                        id="orgWebsite"
                        type="url"
                        placeholder={t("orgWebsitePlaceholder")}
                        value={formData.organizationWebsite}
                        onChange={(event) => setFormData((prev) => ({ ...prev, organizationWebsite: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgDescription">{t("orgDescriptionLabel")}</Label>
                    <Textarea
                      id="orgDescription"
                      placeholder={t("orgDescriptionPlaceholder")}
                      value={formData.organizationDescription}
                      onChange={(event) => setFormData((prev) => ({ ...prev, organizationDescription: event.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            <LoadingButton
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              loading={isLoading}
              loadingText={t("submitting")}
            >
              {t("submit")}
            </LoadingButton>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              {t("hasAccount")} {" "}
              <Link
                href="/auth/login"
                className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center"
              >
                {t("login")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            {common("backHome")}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
