import { ThemeMinimal } from "@supabase/auth-ui-shared";

export function getAuthTheme(isDark: boolean) {
  return {
    default: {
      colors: {
        brand: isDark ? "#fafafa" : "#09090b",
        brandAccent: isDark ? "#27272a" : "#f4f4f5",
        brandButtonText: isDark ? "#09090b" : "#fafafa",
        defaultButtonBackground: isDark ? "#27272a" : "#f4f4f5",
        defaultButtonBackgroundHover: isDark ? "#3f3f46" : "#e4e4e7",
        defaultButtonBorder: isDark ? "#3f3f46" : "#e4e4e7",
        defaultButtonText: isDark ? "#fafafa" : "#09090b",
        controlBorder: isDark ? "#3f3f46" : "#e4e4e7",
        boxBackground: isDark ? "#18181b" : "#ffffff",
        inputBackground: isDark ? "#27272a" : "#f4f4f5",
        inputBorder: isDark ? "#3f3f46" : "#e4e4e7",
        inputBorderHover: isDark ? "#52525b" : "#d4d4d8",
        inputBorderFocus: isDark ? "#71717a" : "#a1a1a6",
        inputText: isDark ? "#fafafa" : "#09090b",
        inputPlaceholder: isDark ? "#a1a1a6" : "#71717a",
        inputLabelText: isDark ? "#fafafa" : "#09090b",
        linkButtonText: isDark ? "#fafafa" : "#09090b",
        dividerBackground: isDark ? "#27272a" : "#e4e4e7",
        messageText: isDark ? "#fafafa" : "#09090b",
        messageBackground: isDark ? "#27272a" : "#f4f4f5",
        messageBorder: isDark ? "#3f3f46" : "#e4e4e7",
        messageTextDanger: "#f87171",
        anchorTextColor: isDark ? "#fafafa" : "#09090b",
        anchorTextHoverColor: isDark ? "#d4d4d8" : "#52525b",
      },
      space: {
        buttonPadding: "10px 15px",
        buttonBorderRadius: "6px",
        buttonFontSize: "14px",
        buttonFontWeight: "500",
        containerPadding: "20px",
        containerBorderRadius: "8px",
        inputPadding: "10px 12px",
        inputBorderRadius: "6px",
        inputFontSize: "14px",
        labelBottomMargin: "8px",
        anchorBottomMargin: "8px",
        dividerMargin: "16px 0",
      },
      fonts: {
        bodyFontFamily: `var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
        buttonFontFamily: `var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
        inputFontFamily: `var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
        labelFontFamily: `var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
      },
    },
  };
}
