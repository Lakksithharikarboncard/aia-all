import { CustomerPortal } from "@/components/customer/CustomerPortal";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  return <CustomerPortal customerId={customerId} />;
}
