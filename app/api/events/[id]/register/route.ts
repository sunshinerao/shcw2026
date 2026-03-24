import { NextRequest, NextResponse } from "next/server";
import { RegistrationStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiMessage, resolveRequestLocale } from "@/lib/api-i18n";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let requestLocale = resolveRequestLocale(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "unauthorized") },
        { status: 401 }
      );
    }

    const body = await req.json();
    requestLocale = resolveRequestLocale(req, body.locale);

    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        isPublished: true,
      },
      select: {
        id: true,
        maxAttendees: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventNotFound") },
        { status: 404 }
      );
    }

    const existingRegistration = await prisma.registration.findUnique({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId: params.id,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingRegistration && existingRegistration.status !== RegistrationStatus.CANCELLED) {
      return NextResponse.json(
        { success: false, error: apiMessage(requestLocale, "eventAlreadyRegistered") },
        { status: 409 }
      );
    }

    if (event.maxAttendees) {
      const registration = await prisma.$transaction(async (tx) => {
        const activeRegistrationCount = await tx.registration.count({
          where: {
            eventId: params.id,
            status: {
              in: [RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED, RegistrationStatus.WAITLIST],
            },
          },
        });

        if (activeRegistrationCount >= event.maxAttendees!) {
          return null;
        }

        return existingRegistration
          ? await tx.registration.update({
              where: { id: existingRegistration.id },
              data: {
                status: RegistrationStatus.REGISTERED,
                notes: body.notes || null,
                dietaryReq: body.dietaryReq || null,
                checkedInAt: null,
                checkedInBy: null,
                checkInMethod: null,
              },
              include: {
                event: {
                  select: {
                    id: true,
                    title: true,
                    titleEn: true,
                    date: true,
                    startTime: true,
                    endTime: true,
                    venue: true,
                    type: true,
                  },
                },
              },
            })
          : await tx.registration.create({
              data: {
                userId: session.user.id,
                eventId: params.id,
                status: RegistrationStatus.REGISTERED,
                notes: body.notes || null,
                dietaryReq: body.dietaryReq || null,
              },
              include: {
                event: {
                  select: {
                    id: true,
                    title: true,
                    titleEn: true,
                    date: true,
                    startTime: true,
                    endTime: true,
                    venue: true,
                    type: true,
                  },
                },
              },
            });
      });

      if (!registration) {
        return NextResponse.json(
          { success: false, error: apiMessage(requestLocale, "eventCapacityReached") },
          { status: 409 }
        );
      }

      await prisma.wishlist.deleteMany({
        where: {
          userId: session.user.id,
          eventId: params.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: apiMessage(requestLocale, "eventRegisterSuccess"),
        data: registration,
      });
    } else {
      const registration = existingRegistration
        ? await prisma.registration.update({
            where: { id: existingRegistration.id },
            data: {
              status: RegistrationStatus.REGISTERED,
              notes: body.notes || null,
              dietaryReq: body.dietaryReq || null,
              checkedInAt: null,
              checkedInBy: null,
              checkInMethod: null,
            },
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  titleEn: true,
                  date: true,
                  startTime: true,
                  endTime: true,
                  venue: true,
                  type: true,
                },
              },
            },
          })
        : await prisma.registration.create({
            data: {
              userId: session.user.id,
              eventId: params.id,
              status: RegistrationStatus.REGISTERED,
              notes: body.notes || null,
              dietaryReq: body.dietaryReq || null,
            },
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  titleEn: true,
                  date: true,
                  startTime: true,
                  endTime: true,
                  venue: true,
                  type: true,
                },
              },
            },
          });

      await prisma.wishlist.deleteMany({
        where: {
          userId: session.user.id,
          eventId: params.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: apiMessage(requestLocale, "eventRegisterSuccess"),
        data: registration,
      });
    }
  } catch (error) {
    console.error("Event registration error:", error);
    return NextResponse.json(
      { success: false, error: apiMessage(requestLocale, "eventRegisterFailed") },
      { status: 500 }
    );
  }
}