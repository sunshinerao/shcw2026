"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Mail, MessageSquare, Smartphone, Bell, Info, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 通知设置类型定义
interface NotificationSettings {
  email: {
    eventReminder: boolean;
    registrationConfirm: boolean;
    eventChange: boolean;
    newsletter: boolean;
    marketing: boolean;
  };
  inApp: {
    systemAnnouncement: boolean;
    eventUpdate: boolean;
    securityAlert: boolean;
  };
  sms: {
    urgentEventChange: boolean;
    entryReminder: boolean;
  };
}

// 默认设置
const defaultSettings: NotificationSettings = {
  email: {
    eventReminder: true,
    registrationConfirm: true,
    eventChange: true,
    newsletter: false,
    marketing: false,
  },
  inApp: {
    systemAnnouncement: true,
    eventUpdate: true,
    securityAlert: true,
  },
  sms: {
    urgentEventChange: true,
    entryReminder: false,
  },
};

export default function NotificationsPage() {
  const t = useTranslations("dashboardNotificationsPage");
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 处理开关变化
  const handleToggle = (
    category: keyof NotificationSettings,
    key: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key as keyof typeof prev[typeof category]],
      },
    }));
    setHasChanges(true);
    // 隐藏成功提示当用户做出新的更改
    if (showSuccess) {
      setShowSuccess(false);
    }
  };

  // 保存设置
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // 实际API调用示例：
      // const response = await fetch('/api/notifications/settings', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings),
      // });
      // if (!response.ok) throw new Error('保存失败');
      
      setShowSuccess(true);
      setHasChanges(false);
      
      // 3秒后自动隐藏成功提示
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("保存设置失败:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const notificationOptions = {
    email: {
      title: t("groups.email.title"),
      description: t("groups.email.description"),
      icon: Mail,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      options: [
        { key: "eventReminder", label: t("groups.email.options.eventReminder.label"), description: t("groups.email.options.eventReminder.description") },
        { key: "registrationConfirm", label: t("groups.email.options.registrationConfirm.label"), description: t("groups.email.options.registrationConfirm.description") },
        { key: "eventChange", label: t("groups.email.options.eventChange.label"), description: t("groups.email.options.eventChange.description") },
        { key: "newsletter", label: t("groups.email.options.newsletter.label"), description: t("groups.email.options.newsletter.description") },
        { key: "marketing", label: t("groups.email.options.marketing.label"), description: t("groups.email.options.marketing.description") },
      ],
    },
    inApp: {
      title: t("groups.inApp.title"),
      description: t("groups.inApp.description"),
      icon: MessageSquare,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      options: [
        { key: "systemAnnouncement", label: t("groups.inApp.options.systemAnnouncement.label"), description: t("groups.inApp.options.systemAnnouncement.description") },
        { key: "eventUpdate", label: t("groups.inApp.options.eventUpdate.label"), description: t("groups.inApp.options.eventUpdate.description") },
        { key: "securityAlert", label: t("groups.inApp.options.securityAlert.label"), description: t("groups.inApp.options.securityAlert.description") },
      ],
    },
    sms: {
      title: t("groups.sms.title"),
      description: t("groups.sms.description"),
      icon: Smartphone,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      options: [
        { key: "urgentEventChange", label: t("groups.sms.options.urgentEventChange.label"), description: t("groups.sms.options.urgentEventChange.description") },
        { key: "entryReminder", label: t("groups.sms.options.entryReminder.label"), description: t("groups.sms.options.entryReminder.description") },
      ],
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-slate-600">{t("subtitle")}</p>
          </div>
        </div>
      </motion.div>

      {/* Success Alert */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertTitle>{t("success.title")}</AlertTitle>
              <AlertDescription>
                {t("success.description")}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Alert */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Alert variant="default" className="bg-slate-50 border-slate-200">
          <Info className="h-4 w-4 text-slate-600" />
          <AlertTitle className="text-slate-900">{t("tip.title")}</AlertTitle>
          <AlertDescription className="text-slate-600">
            {t("tip.description")}
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* Notification Categories */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Email Notifications */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${notificationOptions.email.bgColor} rounded-xl flex items-center justify-center`}>
                  <Mail className={`w-5 h-5 ${notificationOptions.email.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{notificationOptions.email.title}</CardTitle>
                  <CardDescription>{notificationOptions.email.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  {Object.values(settings.email).filter(Boolean).length}/{notificationOptions.email.options.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationOptions.email.options.map((option, index) => (
                <div key={option.key}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`email-${option.key}`} className="text-base font-medium">
                        {option.label}
                      </Label>
                      <p className="text-sm text-slate-500">{option.description}</p>
                    </div>
                    <Switch
                      id={`email-${option.key}`}
                      checked={settings.email[option.key as keyof typeof settings.email]}
                      onCheckedChange={() => handleToggle("email", option.key)}
                    />
                  </div>
                  {index < notificationOptions.email.options.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* In-App Notifications */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${notificationOptions.inApp.bgColor} rounded-xl flex items-center justify-center`}>
                  <MessageSquare className={`w-5 h-5 ${notificationOptions.inApp.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{notificationOptions.inApp.title}</CardTitle>
                  <CardDescription>{notificationOptions.inApp.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  {Object.values(settings.inApp).filter(Boolean).length}/{notificationOptions.inApp.options.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationOptions.inApp.options.map((option, index) => (
                <div key={option.key}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`inapp-${option.key}`} className="text-base font-medium">
                        {option.label}
                      </Label>
                      <p className="text-sm text-slate-500">{option.description}</p>
                    </div>
                    <Switch
                      id={`inapp-${option.key}`}
                      checked={settings.inApp[option.key as keyof typeof settings.inApp]}
                      onCheckedChange={() => handleToggle("inApp", option.key)}
                    />
                  </div>
                  {index < notificationOptions.inApp.options.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* SMS Notifications */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${notificationOptions.sms.bgColor} rounded-xl flex items-center justify-center`}>
                  <Smartphone className={`w-5 h-5 ${notificationOptions.sms.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{notificationOptions.sms.title}</CardTitle>
                  <CardDescription>{notificationOptions.sms.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                  {Object.values(settings.sms).filter(Boolean).length}/{notificationOptions.sms.options.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationOptions.sms.options.map((option, index) => (
                <div key={option.key}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`sms-${option.key}`} className="text-base font-medium">
                        {option.label}
                      </Label>
                      <p className="text-sm text-slate-500">{option.description}</p>
                    </div>
                    <Switch
                      id={`sms-${option.key}`}
                      checked={settings.sms[option.key as keyof typeof settings.sms]}
                      onCheckedChange={() => handleToggle("sms", option.key)}
                    />
                  </div>
                  {index < notificationOptions.sms.options.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex justify-end"
      >
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 min-w-[140px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("saving")}
            </>
          ) : (
            t("save")
          )}
        </Button>
      </motion.div>
    </div>
  );
}
