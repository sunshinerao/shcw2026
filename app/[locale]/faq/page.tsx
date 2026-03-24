"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { HelpCircle, ChevronDown, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQPage() {
  const t = useTranslations("faqPage");

  const faqCategories = [
    {
      category: t("categories.registration"),
      items: [
        {
          question: t("items.q1.question"),
          answer: t("items.q1.answer"),
        },
        {
          question: t("items.q2.question"),
          answer: t("items.q2.answer"),
        },
        {
          question: t("items.q3.question"),
          answer: t("items.q3.answer"),
        },
      ],
    },
    {
      category: t("categories.events"),
      items: [
        {
          question: t("items.q4.question"),
          answer: t("items.q4.answer"),
        },
        {
          question: t("items.q5.question"),
          answer: t("items.q5.answer"),
        },
        {
          question: t("items.q6.question"),
          answer: t("items.q6.answer"),
        },
      ],
    },
    {
      category: t("categories.venue"),
      items: [
        {
          question: t("items.q7.question"),
          answer: t("items.q7.answer"),
        },
        {
          question: t("items.q8.question"),
          answer: t("items.q8.answer"),
        },
      ],
    },
  ];

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
          {faqCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
              className="mb-12"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2 text-emerald-600" />
                {category.category}
              </h2>
              <Card>
                <CardContent className="p-6">
                  <Accordion type="single" collapsible className="w-full">
                    {category.items.map((item, itemIndex) => (
                      <AccordionItem key={itemIndex} value={`item-${categoryIndex}-${itemIndex}`}>
                        <AccordionTrigger className="text-left font-medium text-slate-900 hover:text-emerald-600">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-600 leading-relaxed">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>
          ))}

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
