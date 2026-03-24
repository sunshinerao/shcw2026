"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Mail, Phone, MapPin, Send, CheckCircle,
  Handshake, Mic2, Camera, Heart, ArrowRight, UserPlus, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/routing";

const INQUIRY_TYPES = [
  "general", "partnership", "speaker", "media", "sponsor", "volunteer", "other",
] as const;

type InquiryType = (typeof INQUIRY_TYPES)[number];

const PARTNERSHIP_TIERS = [
  "chief", "presenting", "ecosystem", "media", "forum", "knowledge", "community", "showcase",
] as const;

const MEDIA_TYPES = [
  "print", "broadcast", "podcast", "blog", "agency", "other",
] as const;

const QUICK_LINK_KEYS = ["partnership", "speaker", "media", "volunteer"] as const;
const QUICK_LINK_ICONS = { partnership: Handshake, speaker: Mic2, media: Camera, volunteer: Heart };

export default function ContactPage() {
  const t = useTranslations("contactPage");
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [inquiryType, setInquiryType] = useState<InquiryType>("general");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    // partnership fields
    organizationName: "",
    organizationType: "",
    partnershipTier: "",
    website: "",
    // speaker fields
    speakerTitle: "",
    speakerOrganization: "",
    topic: "",
    experience: "",
    // media fields
    outlet: "",
    mediaType: "",
    mediaRole: "",
    pressCard: "",
  });

  // Read inquiry type from URL params (e.g., ?type=partnership)
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam && INQUIRY_TYPES.includes(typeParam as InquiryType)) {
      setInquiryType(typeParam as InquiryType);
    }
  }, [searchParams]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const payload = { inquiryType, ...formData };
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSubmitted(true);
      } else {
        setSubmitError(data.error || "Something went wrong");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactItems = [
    {
      icon: Mail,
      title: t("info.email.title"),
      content: "info@shanghaiclimateweek.org.cn",
      description: t("info.email.description"),
    },
    {
      icon: Phone,
      title: t("info.phone.title"),
      content: "+86 21 1234 5678",
      description: t("info.phone.description"),
    },
    {
      icon: MapPin,
      title: t("info.address.title"),
      content: t("info.address.content"),
      description: t("info.address.description"),
    },
  ];

  const faqs = [
    { q: t("faq.items.registration.question"), a: t("faq.items.registration.answer") },
    { q: t("faq.items.fees.question"), a: t("faq.items.fees.answer") },
    { q: t("faq.items.partnership.question"), a: t("faq.items.partnership.answer") },
    { q: t("faq.items.speaker.question"), a: t("faq.items.speaker.answer") },
    { q: t("faq.items.interpretation.question"), a: t("faq.items.interpretation.answer") },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 -mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {contactItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-emerald-600 font-medium mb-1">{item.content}</p>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("quickLinks.title")}</h2>
            <p className="text-slate-600">{t("quickLinks.subtitle")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {QUICK_LINK_KEYS.map((key, index) => {
              const Icon = QUICK_LINK_ICONS[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card
                    className="h-full cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-emerald-200"
                    onClick={() => {
                      setInquiryType(key === "volunteer" ? "volunteer" : key as InquiryType);
                      document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="font-bold text-slate-900 mb-2">
                        {t(`quickLinks.links.${key}.title`)}
                      </h3>
                      <p className="text-sm text-slate-500 mb-4">
                        {t(`quickLinks.links.${key}.description`)}
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-emerald-600">
                        {t(`quickLinks.links.${key}.cta`)}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form + FAQ */}
      <section className="py-12" id="contact-form">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card>
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("form.title")}</h2>

                  {isSubmitted ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{t("form.successTitle")}</h3>
                      <p className="text-slate-600 mb-6">{t("form.successDescription")}</p>

                      {/* Register prompt — only shown if user is NOT logged in */}
                      {!session?.user && (
                        <div className="mt-6 p-5 bg-blue-50 rounded-lg border border-blue-100 text-left">
                          <h4 className="font-semibold text-slate-900 mb-2">{t("registerPrompt.title")}</h4>
                          <p className="text-sm text-slate-600 mb-4">{t("registerPrompt.description")}</p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="/auth/register">
                              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                                <UserPlus className="w-4 h-4 mr-2" />
                                {t("registerPrompt.register")}
                              </Button>
                            </Link>
                            <Link href="/auth/login">
                              <Button variant="outline" className="w-full">
                                <LogIn className="w-4 h-4 mr-2" />
                                {t("registerPrompt.login")}
                              </Button>
                            </Link>
                          </div>
                          <button
                            className="mt-3 text-sm text-slate-400 hover:text-slate-600 underline"
                            onClick={() => setIsSubmitted(false)}
                          >
                            {t("registerPrompt.skip")}
                          </button>
                        </div>
                      )}

                      {/* If logged in, show link to messages dashboard */}
                      {session?.user && (
                        <Link href="/dashboard/messages">
                          <Button variant="outline" className="mt-4">
                            {t("form.successTitle")} →
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Inquiry Type Selector */}
                      <div className="space-y-2">
                        <Label>{t("inquiryTypes.label")}</Label>
                        <Select value={inquiryType} onValueChange={(v) => setInquiryType(v as InquiryType)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("inquiryTypes.placeholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {INQUIRY_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {t(`inquiryTypes.types.${type}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Basic Fields */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">{t("form.fields.name.label")}</Label>
                          <Input
                            id="name"
                            placeholder={t("form.fields.name.placeholder")}
                            value={formData.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">{t("form.fields.email.label")}</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Partnership Sub-Form */}
                      {inquiryType === "partnership" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100"
                        >
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t("partnershipForm.organizationName")}</Label>
                              <Input
                                placeholder={t("partnershipForm.organizationNamePlaceholder")}
                                value={formData.organizationName}
                                onChange={(e) => updateField("organizationName", e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("partnershipForm.organizationType")}</Label>
                              <Input
                                placeholder={t("partnershipForm.organizationTypePlaceholder")}
                                value={formData.organizationType}
                                onChange={(e) => updateField("organizationType", e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t("partnershipForm.partnershipTier")}</Label>
                              <Select
                                value={formData.partnershipTier}
                                onValueChange={(v) => updateField("partnershipTier", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("partnershipForm.partnershipTierPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {PARTNERSHIP_TIERS.map((tier) => (
                                    <SelectItem key={tier} value={tier}>
                                      {t(`partnershipForm.tiers.${tier}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{t("partnershipForm.website")}</Label>
                              <Input
                                type="url"
                                placeholder={t("partnershipForm.websitePlaceholder")}
                                value={formData.website}
                                onChange={(e) => updateField("website", e.target.value)}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Speaker Sub-Form */}
                      {inquiryType === "speaker" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100"
                        >
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t("speakerForm.speakerTitle")}</Label>
                              <Input
                                placeholder={t("speakerForm.speakerTitlePlaceholder")}
                                value={formData.speakerTitle}
                                onChange={(e) => updateField("speakerTitle", e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("speakerForm.organization")}</Label>
                              <Input
                                placeholder={t("speakerForm.organizationPlaceholder")}
                                value={formData.speakerOrganization}
                                onChange={(e) => updateField("speakerOrganization", e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>{t("speakerForm.topic")}</Label>
                            <Input
                              placeholder={t("speakerForm.topicPlaceholder")}
                              value={formData.topic}
                              onChange={(e) => updateField("topic", e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("speakerForm.experience")}</Label>
                            <Textarea
                              placeholder={t("speakerForm.experiencePlaceholder")}
                              rows={3}
                              value={formData.experience}
                              onChange={(e) => updateField("experience", e.target.value)}
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Media Sub-Form */}
                      {inquiryType === "media" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-100"
                        >
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t("mediaForm.outlet")}</Label>
                              <Input
                                placeholder={t("mediaForm.outletPlaceholder")}
                                value={formData.outlet}
                                onChange={(e) => updateField("outlet", e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("mediaForm.mediaType")}</Label>
                              <Select
                                value={formData.mediaType}
                                onValueChange={(v) => updateField("mediaType", v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("mediaForm.mediaTypePlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {MEDIA_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {t(`mediaForm.mediaTypes.${type}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t("mediaForm.role")}</Label>
                              <Input
                                placeholder={t("mediaForm.rolePlaceholder")}
                                value={formData.mediaRole}
                                onChange={(e) => updateField("mediaRole", e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("mediaForm.pressCard")}</Label>
                              <Input
                                placeholder={t("mediaForm.pressCardPlaceholder")}
                                value={formData.pressCard}
                                onChange={(e) => updateField("pressCard", e.target.value)}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Subject & Message */}
                      <div className="space-y-2">
                        <Label htmlFor="subject">{t("form.fields.subject.label")}</Label>
                        <Input
                          id="subject"
                          placeholder={t("form.fields.subject.placeholder")}
                          value={formData.subject}
                          onChange={(e) => updateField("subject", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">{t("form.fields.message.label")}</Label>
                        <Textarea
                          id="message"
                          placeholder={t("form.fields.message.placeholder")}
                          rows={5}
                          value={formData.message}
                          onChange={(e) => updateField("message", e.target.value)}
                          required
                        />
                      </div>

                      {submitError && (
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{submitError}</p>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        disabled={isSubmitting}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isSubmitting ? t("form.submitting") : t("form.submit")}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* FAQ */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("faq.title")}</h2>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                      <p className="text-slate-600 text-sm">{faq.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
