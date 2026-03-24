"use client";

import Image from "next/image";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import { Loader2, Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

// 邮箱格式验证正则表达式
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations("auth.forgotPassword");
  const common = useTranslations("common");
  const layout = useTranslations("adminLayout");
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // 验证邮箱格式
  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(t("errors.required"));
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError(t("errors.invalidEmail"));
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证邮箱
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError(t("errors.emailNotFound"));
        } else {
          setError(data.error || data.message || t("errors.failed"));
        }
      } else {
        setStep(2);
      }
    } catch {
      setError(t("errors.network"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt={layout("logoAlt")}
              width={220}
              height={64}
              priority
              sizes="220px"
              className="h-16 w-auto object-contain mx-auto"
            />
          </Link>
        </div>

        <Card className="shadow-xl border-slate-100">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.span
                    key="step1-title"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {t("pageTitle")}
                  </motion.span>
                ) : (
                  <motion.span
                    key="step2-title"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {t("sentTitle")}
                  </motion.span>
                )}
              </AnimatePresence>
            </CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.span
                    key="step1-desc"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {t("pageSubtitle")}
                  </motion.span>
                ) : (
                  <motion.span
                    key="step2-desc"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {t("sentSubtitle")}
                  </motion.span>
                )}
              </AnimatePresence>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("emailLabel")}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("emailPlaceholder")}
                          value={email}
                          onChange={handleEmailChange}
                          onBlur={() => validateEmail(email)}
                          className={`pl-10 ${emailError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      {emailError && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-red-500 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {emailError}
                        </motion.p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t("submitting")}
                        </>
                      ) : (
                        t("submit")
                      )}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.1 
                    }}
                    className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </motion.div>

                  <div className="space-y-4">
                    <p className="text-slate-600">
                      {t.rich("sentDescription", {
                        email,
                        strong: (chunks) => <span className="font-semibold text-slate-900">{chunks}</span>,
                      })}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t("resendHint")}
                    </p>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setStep(1);
                        setEmail("");
                        setError("");
                      }}
                    >
                      {t("useAnotherEmail")}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Back to login */}
        <motion.div 
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Link
            href="/auth/login"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {common("backToLogin")}
          </Link>
        </motion.div>

        {/* Back to home */}
        <div className="text-center mt-4">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            {common("backHome")}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
