import { ModuleHeading, ModuleShell } from "@/components/module-shell";
import { ScannerSetup } from "./scanner-setup";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function ScannerPage() {
  const { organization, membership, email } = await getWorkspaceContext();
  return <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
    <ModuleHeading eyebrow="Warehouse tools" title="Barcode scanner setup" description="Connect and test USB or Bluetooth scanners without installing warehouse-specific software." />
    <ScannerSetup />
  </ModuleShell>;
}
