import Link from "next/link";

export const runtime = "edge";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">页面不存在</h1>
      <p className="text-sm text-slate-500">你访问的页面可能已被删除，或链接不正确。</p>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
      >
        返回首页
      </Link>
    </div>
  );
}

