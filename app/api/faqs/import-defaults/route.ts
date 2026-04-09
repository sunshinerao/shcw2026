import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { defaultFaqItems } from "@/lib/default-faq-items";
import { prisma } from "@/lib/prisma";
import { canManageFaq } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, staffPermissions: true },
    });

    if (!canManageFaq(user?.role, user?.staffPermissions)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    let created = 0;
    let skipped = 0;

    for (const item of defaultFaqItems) {
      const existing = await prisma.faqItem.findFirst({
        where: {
          category: item.category,
          question: item.question,
        },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.faqItem.create({ data: item });
      created += 1;
    }

    return NextResponse.json({
      success: true,
      data: { created, skipped, total: defaultFaqItems.length },
      message: `Imported ${created} FAQ items`,
    });
  } catch (error) {
    console.error("[faqs/import-defaults POST]", error);
    return NextResponse.json({ success: false, error: "Failed to import default FAQs" }, { status: 500 });
  }
}