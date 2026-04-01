"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Globe,
  Camera,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/data/countries";

const SALUTATION_OPTIONS = ["Dr.", "Mr.", "Ms.", "Mrs.", "Prof."];

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  title?: string;
  bio?: string;
  role: string;
  salutation?: string;
  climatePassportId?: string;
  country?: string;
}

interface Organization {
  name: string;
  industry?: string;
  website?: string;
  description?: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const t = useTranslations("dashboardProfilePage");
  const tLayout = useTranslations("dashboardLayout");
  const locale = useLocale();
  const { data: session, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    messageKey: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [profile, setProfile] = useState<UserProfile>({
    id: "",
    name: "",
    email: "",
    avatar: "",
    phone: "",
    title: "",
    bio: "",
    role: "ATTENDEE",
    salutation: "",
    climatePassportId: "",
    country: "",
  });
  const [organization, setOrganization] = useState<Organization>({
    name: "",
    industry: "",
    website: "",
    description: "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Partial<PasswordForm>>({});

  const fetchProfile = useCallback(async () => {
    if (!session?.user) {
      return;
    }

    setIsProfileLoading(true);

    try {
      const response = await fetch(`/api/user/profile?locale=${locale}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load profile");
      }

      setProfile({
        id: data.data.id,
        name: data.data.name || "",
        email: data.data.email || "",
        avatar: data.data.avatar || "",
        phone: data.data.phone || "",
        title: data.data.title || "",
        bio: data.data.bio || "",
        role: data.data.role || "ATTENDEE",
        salutation: data.data.salutation || "",
        climatePassportId: data.data.climatePassportId || "",
        country: data.data.country || "",
      });
      setOrganization(data.data.organization || {
        name: "",
        industry: "",
        website: "",
        description: "",
      });
    } catch {
      setAlert({ type: "error", messageKey: "profileFailed" });
    } finally {
      setIsProfileLoading(false);
    }
  }, [locale, session?.user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!alert) {
      return;
    }

    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, [alert]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((previous) => ({ ...previous, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          name: profile.name,
          phone: profile.phone,
          title: profile.title,
          bio: profile.bio,
          avatar: profile.avatar,
          salutation: profile.salutation,
          country: profile.country,
          organization: organization.name
            ? {
                name: organization.name,
                industry: organization.industry || null,
                website: organization.website || null,
                description: organization.description || null,
              }
            : undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Update failed");
      }

      setProfile((previous) => ({
        ...previous,
        name: data.data.name || "",
        avatar: data.data.avatar || "",
        phone: data.data.phone || "",
        title: data.data.title || "",
        bio: data.data.bio || "",
        salutation: data.data.salutation || "",
        country: data.data.country || "",
      }));
      setOrganization(data.data.organization || {
        name: "",
        industry: "",
        website: "",
        description: "",
      });

      await update({
        name: data.data.name || "",
        image: data.data.avatar || null,
      });

      setAlert({ type: "success", messageKey: "profileUpdated" });
    } catch {
      setAlert({ type: "error", messageKey: "profileFailed" });
    } finally {
      setIsLoading(false);
    }
  };

  const validatePasswordForm = () => {
    const errors: Partial<PasswordForm> = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = t("password.errors.currentRequired");
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = t("password.errors.newRequired");
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = t("password.errors.minLength");
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = t("password.errors.confirmRequired");
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = t("password.errors.mismatch");
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsPasswordLoading(true);

    try {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Password change failed");
      }

      setAlert({ type: "success", messageKey: "passwordUpdated" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({});
    } catch {
      setAlert({ type: "error", messageKey: "passwordFailed" });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return tLayout.has(`roles.${role}`) ? tLayout(`roles.${role}`) : role;
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("title")}</h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </motion.div>

      {alert && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          <Alert variant={alert.type === "error" ? "destructive" : "default"}>
            {alert.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{alert.type === "success" ? t("alerts.success") : t("alerts.error")}</AlertTitle>
            <AlertDescription>{t(`messages.${alert.messageKey}`)}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-white border">
          <TabsTrigger value="profile" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            <User className="w-4 h-4 mr-2" />
            {t("tabs.profile")}
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            <Lock className="w-4 h-4 mr-2" />
            {t("tabs.security")}
          </TabsTrigger>
          <TabsTrigger value="organization" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            <Building2 className="w-4 h-4 mr-2" />
            {t("tabs.organization")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle>{t("profileSection.title")}</CardTitle>
                <CardDescription>{t("profileSection.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className="w-24 h-24 border-2 border-slate-100">
                        <AvatarImage src={profile.avatar} />
                        <AvatarFallback className="bg-emerald-600 text-white text-2xl">{profile.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{t("profileSection.avatarTitle")}</h3>
                      <p className="text-sm text-slate-500 mt-1">{t("profileSection.avatarHelp")}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="salutation">
                        {t("fields.salutation")}
                      </Label>
                      <Select
                        value={profile.salutation || ""}
                        onValueChange={(value) => setProfile((previous) => ({ ...previous, salutation: value }))}
                      >
                        <SelectTrigger id="salutation">
                          <SelectValue placeholder={t("placeholders.salutation")} />
                        </SelectTrigger>
                        <SelectContent>
                          {SALUTATION_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">
                        <User className="w-4 h-4 inline mr-1" />
                        {t("fields.name")}
                      </Label>
                      <Input id="name" value={profile.name} onChange={(event) => setProfile((previous) => ({ ...previous, name: event.target.value }))} placeholder={t("placeholders.name")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        <Mail className="w-4 h-4 inline mr-1" />
                        {t("fields.email")}
                      </Label>
                      <Input id="email" type="email" value={profile.email} readOnly placeholder={t("placeholders.email")} className="bg-slate-50 text-slate-500" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="climatePassportId">
                        <Award className="w-4 h-4 inline mr-1" />
                        {t("fields.climatePassportId")}
                      </Label>
                      <Input id="climatePassportId" value={profile.climatePassportId || ""} readOnly className="bg-slate-50 text-slate-500" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        <Phone className="w-4 h-4 inline mr-1" />
                        {t("fields.phone")}
                      </Label>
                      <Input id="phone" value={profile.phone} onChange={(event) => setProfile((previous) => ({ ...previous, phone: event.target.value }))} placeholder={t("placeholders.phone")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">
                        <Globe className="w-4 h-4 inline mr-1" />
                        {t("fields.country")}
                      </Label>
                      <Select
                        value={profile.country || ""}
                        onValueChange={(value) => {
                          setProfile((previous) => ({ ...previous, country: value }));
                          setCountrySearch("");
                        }}
                      >
                        <SelectTrigger id="country">
                          <SelectValue placeholder={t("placeholders.country")} />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 pb-2">
                            <Input
                              placeholder={locale === "zh" ? "输入搜索..." : "Search..."}
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              className="h-8"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          {COUNTRIES
                            .filter((c) => {
                              if (!countrySearch) return true;
                              const q = countrySearch.toLowerCase();
                              return c.zh.includes(q) || c.en.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
                            })
                            .map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {locale === "zh" ? `${c.zh} [${c.en}]` : `${c.en} [${c.zh}]`}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">
                        <Briefcase className="w-4 h-4 inline mr-1" />
                        {t("fields.title")}
                      </Label>
                      <Input id="title" value={profile.title} onChange={(event) => setProfile((previous) => ({ ...previous, title: event.target.value }))} placeholder={t("placeholders.title")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">
                      <FileText className="w-4 h-4 inline mr-1" />
                      {t("fields.bio")}
                    </Label>
                    <Textarea id="bio" value={profile.bio} onChange={(event) => setProfile((previous) => ({ ...previous, bio: event.target.value }))} placeholder={t("placeholders.bio")} rows={4} />
                  </div>

                  <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-500">{t("profileSection.currentRole")}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      {getRoleLabel(profile.role)}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t("actions.saving")}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t("actions.save")}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle>{t("password.title")}</CardTitle>
                <CardDescription>{t("password.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  {([
                    ["currentPassword", "current", passwordForm.currentPassword],
                    ["newPassword", "new", passwordForm.newPassword],
                    ["confirmPassword", "confirm", passwordForm.confirmPassword],
                  ] as const).map(([fieldId, toggleKey, value]) => (
                    <div className="space-y-2" key={fieldId}>
                      <Label htmlFor={fieldId}>{t(`password.fields.${toggleKey}`)}</Label>
                      <div className="relative">
                        <Input
                          id={fieldId}
                          type={showPassword[toggleKey] ? "text" : "password"}
                          value={value}
                          onChange={(event) =>
                            setPasswordForm((previous) => ({
                              ...previous,
                              [fieldId]: event.target.value,
                            }))
                          }
                          placeholder={t(`password.placeholders.${toggleKey}`)}
                          className={passwordErrors[fieldId as keyof PasswordForm] ? "border-red-500" : ""}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((previous) => ({ ...previous, [toggleKey]: !previous[toggleKey] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword[toggleKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordErrors[fieldId as keyof PasswordForm] && (
                        <p className="text-sm text-red-500">{passwordErrors[fieldId as keyof PasswordForm]}</p>
                      )}
                      {fieldId === "newPassword" && <p className="text-xs text-slate-500">{t("password.hint")}</p>}
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isPasswordLoading}>
                      {isPasswordLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t("password.submitting")}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          {t("password.submit")}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle>{t("organization.title")}</CardTitle>
                <CardDescription>{t("organization.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">
                        <Building2 className="w-4 h-4 inline mr-1" />
                        {t("organization.nameLabel")}
                      </Label>
                      <Input
                        id="orgName"
                        value={organization.name || ""}
                        onChange={(event) => setOrganization((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder={t("organization.namePlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgIndustry">
                        {t("organization.industry")}
                      </Label>
                      <Input
                        id="orgIndustry"
                        value={organization.industry || ""}
                        onChange={(event) => setOrganization((prev) => ({ ...prev, industry: event.target.value }))}
                        placeholder={t("organization.industryPlaceholder")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgWebsite">
                      <Globe className="w-4 h-4 inline mr-1" />
                      {t("organization.website")}
                    </Label>
                    <Input
                      id="orgWebsite"
                      type="url"
                      value={organization.website || ""}
                      onChange={(event) => setOrganization((prev) => ({ ...prev, website: event.target.value }))}
                      placeholder={t("organization.websitePlaceholder")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgDescription">
                      {t("organization.about")}
                    </Label>
                    <Textarea
                      id="orgDescription"
                      value={organization.description || ""}
                      onChange={(event) => setOrganization((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder={t("organization.descriptionPlaceholder")}
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" disabled={isLoading} onClick={handleProfileSubmit}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t("actions.saving")}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t("actions.save")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
