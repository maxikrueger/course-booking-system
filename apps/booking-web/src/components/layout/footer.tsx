import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>{t("footer.copyright", { year })}</p>
        <div className="flex gap-4">
          <span>{t("footer.imprint")}</span>
          <span>{t("footer.privacy")}</span>
        </div>
      </div>
    </footer>
  );
}
