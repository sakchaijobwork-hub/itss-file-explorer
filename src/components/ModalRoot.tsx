import { useUiStore } from "@/store/useUiStore";
import { BatchRenameDialog } from "@/components/dialogs/BatchRenameDialog";
import { DuplicateFinderDialog } from "@/components/dialogs/DuplicateFinderDialog";
import { StorageAnalyzerDialog } from "@/components/dialogs/StorageAnalyzerDialog";
import { PermissionsDialog } from "@/components/dialogs/PermissionsDialog";
import { PasswordDialog } from "@/components/dialogs/PasswordDialog";
import { RecentsDialog } from "@/components/dialogs/RecentsDialog";
import { RemoteDialog } from "@/components/dialogs/RemoteDialog";
import { ImageToolsDialog } from "@/components/dialogs/ImageToolsDialog";
import { SplitMergeDialog } from "@/components/dialogs/SplitMergeDialog";
import { ShareDialog } from "@/components/dialogs/ShareDialog";
import { NotesDialog } from "@/components/dialogs/NotesDialog";
import { AutomationDialog } from "@/components/dialogs/AutomationDialog";
import { PluginsDialog } from "@/components/dialogs/PluginsDialog";
import { CompareDialog } from "@/components/dialogs/CompareDialog";
import { ContentSearchDialog } from "@/components/dialogs/ContentSearchDialog";

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
    case "remote":
      return <RemoteDialog />;
    case "imageTools":
      return <ImageToolsDialog />;
    case "splitMerge":
      return <SplitMergeDialog />;
    case "share":
      return <ShareDialog />;
    case "notes":
      return <NotesDialog />;
    case "automation":
      return <AutomationDialog />;
    case "plugins":
      return <PluginsDialog />;
    case "compare":
      return <CompareDialog />;
    case "contentSearch":
      return <ContentSearchDialog />;
    default:
      return null;
  }
}
