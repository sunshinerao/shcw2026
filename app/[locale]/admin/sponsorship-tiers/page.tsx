import { redirect } from "next/navigation";

export default function LegacySponsorshipTiersPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  redirect(`/${locale}/admin/cooperation-plans`);
}
