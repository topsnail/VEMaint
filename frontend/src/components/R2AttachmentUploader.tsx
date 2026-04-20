import { InboxOutlined } from "@ant-design/icons";
import { App, Typography, Upload } from "antd";
import type { UploadProps } from "antd";
import { useEffect, useState } from "react";
import { uploadFile } from "../lib/http";

type Props = {
  /** 已上传对象的 Key（展示用，可与表单受控） */
  value?: string | null;
  onUploaded?: (key: string) => void;
  accept?: string;
  disabled?: boolean;
  description?: string;
};

/** R2 直传：拖拽/点击上传，图片缩略图预览 */
export function R2AttachmentUploader({
  value,
  onUploaded,
  accept = "image/*,.pdf,.doc,.docx",
  disabled,
  description = "支持拖拽上传；图片将显示预览",
}: Props) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const beforeUpload: UploadProps["beforeUpload"] = async (file) => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    if (file.type.startsWith("image/")) {
      setLocalPreview(URL.createObjectURL(file));
    } else {
      setLocalPreview(null);
    }
    setUploading(true);
    try {
      const res = await uploadFile(file);
      if (!res.ok) {
        message.error(res.error.message);
        return false;
      }
      onUploaded?.(res.data.key);
      message.success("上传成功");
    } finally {
      setUploading(false);
    }
    return false;
  };

  return (
    <div className="space-y-3">
      <Upload.Dragger
        name="file"
        multiple={false}
        accept={accept}
        showUploadList={false}
        disabled={disabled || uploading}
        beforeUpload={beforeUpload}
        className="rounded-main"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined className="text-primary text-4xl" />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域</p>
        <p className="ant-upload-hint text-[#64748b]">{description}</p>
      </Upload.Dragger>
      {localPreview ? (
        <div className="overflow-hidden rounded-main border border-[#e5e7eb] bg-[#f8fafc] p-2">
          <img src={localPreview} alt="上传预览" className="max-h-40 w-auto max-w-full object-contain" />
        </div>
      ) : null}
      {value ? (
        <Typography.Text type="secondary" className="text-xs">
          当前附件 Key：<span className="break-all font-mono text-[#334155]">{value}</span>
        </Typography.Text>
      ) : null}
    </div>
  );
}
