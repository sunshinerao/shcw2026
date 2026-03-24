"use client";

import Image from "next/image";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import { Loader2, Lock, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

// 密码验证规则
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

interface ValidationError {
  password?: string;
  confirmPassword?: string;
}

function ResetPasswordForm() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth.resetPassword");
  const common = useTranslations("common");
  const layout = useTranslations("adminLayout");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError>({});
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });

  // 验证 token
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError(t("errors.invalidLink"));
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/reset-password?token=${encodeURIComponent(token)}`);
        
        if (response.ok) {
          setIsTokenValid(true);
        } else {
          const data = await response.json();
          if (response.status === 410) {
            setError(t("errors.expiredLink"));
          } else if (response.status === 404) {
            setError(t("errors.invalidLink"));
          } else {
            setError(data.error || data.message || t("errors.validationFailed"));
          }
        }
      } catch {
        setError(t("errors.network"));
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [t, token]);

  // 验证密码
  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return t("errors.passwordRequired");
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      return t("errors.passwordTooShort", { min: PASSWORD_MIN_LENGTH });
    }
    if (!PASSWORD_REGEX.test(password)) {
      return t("errors.passwordWeak");
    }
    return undefined;
  };

  // 验证确认密码
  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword) {
      return t("errors.confirmPasswordRequired");
    }
    if (confirmPassword !== password) {
      return t("errors.passwordMismatch");
    }
    return undefined;
  };

  // 验证所有字段
  const validateForm = (): boolean => {
    const errors: ValidationError = {};
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;
    
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, password: value }));
    
    if (touched.password) {
      const error = validatePassword(value);
      setValidationErrors(prev => ({ ...prev, password: error }));
    }
    
    // 如果确认密码已填写，也需要重新验证
    if (touched.confirmPassword && formData.confirmPassword) {
      const confirmError = validateConfirmPassword(formData.confirmPassword, value);
      setValidationErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, confirmPassword: value }));
    
    if (touched.confirmPassword) {
      const error = validateConfirmPassword(value, formData.password);
      setValidationErrors(prev => ({ ...prev, confirmPassword: error }));
    }
  };

  const handleBlur = (field: "password" | "confirmPassword") => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (field === "password") {
      const error = validatePassword(formData.password);
      setValidationErrors(prev => ({ ...prev, password: error }));
    } else {
      const error = validateConfirmPassword(formData.confirmPassword, formData.password);
      setValidationErrors(prev => ({ ...prev, confirmPassword: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 标记所有字段为已触碰
    setTouched({ password: true, confirmPassword: true });

    if (!validateForm()) {
      return;
    }

    if (!token) {
      setError(t("errors.invalidLinkShort"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          setError(t("errors.expiredLink"));
        } else if (response.status === 404) {
          setError(t("errors.invalidLink"));
        } else {
          setError(data.error || data.message || t("errors.failed"));
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t("errors.network"));
    } finally {
      setIsLoading(false);
    }
  };

  // 验证中状态
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <Card className="shadow-xl border-slate-100">
            <CardContent className="py-12">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">{t("validating")}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Token 无效状态
  if (!isTokenValid) {
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
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {t("invalidTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <Alert variant="destructive" className="mb-6 text-left">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => router.push(`/${locale}/auth/forgot-password`)}
              >
                {t("requestAgain")}
              </Button>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Link
              href="/auth/login"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {common("backToLogin")}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // 成功状态
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
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
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1 
                }}
                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </motion.div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {t("successTitle")}
              </CardTitle>
              <CardDescription className="text-slate-500 mt-2">
                {t("successSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => router.push("/auth/login")}
              >
                {t("goToLogin")}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // 重置密码表单
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
              {t("pageTitle")}
            </CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              {t("pageSubtitle")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">{t("passwordLabel")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("passwordPlaceholder")}
                    value={formData.password}
                    onChange={handlePasswordChange}
                    onBlur={() => handleBlur("password")}
                    className={`pl-10 pr-10 ${validationErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {validationErrors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm text-red-500 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("confirmPasswordPlaceholder")}
                    value={formData.confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    onBlur={() => handleBlur("confirmPassword")}
                    className={`pl-10 pr-10 ${validationErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {validationErrors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm text-red-500 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors.confirmPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <Separator />

              <div className="space-y-2 text-sm text-slate-500">
                <p>{t("requirementsTitle")}</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li className={formData.password.length >= PASSWORD_MIN_LENGTH ? "text-emerald-600" : ""}>
                    {t("requirements.minLength", { min: PASSWORD_MIN_LENGTH })}
                  </li>
                  <li className={/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? "text-emerald-600" : ""}>
                    {t("requirements.upperAndLower")}
                  </li>
                  <li className={/\d/.test(formData.password) ? "text-emerald-600" : ""}>
                    {t("requirements.number")}
                  </li>
                </ul>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
          <div className="max-w-md w-full">
            <Card className="shadow-xl p-8 animate-pulse">
              <div className="h-8 bg-slate-200 rounded mb-4" />
              <div className="h-4 bg-slate-200 rounded mb-8" />
              <div className="space-y-4">
                <div className="h-12 bg-slate-200 rounded" />
                <div className="h-12 bg-slate-200 rounded" />
                <div className="h-12 bg-slate-200 rounded" />
              </div>
            </Card>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
