"use client";

import { motion } from "framer-motion";
import { FileText, Scale, AlertCircle, Handshake, Ban, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const sections = [
  {
    icon: Handshake,
    title: "接受条款",
    content: `欢迎使用上海气候周网站。通过访问或使用本网站，您同意受这些使用条款的约束。如果您不同意这些条款，请不要使用本网站。我们保留随时修改这些条款的权利，修改后的条款将在发布时立即生效。`,
  },
  {
    icon: FileText,
    title: "使用许可",
    content: `我们授予您有限的、非独家的、不可转让的许可，以访问和使用本网站的内容仅供个人、非商业用途。您不得：

• 复制、修改、分发、出售或出租本网站的任何内容
• 使用本网站进行任何非法或未经授权的目的
• 干扰或破坏本网站的安全性或完整性
• 使用自动化手段（如机器人、爬虫）访问本网站`,
  },
  {
    icon: Scale,
    title: "知识产权",
    content: `本网站及其原创内容、功能和设计是上海气候周及其许可方的财产，受中国和国际版权、商标和其他知识产权法律的保护。未经授权使用本网站的任何内容可能违反版权法、商标法和其他适用法律。`,
  },
  {
    icon: AlertCircle,
    title: "用户内容",
    content: `如果您在本网站上提交、发布或传输任何内容（包括评论、反馈、建议），您授予我们非独家的、免版税的、永久的、不可撤销的权利来使用、修改、发布和分发该内容。您声明并保证您拥有或控制您提交内容的所有权利，并且该内容不违反任何第三方的权利或适用法律。`,
  },
  {
    icon: Ban,
    title: "禁止行为",
    content: `使用本网站时，您不得：

• 发布虚假、误导性、诽谤性、淫秽或非法内容
• 冒充他人或虚假陈述您与任何个人或组织的关联
• 收集或存储其他用户的个人信息
• 传播病毒、恶意软件或其他有害代码
• 进行任何可能损害、禁用或超载我们服务器或网络的活动`,
  },
];

const additionalTerms = [
  {
    title: "免责声明",
    content: `本网站按"原样"和"可用"基础提供，不作任何明示或暗示的保证。我们不保证本网站将始终可用、无错误或无病毒。对于因使用或无法使用本网站而导致的任何直接、间接、附带、特殊或后果性损害，我们不承担任何责任。`,
  },
  {
    title: "赔偿",
    content: `您同意赔偿并使上海气候周及其董事、员工、合作伙伴和代理人免受因您违反这些条款或您使用本网站而产生的任何索赔、损害、义务、损失、责任、成本或债务。`,
  },
  {
    title: "适用法律",
    content: `这些条款应受中华人民共和国法律管辖并按其解释，不考虑法律冲突原则。因这些条款或本网站引起的任何争议应提交上海市有管辖权的法院解决。`,
  },
  {
    title: "终止",
    content: `我们保留随时以任何理由终止或暂停您访问本网站的权利，恕不另行通知。这些条款中所有按其性质应在终止后继续有效的条款将继续有效。`,
  },
];

const lastUpdated = "2026年3月21日";

export default function TermsPage() {
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
              使用条款
            </h1>
            <p className="text-slate-400">
              最后更新: {lastUpdated}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Important Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-2">重要提示</h3>
                    <p className="text-amber-800 leading-relaxed">
                      请仔细阅读这些使用条款。访问或使用上海气候周网站即表示您同意受这些条款的约束。如果您不同意这些条款，请勿使用本网站。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Sections */}
          <div className="space-y-6">
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
                      <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
                    </div>
                    <div className="text-slate-600 leading-relaxed whitespace-pre-line">
                      {section.content}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Additional Terms */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-8"
          >
            <Card className="border-slate-200">
              <CardContent className="p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">其他条款</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {additionalTerms.map((term) => (
                    <div key={term.title}>
                      <h3 className="font-semibold text-slate-900 mb-2">{term.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{term.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-8 text-center"
          >
            <p className="text-slate-600 mb-4">
              如果您对这些使用条款有任何疑问，请联系我们：
            </p>
            <a 
              href="mailto:legal@shanghaiclimateweek.org" 
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              legal@shanghaiclimateweek.org
            </a>
          </motion.div>

          {/* Footer Note */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="mt-12 pt-8 border-t border-slate-200 text-center"
          >
            <p className="text-sm text-slate-500">
              这些条款最后更新于 {lastUpdated}。我们保留随时修改这些条款的权利。
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
