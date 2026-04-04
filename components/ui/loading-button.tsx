import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type LoadingButtonProps = ButtonProps & {
  loading?: boolean;
  loadingText?: React.ReactNode;
};

export function LoadingButton({
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      data-loading={loading ? "true" : "false"}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {loading ? (loadingText ?? children) : children}
    </Button>
  );
}
