import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminError, requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const admin = await requireAdmin();
  if (isAdminError(admin)) return admin;

  try {
    const [
      users,
      posts,
      sites,
      packs,
      published,
      usersByPlanRaw,
      paymentsPending,
      paymentsConfirmed,
      revenueResult,
      activeSubscriptions,
      recentUsers,
      recentPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.site.count(),
      prisma.campaignPack.count(),
      prisma.post.count({ where: { publishStatus: "published" } }),
      prisma.user.groupBy({
        by: ["plan"],
        _count: { _all: true },
      }),
      prisma.payment.count({ where: { status: "pending" } }),
      prisma.payment.count({ where: { status: "confirmed" } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "confirmed", currency: "USDC" },
      }),
      prisma.user.count({ where: { OR: [{ plan: "pro" }, { plan: "enterprise" }] } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
          subscriptionStatus: true,
          createdAt: true,
          _count: { select: { posts: true, sites: true } },
        },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    // Convert groupBy to nice object
    const usersByPlan: Record<string, number> = { free: 0, pro: 0, enterprise: 0 };
    usersByPlanRaw.forEach((g) => {
      if (g.plan in usersByPlan) usersByPlan[g.plan] = g._count._all;
    });

    const totalRevenue = revenueResult._sum.amount ? Number(revenueResult._sum.amount) : 0;

    return NextResponse.json({
      totals: { users, posts, sites, packs, published },
      snapshot: {
        usersByPlan,
        payments: {
          pending: paymentsPending,
          confirmed: paymentsConfirmed,
          totalRevenueUSDC: totalRevenue,
        },
        activeSubscriptions,
      },
      recentUsers: recentUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        plan: p.plan,
        amount: p.amount.toString(),
        currency: p.currency,
        network: p.network,
        status: p.status,
        txHash: p.txHash,
        reference: p.reference,
        createdAt: p.createdAt.toISOString(),
        user: p.user,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}