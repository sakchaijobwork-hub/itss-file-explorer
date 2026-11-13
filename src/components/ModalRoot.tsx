import { useUiStore } from "@/store/useUiStore";
import { BatchRenameDialog } from "@/components/dialogs/BatchRenameDialog";
import { DuplicateFinderDialog } from "@/components/dialogs/DuplicateFinderDialog";
import { StorageAnalyzerDialog } from "@/components/dialogs/StorageAnalyzerDialog";
import { PermissionsDialog } from "@/components/dialogs/PermissionsDialog";
import { PasswordDialog } from "@/components/dialogs/PasswordDialog";
import { RecentsDialog } from "@/components/dialogs/RecentsDialog";

export function ModalRoot() {
  const modal = useUiStore((s) => s.modal);

  switch (modal) {
    case "batchRename":
      return <BatchRenameDialog />;
    case "duplicates":
      return <DuplicateFinderDialog />;
    case "storage":
      return <StorageAnalyzerDialog />;
    case "permissions":
      return <PermissionsDialog />;
    case "encrypt":
      return <PasswordDialog mode="encrypt" />;
    case "decrypt":
      return <PasswordDialog mode="decrypt" />;
    case "recents":
      return <RecentsDialog />;
    default:
      return null;
  }
}
