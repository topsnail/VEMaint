export const runtime = "edge";

export default function InternalNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <h1 className="text-xl font-semibold text-slate-900">页面不存在</h1>
      <p className="text-sm text-slate-500">请检查地址后重试。</p>
    </div>
  );
}

