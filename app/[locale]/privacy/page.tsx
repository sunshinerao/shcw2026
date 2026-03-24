"use client";

import { motion } from "framer-motion";
import { Shield, Eye, Lock, FileText, Mail, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const sections = [
  {
    icon: Eye,
    title: "信息收集",
    content: [
      {
        subtitle: "我们收集的信息",
        text: "当您注册账户、报名活动或联系我们的客服时，我们可能会收集您的姓名、电子邮件地址、电话号码、公司名称、职位等基本信息。",
      },
      {
        subtitle: "自动收集的信息",
        text: "当您访问我们的网站时，我们可能会自动收集您的IP地址、浏览器类型、访问时间、浏览页面等技术信息。",
      },
    ],
  },
  {
    icon: Lock,
    title: "信息使用",
    content: [
      {
        subtitle: "提供服务",
        text: "我们使用您的信息来处理活动报名、发送确认邮件、提供客户支持以及改进我们的服务。",
      },
      {
        subtitle: "通信",
        text: "我们可能会向您发送有关活动更新、重要通知和营销信息（您可以随时选择退订）。",
      },
    ],
  },
  {
    icon: Shield,
    title: "信息保护",
    content: [
      {
        subtitle: "安全措施",
        text: "我们采用业界标准的安全措施保护您的个人信息，包括SSL加密、访问控制和定期安全审计。",
      },
      {
        subtitle: "数据保留",
        text: "我们仅在必要的时间内保留您的个人信息，以满足收集信息的目的或遵守法律要求。",
      },
    ],
  },
  {
    icon: FileText,
    title: "您的权利",
    content: [
      {
        subtitle: "访问和更正",
        text: "您有权访问、更正或删除您的个人信息。您可以通过账户设置或联系我们行使这些权利。",
      },
      {
        subtitle: "数据可携带性",
        text: "您有权以结构化、通用的格式获取您的个人数据，并在需要时将其传输给其他服务提供商。",
      },
    ],
  },
];

const lastUpdated = "2026年3月21日";

export default function PrivacyPage() {
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
                返回首页
              </Button>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              隐私政策
            </h1>
            <p className="text-slate-400">
              最后更新: {lastUpdated}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-slate-200">
              <CardContent className="p-8">
                <p className="text-slate-600 leading-relaxed text-lg">
                  上海气候周（&quot;我们&quot;、&quot;我们的&quot;或&quot;本平台&quot;）致力于保护您的隐私。本隐私政策说明我们如何收集、使用、存储和保护您的个人信息。使用我们的服务即表示您同意本隐私政策的条款。
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Sections */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                <Card className="border-slate-200">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <section.icon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
                    </div>
                    <div className="space-y-6">
                      {section.content.map((item) => (
                        <div key={item.subtitle}>
                          <h3 className="font-semibold text-slate-900 mb-2">{item.subtitle}</h3>
                          <p className="text-slate-600 leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8"
          >
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">联系我们</h2>
                </div>
                <p className="text-slate-600 leading-relaxed mb-4">
                  如果您对本隐私政策有任何疑问或担忧，或者需要行使您的隐私权利，请通过以下方式联系我们：
                </p>
                <ul className="text-slate-600 space-y-2">
                  <li>邮箱: privacy@shanghaiclimateweek.org</li>
                  <li>地址: 上海市浦东新区陆家嘴环路1000号</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Updates */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-slate-500">
              我们可能会不时更新本隐私政策。任何重大变更将通过网站公告或电子邮件通知您。
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
