import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Payment Complete — AI Accountant",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>;
}) {
  const { checkout_id } = await searchParams;

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-md border border-[#d0d7de] p-10 text-center shadow-[0_1px_3px_rgba(31,35,40,0.12),0_1px_0_rgba(31,35,40,0.04)]">
        <div className="w-16 h-16 bg-[#dafbe1] rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-[#1a7f37]" />
        </div>
        <h1 className="text-xl font-bold text-[#1f2328] mb-3">Payment Complete!</h1>
        <p className="text-[#656d76] mb-6">
          Your account is being activated. You&apos;ll have full access to your modules shortly.
        </p>
        {checkout_id && (
          <p className="text-xs text-[#8b949e] mb-6 break-all">
          </p>
        )}
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-[#2da44e] text-white px-6 py-2.5 text-sm font-medium hover:bg-[#2c974b] transition-colors border border-[#1b7c37] shadow-[0_1px_0_rgba(31,35,40,0.04)]"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
