"use client";

import { useTranslations } from "next-intl";
import ResponsiveSheet from "./ResponsiveSheet";

/** Confirmation for destructive actions (reset, hand in, add all, restart). Cancel is focused first. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Ui");
  return (
    <ResponsiveSheet
      open={open}
      onClose={onCancel}
      title={title}
      variant="dialog"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus onClick={onCancel} className="btn btn-secondary">
            {cancelLabel ?? t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={"btn " + (tone === "danger" ? "bg-danger text-on-primary shadow-soft" : "btn-primary")}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-text-muted">{message}</p>
    </ResponsiveSheet>
  );
}
