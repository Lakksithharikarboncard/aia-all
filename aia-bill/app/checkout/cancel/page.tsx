import Link from "next/link";
import { XCircle } from "lucide-react";

export const metadata = {
  title: "Checkout Cancelled — AI Accountant",
};

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const portalHref = customerId ? `/portal/${customerId}` : "/";

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-md border border-[#d0d7de] p-10 text-center shadow-[0_1px_3px_rgba(31,35,40,0.12),0_1px_0_rgba(31,35,40,0.04)]">
        <div className="w-16 h-16 bg-[#fff8c5] rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-[#9a6700]" />
        </div>
        <h1 className="text-xl font-bold text-[#1f2328] mb-3">Checkout Cancelled</h1>
        <p className="text-[#656d76] mb-8">
          No worries — your account is still here. You can complete payment whenever you&apos;re ready.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={portalHref}
            className="inline-flex items-center justify-center rounded-md bg-[#2da44e] text-white px-6 py-2.5 text-sm font-medium hover:bg-[#2c974b] transition-colors border border-[#1b7c37] shadow-[0_1px_0_rgba(31,35,40,0.04)]"
          >
            Back to My Portal
          </Link>
          <a
            href="mailto:cs@korefi.ai"
            className="inline-flex items-center justify-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] text-[#1f2328] px-6 py-2.5 text-sm font-medium hover:bg-[#ebedf0] transition-colors shadow-[0_1px_0_rgba(31,35,40,0.04)]"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
