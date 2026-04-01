"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Shield,
  Plane,
  Building2,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  ChevronLeft,
  User,
  Calendar,
  CreditCard,
  Phone,
  Mail,
  Briefcase,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { COUNTRIES } from "@/data/countries";

// 境外证件类型
const DOC_TYPES_INTERNATIONAL = [
  { value: "diplomatic_passport", zh: "外交护照", en: "Diplomatic Passport" },
  { value: "service_passport", zh: "公务护照", en: "Service Passport" },
  { value: "service_regular_passport", zh: "公务普通护照", en: "Service Regular Passport" },
  { value: "regular_passport", zh: "普通护照", en: "Regular Passport" },
  { value: "exit_entry_permit", zh: "中华人民共和国外国人出入境通行证", en: "Exit-Entry Permit for Foreigners" },
  { value: "other_travel_doc", zh: "其他有效出入境证件", en: "Other Valid Travel Document" },
];

// 境内证件类型
const DOC_TYPES_DOMESTIC = [
  { value: "id_card", zh: "居民身份证", en: "Resident ID Card", needBack: true },
  { value: "diplomatic_passport", zh: "外交护照", en: "Diplomatic Passport", needBack: false },
  { value: "service_passport", zh: "公务护照", en: "Service Passport", needBack: false },
  { value: "service_regular_passport", zh: "公务普通护照", en: "Service Regular Passport", needBack: false },
  { value: "regular_passport", zh: "普通护照", en: "Regular Passport", needBack: false },
  { value: "prc_travel_doc", zh: "中华人民共和国旅行证", en: "PRC Travel Document", needBack: false },
  { value: "hk_macao_permit", zh: "往来港澳通行证", en: "HK/Macao Travel Permit", needBack: true },
  { value: "taiwan_permit", zh: "大陆居民往来台湾通行证", en: "Taiwan Travel Permit", needBack: true },
  { value: "hk_macao_official", zh: "因公往来香港澳门特别行政区通行证（高官）", en: "Official HK/Macao Permit (Senior)", needBack: false },
  { value: "hk_macao_official_regular", zh: "因公往来香港澳门特别行政区通行证（普通）", en: "Official HK/Macao Permit (Regular)", needBack: false },
];

// 电话区号
const PHONE_AREAS = [
  { value: "+86", label: "+86 (中国/China)" },
  { value: "+1", label: "+1 (美国/US)" },
  { value: "+44", label: "+44 (英国/UK)" },
  { value: "+81", label: "+81 (日本/Japan)" },
  { value: "+82", label: "+82 (韩国/Korea)" },
  { value: "+49", label: "+49 (德国/Germany)" },
  { value: "+33", label: "+33 (法国/France)" },
  { value: "+61", label: "+61 (澳大利亚/Australia)" },
  { value: "+65", label: "+65 (新加坡/Singapore)" },
  { value: "+852", label: "+852 (香港/HK)" },
  { value: "+853", label: "+853 (澳门/Macao)" },
  { value: "+886", label: "+886 (台湾/Taiwan)" },
  { value: "+91", label: "+91 (印度/India)" },
  { value: "+971", label: "+971 (阿联酋/UAE)" },
  { value: "+966", label: "+966 (沙特/SA)" },
  { value: "+7", label: "+7 (俄罗斯/Russia)" },
  { value: "+55", label: "+55 (巴西/Brazil)" },
];

// 需要上传正反面的境内证件类型
const DOMESTIC_NEED_BACK = new Set(["id_card", "hk_macao_permit", "taiwan_permit"]);

interface SpecialPassApplication {
  entryType: "DOMESTIC" | "INTERNATIONAL" | "";
  country: string;
  name: string;
  birthDate: string;
  gender: string;
  docNumber: string;
  docValidFrom: string;
  docValidTo: string;
  docPhoto: string;
  docPhotoBack: string;
  photo: string;
  organization: string;
  jobTitle: string;
  docType: string;
  email: string;
  phoneArea: string;
  phone: string;
  contactMethod: string;
  contactValue: string;
}

interface ExistingPass {
  id: string;
  entryType: string;
  status: string;
  name: string;
  country: string;
  createdAt: string;
}

const initialForm: SpecialPassApplication = {
  entryType: "",
  country: "",
  name: "",
  birthDate: "",
  gender: "",
  docNumber: "",
  docValidFrom: "",
  docValidTo: "",
  docPhoto: "",
  docPhotoBack: "",
  photo: "",
  organization: "",
  jobTitle: "",
  docType: "",
  email: "",
  phoneArea: "+86",
  phone: "",
  contactMethod: "",
  contactValue: "",
};

