import React, { useState, useEffect } from "react";
import { Upload, Trash2, File, Image, FileText } from "lucide-react";
import { Card } from "../../components/ui/Card";
import {
  AttachmentItem,
  ClientItem,
  AddAttachmentInput,
} from "../../types/entities";
import { tauriService } from "../../services/tauri";

export const FilesView: React.FC = () => {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const entityType = "clients";
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    try {
      const clientList = await tauriService.getClients();
      setClients(clientList);
      if (clientList.length > 0 && !selectedEntityId) {
        setSelectedEntityId(clientList[0].id);
        const atts = await tauriService.getAttachments(
          "clients",
          clientList[0].id,
        );
        setAttachments(atts);
      }
    } catch (err) {
      console.error("Failed to load files data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEntityChange = async (eid: string) => {
    setSelectedEntityId(eid);
    if (!eid) return;
    try {
      const atts = await tauriService.getAttachments(entityType, eid);
      setAttachments(atts);
    } catch (err) {
      console.error("Failed to fetch attachments:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEntityId) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const input: AddAttachmentInput = {
          entity_type: entityType,
          entity_id: selectedEntityId,
          file_name: file.name,
          file_base64: base64,
          mime_type: file.type || undefined,
        };

        const newAtt = await tauriService.addAttachment(input);
        setAttachments([newAtt, ...attachments]);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (window.confirm("Remove this attachment?")) {
      try {
        await tauriService.deleteAttachment(id);
        setAttachments(attachments.filter((a) => a.id !== id));
      } catch (err) {
        console.error("Delete attachment failed:", err);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
            Files & Attachments
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Safely store reference artwork, briefs, and deliverables in your
            local application directory.
          </p>
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading || !selectedEntityId}
          />
          <span className="inline-flex items-center justify-center font-medium transition-colors rounded-md px-3.5 py-1.5 text-sm gap-2 bg-[#854D0E] text-white hover:bg-[#713F12]">
            <Upload size={14} />
            <span>{isUploading ? "Saving..." : "Upload File"}</span>
          </span>
        </label>
      </div>

      {/* Target selector */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-white border border-[#E5E0D5]">
        <span className="text-xs font-semibold text-[#57534E] uppercase tracking-wider">
          Client Folder:
        </span>
        <select
          value={selectedEntityId}
          onChange={(e) => handleEntityChange(e.target.value)}
          className="rounded-md border border-[#E5E0D5] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.company_name ? `(${c.company_name})` : ""}
            </option>
          ))}
        </select>
        <span className="text-xs text-[#8C867A] ml-auto">
          Files are organized into isolated local folders.
        </span>
      </div>

      {/* Attachment list */}
      {attachments.length > 0 ? (
        <Card noPadding>
          <div className="divide-y divide-[#ECE8DE]">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="p-4 flex items-center justify-between hover:bg-[#FAF8F5] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#F4F1EA] text-[#854D0E]">
                    {att.mime_type?.startsWith("image/") ? (
                      <Image size={18} />
                    ) : att.mime_type?.includes("pdf") ? (
                      <FileText size={18} />
                    ) : (
                      <File size={18} />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1C1917]">
                      {att.file_name}
                    </div>
                    <div className="text-xs text-[#78716C] mt-0.5 font-mono">
                      {formatFileSize(att.file_size_bytes)} •{" "}
                      {att.created_at.slice(0, 10)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-[#8C867A] max-w-xs truncate">
                    {att.storage_path}
                  </span>
                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="p-1 rounded text-[#8C867A] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                    title="Delete File"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="p-12 text-center text-xs text-[#8C867A] bg-white border border-[#E5E0D5] rounded-lg">
          No files attached to this client yet. Use "Upload File" above to
          attach sketches, briefs, or deliverables.
        </div>
      )}
    </div>
  );
};
