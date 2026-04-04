"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Download, HelpCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "@/i18n/routing";

type FaqItem = {
  id: string;
  category: string;
  categoryEn?: string | null;
  question: string;
  questionEn?: string | null;
  summary?: string | null;
  summaryEn?: string | null;
  answer: string;
  answerEn?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isPinned: boolean;
};

export default function FAQPage() {
  const t = useTranslations("faqPage");
  const locale = useLocale();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faqs?publishedOnly=true", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setItems(data.data as FaqItem[]);
        } else {
          setItems([]);
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const groupedItems = items.reduce<Record<string, { title: string; items: FaqItem[] }>>((accumulator, item) => {
    const key = locale === "en" ? item.categoryEn || item.category : item.category;
    if (!accumulator[key]) {
      accumulator[key] = { title: key, items: [] };
    }
    accumulator[key].items.push(item);
    return accumulator;
  }, {});

  const sections = Object.values(groupedItems);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative bg-slate-900 py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 via-slate-900 to-slate-900" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/">
              <Button variant="ghost" className="text-slate-400 hover:text-white mb-6 -ml-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToHome")}
              </Button>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t("title")}
            </h1>
            <p className="text-slate-400 text-lg">
              {t("subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-12 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
              {t("loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <h2 className="text-xl font-semibold text-slate-900">{t("emptyTitle")}</h2>
              <p className="mt-3 text-slate-600">{t("emptyDescription")}</p>
            </div>
          ) : (
            <div>
              {sections.map((section, categoryIndex) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                  className="mb-12"
                >
                  <h2 className="mb-6 flex items-center text-xl font-bold text-slate-900">
                    <HelpCircle className="mr-2 h-5 w-5 text-emerald-600" />
                    {section.title}
                  </h2>
                  <Card>
                    <CardContent className="p-6">
                      <Accordion type="single" collapsible className="w-full">
                        {section.items.map((item) => {
                          const localizedQuestion = locale === "en" ? item.questionEn || item.question : item.question;
                          const localizedSummary = locale === "en"
                            ? item.summaryEn || item.summary || item.answerEn || item.answer
                            : item.summary || item.answer;
                          const localizedAnswer = locale === "en" ? item.answerEn || item.answer : item.answer;

                          return (
                            <AccordionItem key={item.id} value={item.id}>
                              <AccordionTrigger className="text-left font-medium text-slate-900 hover:text-emerald-600">
                                <div className="pr-4">
                                  <div>{localizedQuestion}</div>
                                  {localizedSummary ? <p className="mt-1 text-sm font-normal text-slate-500">{localizedSummary}</p> : null}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="space-y-4 text-slate-600 leading-relaxed">
                                <div>{localizedAnswer}</div>
                                {item.attachmentUrl ? (
                                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                                    <p className="mb-2 text-sm font-medium text-slate-900">{t("attachment")}</p>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <p className="text-sm text-slate-600">{item.attachmentName || t("downloadAttachment")}</p>
                                      <a href={item.attachmentUrl} download={item.attachmentName || "faq-attachment"} className="inline-flex">
                                        <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                          <Download className="mr-2 h-4 w-4" />
                                          {t("downloadAttachment")}
                                        </Button>
                                      </a>
                                    </div>
                                  </div>
                                ) : null}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {t("contact.title")}
                </h3>
                <p className="text-slate-600 mb-6">
                  {t("contact.description")}
                </p>
                <Link href="/contact">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    {t("contact.button")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