export default function SpecialPassPage() {
  const t = useTranslations("specialPass");
  const locale = useLocale();
  const { data: session } = useSession();

  const [step, setStep] = useState<"list" | "choose" | "form">("list");
  const [form, setForm] = useState<SpecialPassApplication>(initialForm);
  const [passes, setPasses] = useState<ExistingPass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  const docPhotoRef = useRef<HTMLInputElement>(null);
  const docPhotoBackRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  // 当前境内证件是否需要背面
  const domesticNeedBack = form.entryType === "DOMESTIC" && DOMESTIC_NEED_BACK.has(form.docType);

  // 获取境内证件显示名称
  const getDomesticDocLabel = (docType: string) => {
    const found = DOC_TYPES_DOMESTIC.find((d) => d.value === docType);
    return found ? (locale === "zh" ? found.zh : found.en) : "";
  };

  const fetchPasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/special-pass?locale=${locale}`);
      const data = await res.json();
      if (data.success) {
        setPasses(data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  // 从用户资料获取信息自动填充
  const fetchProfile = useCallback(async () => {
    if (profileLoaded) return;
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (data.success && data.data) {
        const p = data.data;
        setForm((prev) => ({
          ...prev,
          name: prev.name || p.name || "",
          email: prev.email || p.email || "",
          phone: prev.phone || p.phone || "",
          organization: prev.organization || p.organization?.name || "",
          jobTitle: prev.jobTitle || p.title || "",
          country: prev.country || p.country || "",
        }));
        setProfileLoaded(true);
      }
    } catch {
      // ignore
    }
  }, [profileLoaded]);

  useEffect(() => {
    if (session?.user) fetchPasses();
    else setIsLoading(false);
  }, [session, fetchPasses]);

  // 进入表单时自动从用户资料填充
  useEffect(() => {
    if (step === "form" && session?.user) {
      fetchProfile();
    }
  }, [step, session, fetchProfile]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleFileUpload = (
    field: "docPhoto" | "docPhotoBack" | "photo",
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAlert({
        type: "error",
        message: locale === "zh" ? "文件大小不能超过5MB" : "File size must be less than 5MB",
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    // Domestic: only name + phone required
    if (form.entryType === "DOMESTIC") {
      if (!form.name || !form.phone) {
        setAlert({
          type: "error",
          message: locale === "zh" ? "请填写姓名和手机号码" : "Please enter your name and phone number",
        });
        return;
      }
    } else {
      // International: all fields required
      if (!form.entryType || !form.country || !form.name || !form.birthDate || !form.gender || !form.docNumber || !form.docValidFrom || !form.docValidTo) {
        setAlert({
          type: "error",
          message: locale === "zh" ? "请填写所有必填字段" : "Please fill in all required fields",
        });
        return;
      }
      if (!form.docType) {
        setAlert({
          type: "error",
          message: locale === "zh" ? "请选择证件类型" : "Please select document type",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/special-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Submit failed");
      }

      setAlert({
        type: "success",
        message: locale === "zh" ? "申请提交成功，请等待审核" : "Application submitted successfully. Please wait for review.",
      });
      setForm(initialForm);
      setProfileLoaded(false);
      setStep("list");
      await fetchPasses();
    } catch (err) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : (locale === "zh" ? "提交失败" : "Submit failed"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
            <Clock className="w-3 h-3 mr-1" />
            {t("status.pending")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t("status.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            {t("status.rejected")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const hasPending = passes.some((p) => p.status === "PENDING");

  if (isLoading) {
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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Alert variant={alert.type === "error" ? "destructive" : "default"}>
            {alert.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{alert.type === "success" ? t("alertSuccess") : t("alertError")}</AlertTitle>
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* ====== Step 1: Application List ====== */}
      {step === "list" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {passes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("myApplications")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {passes.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-4 border rounded-xl bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {p.entryType === "INTERNATIONAL" ? (
                          <Plane className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Building2 className="w-5 h-5 text-emerald-500" />
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{p.name}</p>
                          <p className="text-sm text-slate-500">
                            {p.entryType === "INTERNATIONAL" ? t("international") : t("domestic")}
                            {" · "}
                            {new Date(p.createdAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
            onClick={() => setStep("choose")}
            disabled={hasPending}
          >
            <Shield className="w-4 h-4 mr-2" />
            {t("applyNew")}
          </Button>
          {hasPending && (
            <p className="text-sm text-amber-600">{t("pendingWarning")}</p>
          )}
        </motion.div>
      )}

      {/* ====== Step 2: Choose entry type ====== */}
      {step === "choose" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Button variant="ghost" onClick={() => setStep("list")} className="mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t("back")}
          </Button>

          <h2 className="text-lg font-semibold text-slate-800">{t("chooseEntryType")}</h2>
          <p className="text-sm text-slate-500">{t("chooseEntryTypeDesc")}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className="cursor-pointer border-2 hover:border-emerald-400 transition-all"
              onClick={() => {
                setForm({ ...initialForm, entryType: "DOMESTIC" });
                setProfileLoaded(false);
                setStep("form");
              }}
            >
              <CardContent className="flex flex-col items-center gap-3 py-8">
                <Building2 className="w-10 h-10 text-emerald-600" />
                <h3 className="font-bold text-slate-900">{t("domesticEntry")}</h3>
                <p className="text-sm text-slate-500 text-center">{t("domesticEntryDesc")}</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer border-2 hover:border-blue-400 transition-all"
              onClick={() => {
                setForm({ ...initialForm, entryType: "INTERNATIONAL" });
                setProfileLoaded(false);
                setStep("form");
              }}
            >
              <CardContent className="flex flex-col items-center gap-3 py-8">
                <Plane className="w-10 h-10 text-blue-600" />
                <h3 className="font-bold text-slate-900">{t("internationalEntry")}</h3>
                <p className="text-sm text-slate-500 text-center">{t("internationalEntryDesc")}</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* ====== Step 3: Application form ====== */}
      {step === "form" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Button variant="ghost" onClick={() => setStep("choose")} className="mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t("back")}
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {form.entryType === "INTERNATIONAL" ? (
                  <Plane className="w-5 h-5 text-blue-600" />
                ) : (
                  <Building2 className="w-5 h-5 text-emerald-600" />
                )}
                {form.entryType === "INTERNATIONAL" ? t("internationalForm") : t("domesticForm")}
              </CardTitle>
              <CardDescription>
                {form.entryType === "INTERNATIONAL" ? t("internationalFormDesc") : t("domesticFormDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ========== DOMESTIC FORM ========== */}
              {form.entryType === "DOMESTIC" && (
                <>
                  {/* Row 1: Country + Doc Type */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        <Globe className="w-4 h-4 inline mr-1" />
                        {t("fields.country")}
                      </Label>
                      <Select
                        value={form.country}
                        onValueChange={(v) => {
                          setForm((prev) => ({ ...prev, country: v }));
                          setCountrySearch("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("fields.selectCountry")} />
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
                          {COUNTRIES.filter((c) => {
                            if (!countrySearch) return true;
                            const q = countrySearch.toLowerCase();
                            return c.zh.includes(q) || c.en.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
                          }).map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {locale === "zh" ? `${c.zh} [${c.en}]` : `${c.en} [${c.zh}]`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        {t("fields.docType")}
                      </Label>
                      <Select
                        value={form.docType}
                        onValueChange={(v) => setForm((prev) => ({ ...prev, docType: v, docPhoto: "", docPhotoBack: "" }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("fields.selectDocType")} />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_TYPES_DOMESTIC.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {locale === "zh" ? d.zh : d.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Photo uploads - dynamic based on doc type */}
                  <div className={`grid gap-4 ${domesticNeedBack ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                    <div className="space-y-2">
                      <Label>
                        {form.docType
                          ? (domesticNeedBack
                              ? `${getDomesticDocLabel(form.docType)}(${locale === "zh" ? "正面" : "Front"})`
                              : `${getDomesticDocLabel(form.docType)}(${locale === "zh" ? "正面人像页" : "Portrait Page"})`)
                          : t("fields.docPortraitPhoto")}
                      </Label>
                      <div
                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-400 transition-colors min-h-[160px]"
                        onClick={() => docPhotoRef.current?.click()}
                      >
                        {form.docPhoto ? (
                          <img src={form.docPhoto} alt="doc" className="max-h-36 rounded object-contain" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-slate-400" />
                            <p className="text-sm text-emerald-600">{t("fields.uploadDragDrop")}</p>
                            <p className="text-xs text-slate-400">{t("fields.uploadFormat")}</p>
                          </>
                        )}
                      </div>
                      <input
                        ref={docPhotoRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                        onChange={(e) => handleFileUpload("docPhoto", e)}
                      />
                    </div>

                    {domesticNeedBack && (
                      <div className="space-y-2">
                        <Label>
                          {`${getDomesticDocLabel(form.docType)}(${locale === "zh" ? "背面" : "Back"})`}
                        </Label>
                        <div
                          className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-400 transition-colors min-h-[160px]"
                          onClick={() => docPhotoBackRef.current?.click()}
                        >
                          {form.docPhotoBack ? (
                            <img src={form.docPhotoBack} alt="doc-back" className="max-h-36 rounded object-contain" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-slate-400" />
                              <p className="text-sm text-emerald-600">{t("fields.uploadDragDrop")}</p>
                              <p className="text-xs text-slate-400">{t("fields.uploadFormat")}</p>
                            </>
                          )}
                        </div>
                        <input
                          ref={docPhotoBackRef}
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          className="hidden"
                          onChange={(e) => handleFileUpload("docPhotoBack", e)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>{t("fields.recentPhoto")}</Label>
                      <div
                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-400 transition-colors min-h-[160px]"
                        onClick={() => photoRef.current?.click()}
                      >
                        {form.photo ? (
                          <img src={form.photo} alt="photo" className="max-h-36 rounded object-contain" />
                        ) : (
                          <>
                            <User className="w-8 h-8 text-slate-400" />
                            <p className="text-sm text-slate-400">{t("fields.recentPhotoDesc")}</p>
                          </>
                        )}
                      </div>
                      <input
                        ref={photoRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                        onChange={(e) => handleFileUpload("photo", e)}
                      />
                    </div>
                  </div>

                  {/* Name + Birth + Gender */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>
                        <User className="w-4 h-4 inline mr-1" />
                        <span className="text-red-500">*</span> {t("fields.name")}
                      </Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder={t("fields.namePlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {t("fields.birthDate")}
                      </Label>
                      <Input
                        type="date"
                        value={form.birthDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t("fields.gender")}</Label>
                      <RadioGroup
                        value={form.gender}
                        onValueChange={(v: string) => setForm((prev) => ({ ...prev, gender: v }))}
                        className="flex gap-4 pt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="M" id="gender-m" />
                          <Label htmlFor="gender-m">{t("fields.male")}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="F" id="gender-f" />
                          <Label htmlFor="gender-f">{t("fields.female")}</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Doc number + validity */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        {t("fields.idNumber")}
                      </Label>
                      <Input
                        value={form.docNumber}
                        onChange={(e) => setForm((prev) => ({ ...prev, docNumber: e.target.value }))}
                        placeholder={t("fields.idNumberPlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {t("fields.docValidity")}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={form.docValidFrom}
                          onChange={(e) => setForm((prev) => ({ ...prev, docValidFrom: e.target.value }))}
                        />
                        <span className="text-slate-400">{t("fields.to")}</span>
                        <Input
                          type="date"
                          value={form.docValidTo}
                          onChange={(e) => setForm((prev) => ({ ...prev, docValidTo: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone (required) + Email */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        <Phone className="w-4 h-4 inline mr-1" />
                        <span className="text-red-500">*</span> {t("fields.phone")}
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={form.phoneArea}
                          onValueChange={(v) => setForm((prev) => ({ ...prev, phoneArea: v }))}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PHONE_AREAS.map((a) => (
                              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={form.phone}
                          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder={t("fields.phonePlaceholder")}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        <Mail className="w-4 h-4 inline mr-1" />
                        {t("fields.email")}
                      </Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder={t("fields.emailPlaceholder")}
                      />
                    </div>
                  </div>

                  {/* Organization + Job */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        <Briefcase className="w-4 h-4 inline mr-1" />
                        {t("fields.organization")}
                      </Label>
                      <Input
                        value={form.organization}
                        onChange={(e) => setForm((prev) => ({ ...prev, organization: e.target.value }))}
                        placeholder={t("fields.organizationPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("fields.jobTitle")}</Label>
                      <Input
                        value={form.jobTitle}
                        onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
                        placeholder={t("fields.jobTitlePlaceholder")}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ========== INTERNATIONAL FORM ========== */}
              {form.entryType === "INTERNATIONAL" && (
                <>
                  {/* Row 1: Country + Doc Type */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        <Globe className="w-4 h-4 inline mr-1" />
                        <span className="text-red-500">*</span> {t("fields.country")}
                      </Label>
                      <Select
                        value={form.country}
                        onValueChange={(v) => {
                          setForm((prev) => ({ ...prev, country: v }));
                          setCountrySearch("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("fields.selectCountry")} />
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
                          {COUNTRIES.filter((c) => {
                            if (!countrySearch) return true;
                            const q = countrySearch.toLowerCase();
                            return c.zh.includes(q) || c.en.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
                          }).map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {locale === "zh" ? `${c.zh} [${c.en}]` : `${c.en} [${c.zh}]`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        <span className="text-red-500">*</span> {t("fields.docType")}
                      </Label>
                      <Select
                        value={form.docType}
                        onValueChange={(v) => setForm((prev) => ({ ...prev, docType: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("fields.selectDocType")} />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_TYPES_INTERNATIONAL.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {locale === "zh" ? d.zh : d.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Photo uploads */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        <span className="text-red-500">*</span> {t("fields.docPagePhoto")}
                      </Label>
                      <div
                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-400 transition-colors min-h-[160px]"
                        onClick={() => docPhotoRef.current?.click()}
                      >
                        {form.docPhoto ? (
                          <img src={form.docPhoto} alt="doc" className="max-h-36 rounded object-contain" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-slate-400" />
                            <p className="text-sm text-emerald-600">{t("fields.uploadDragDrop")}</p>
                            <p className="text-xs text-slate-400">{t("fields.uploadFormat")}</p>
                          </>
                        )}
                      </div>
                      <input
                        ref={docPhotoRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                        onChange={(e) => handleFileUpload("docPhoto", e)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        <span className="text-red-500">*</span> {t("fields.recentPhoto")}
                      </Label>
                      <div
                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-400 transition-colors min-h-[160px]"
                        onClick={() => photoRef.current?.click()}
                      >
                        {form.photo ? (
                          <img src={form.photo} alt="photo" className="max-h-36 rounded object-contain" />
                        ) : (
                          <>
                            <User className="w-8 h-8 text-slate-400" />
                            <p className="text-sm text-slate-400">{t("fields.recentPhotoDesc")}</p>
                          </>
                        )}
                      </div>
                      <input
                        ref={photoRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                        onChange={(e) => handleFileUpload("photo", e)}
                      />
                    </div>
                  </div>

                  {/* Name + Birth + Gender */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>
                        <User className="w-4 h-4 inline mr-1" />
                        <span className="text-red-500">*</span> {t("fields.name")}
                      </Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder={t("fields.namePlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        <span className="text-red-500">*</span> {t("fields.birthDate")}
                      </Label>
                      <Input
                        type="date"
                        value={form.birthDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label><span className="text-red-500">*</span> {t("fields.gender")}</Label>
                      <RadioGroup
                        value={form.gender}
                        onValueChange={(v: string) => setForm((prev) => ({ ...prev, gender: v }))}
                        className="flex gap-4 pt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="M" id="gender-m" />
                          <Label htmlFor="gender-m">{t("fields.male")}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="F" id="gender-f" />
                          <Label htmlFor="gender-f">{t("fields.female")}</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Doc number + validity */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        <span className="text-red-500">*</span> {t("fields.travelDocNumber")}
                      </Label>
                      <Input
                        value={form.docNumber}
                        onChange={(e) => setForm((prev) => ({ ...prev, docNumber: e.target.value }))}
                        placeholder={t("fields.travelDocNumberPlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        <span className="text-red-500">*</span> {t("fields.docValidity")}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={form.docValidFrom}
                          onChange={(e) => setForm((prev) => ({ ...prev, docValidFrom: e.target.value }))}
                        />
                        <span className="text-slate-400">{t("fields.to")}</span>
                        <Input
                          type="date"
                          value={form.docValidTo}
                          onChange={(e) => setForm((prev) => ({ ...prev, docValidTo: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email + Phone */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        <Mail className="w-4 h-4 inline mr-1" />
                        <span className="text-red-500">*</span> {t("fields.email")}
                      </Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder={t("fields.emailPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        <Phone className="w-4 h-4 inline mr-1" />
                        <span className="text-red-500">*</span> {t("fields.phone")}
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={form.phoneArea}
                          onValueChange={(v) => setForm((prev) => ({ ...prev, phoneArea: v }))}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PHONE_AREAS.map((a) => (
                              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={form.phone}
                          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder={t("fields.phonePlaceholder")}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Submit */}
              <div className="flex justify-end pt-4">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      {t("submit")}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
