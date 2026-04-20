// @ts-nocheck
import React, { Children, cloneElement, createContext, isValidElement, useContext, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { ChevronDown } from "lucide-react";

type AnyObj = Record<string, any>;

const pathKey = (name: any): string => (Array.isArray(name) ? name.join(".") : String(name));
const getByPath = (obj: AnyObj, name: any) => pathKey(name).split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
const setByPath = (obj: AnyObj, name: any, value: any): AnyObj => {
  const keys = pathKey(name).split(".");
  const next = { ...obj };
  let cursor: AnyObj = next;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const k = keys[i]!;
    cursor[k] = typeof cursor[k] === "object" && cursor[k] != null ? { ...cursor[k] } : {};
    cursor = cursor[k];
  }
  cursor[keys[keys.length - 1]!] = value;
  return next;
};

type FormInstance<T extends AnyObj = AnyObj> = {
  getFieldValue: (name: any) => any;
  getFieldsValue: () => T;
  setFieldValue: (name: any, value: any) => void;
  setFieldsValue: (next: Partial<T>) => void;
  resetFields: () => void;
  validateFields: () => Promise<T>;
  __setValues?: React.Dispatch<React.SetStateAction<T>>;
  __initial?: T;
  __items?: Map<string, { rules?: Array<{ required?: boolean; min?: number; message?: string }> }>;
};

const createFormInstance = <T extends AnyObj>(): FormInstance<T> => {
  const valueRef = { current: {} as T };
  const items = new Map<string, { rules?: Array<{ required?: boolean; min?: number; message?: string }> }>();
  const form: FormInstance<T> = {
    getFieldValue: (name) => getByPath(valueRef.current as AnyObj, name),
    getFieldsValue: () => valueRef.current,
    setFieldValue: (name, value) => {
      valueRef.current = setByPath(valueRef.current as AnyObj, name, value) as T;
      form.__setValues?.(valueRef.current);
    },
    setFieldsValue: (next) => {
      valueRef.current = { ...(valueRef.current as AnyObj), ...(next as AnyObj) } as T;
      form.__setValues?.(valueRef.current);
    },
    resetFields: () => {
      valueRef.current = ({ ...(form.__initial as AnyObj) } || {}) as T;
      form.__setValues?.(valueRef.current);
    },
    validateFields: async () => {
      const errors: string[] = [];
      items.forEach((meta, name) => {
        const value = getByPath(valueRef.current as AnyObj, name);
        for (const rule of meta.rules ?? []) {
          if (rule.required && (value == null || value === "" || (Array.isArray(value) && value.length === 0))) {
            errors.push(rule.message ?? `${name} 为必填项`);
            break;
          }
          if (typeof rule.min === "number" && typeof value === "string" && value.length < rule.min) {
            errors.push(rule.message ?? `${name} 长度不足`);
            break;
          }
        }
      });
      if (errors.length > 0) return Promise.reject(new Error(errors[0]));
      return valueRef.current;
    },
    __items: items,
  };
  return form;
};

const FormContext = createContext<{ form: any } | null>(null);

const FormComp = ({ form, initialValues, children, className, onFinish }: any) => {
  const own = useRef<any>(null);
  if (!own.current) own.current = createFormInstance<any>();
  const inst = form ?? own.current;
  const [values, setValues] = useState<any>(() => initialValues ?? {});
  inst.__setValues = setValues;
  inst.__initial = initialValues ?? {};
  return (
    <form
      autoComplete="off"
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!onFinish) return;
        try {
          const data = await inst.validateFields();
          await onFinish(data);
        } catch (err: any) {
          toast.error(err?.message ?? "表单校验失败");
        }
      }}
    >
      <FormContext.Provider value={{ form: inst }}>{children}</FormContext.Provider>
    </form>
  );
};

const FormItem = ({ label, name, rules, children, noStyle, className, style, initialValue }: any) => {
  const ctx = useContext(FormContext);
  if (!ctx) return <>{typeof children === "function" ? children(createFormInstance<any>()) : children}</>;
  const { form } = ctx;
  if (name != null) form.__items?.set(pathKey(name), { rules });
  if (name != null && initialValue != null && form.getFieldValue(name) == null) form.setFieldValue(name, initialValue);
  if (typeof children === "function") {
    return <>{children(form)}</>;
  }
  let content: ReactNode = children;
  if (name != null && isValidElement(children)) {
    const value = form.getFieldValue(name);
    const child = children as ReactElement<any>;
    content = cloneElement(child, {
      value: value ?? child.props.value ?? "",
      onChange: (arg: any) => {
        const nextValue = arg?.target?.value ?? arg;
        form.setFieldValue(name, nextValue);
        child.props.onChange?.(arg);
      },
    });
  }
  if (noStyle) return <>{content}</>;
  return (
    <div className={className ?? "mb-3"} style={style}>
      {label ? <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label> : null}
      {content}
    </div>
  );
};

const FormList = ({ name, children }: { name: any; children: (fields: any[], ops: any) => ReactNode }) => {
  const ctx = useContext(FormContext);
  if (!ctx) return null;
  const arr = ctx.form.getFieldValue(name) ?? [];
  const fields = arr.map((_: any, i: number) => ({ key: i, name: i }));
  const ops = {
    add: (value: any = {}) => ctx.form.setFieldValue(name, [...arr, value]),
    remove: (idx: number) => ctx.form.setFieldValue(name, arr.filter((_: any, i: number) => i !== idx)),
  };
  return <>{children(fields, ops)}</>;
};

type FormComponent = typeof FormComp & {
  Item: any;
  List: any;
  useForm: <T = any>() => [FormInstance<T>];
};

const FormObj = Object.assign(FormComp, {
  Item: FormItem,
  List: FormList,
  useForm: <T = any>() => [createFormInstance<T>()],
}) as FormComponent;

const inputBase = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400";

const Input: any = Object.assign(
  React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => <input ref={ref} {...props} className={`${inputBase} ${props.className ?? ""}`} />),
  {
    Password: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
      <input ref={ref} type="password" {...props} className={`${inputBase} ${props.className ?? ""}`} />
    )),
    TextArea: React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => (
      <textarea ref={ref} {...props} className={`min-h-[84px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ${props.className ?? ""}`} />
    )),
    Search: ({ onSearch, onChange, value, placeholder, className }: any) => (
      <div className={`flex gap-2 ${className ?? ""}`}>
        <input className={inputBase} value={value ?? ""} onChange={onChange} placeholder={placeholder} />
        <Button type="default" onClick={() => onSearch?.(value ?? "")}>
          搜索
        </Button>
      </div>
    ),
  },
);

const Button: any = ({
  type,
  danger,
  icon,
  loading,
  block,
  children,
  className,
  ...rest
}: any) => (
  <button
    {...rest}
    className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm transition ${
      type === "primary"
        ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
        : type === "text"
          ? "border-transparent bg-transparent text-slate-700 hover:bg-slate-100"
          : danger
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    } ${block ? "w-full" : ""} ${className ?? ""}`}
  >
    {loading ? "..." : icon}
    {children}
  </button>
);

const Space: any = ({ children, className, direction = "horizontal", wrap, size }: any) => (
  <div className={`flex ${direction === "vertical" ? "flex-col" : "items-center"} ${wrap ? "flex-wrap" : ""} gap-2 ${className ?? ""}`} style={{ gap: Array.isArray(size) ? size[0] : size }}>
    {children}
  </div>
);

const Typography: any = {
  Text: ({ children, className, type, strong }: any) => <span className={`${className ?? ""} ${type === "secondary" ? "text-slate-500" : ""} ${strong ? "font-semibold" : ""}`}>{children}</span>,
  Title: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
};

const Skeleton: any = ({ active, paragraph, className }: any) => (
  <div className={`space-y-2 ${active ? "animate-pulse" : ""} ${className ?? ""}`}>
    {Array.from({ length: paragraph?.rows ?? 3 }).map((_, i) => (
      <div key={i} className="h-4 rounded bg-slate-200" />
    ))}
  </div>
);

const Menu: any = ({
  items,
  selectedKeys,
  onClick,
  className,
}: any) => (
  <ul className={`space-y-1 ${className ?? ""}`}>
    {(items ?? []).map((item) => {
      const active = selectedKeys?.includes(item.key);
      return (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => onClick?.({ key: item.key })}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        </li>
      );
    })}
  </ul>
);

const LayoutRoot: any = ({ children, className }: any) => <div className={className}>{children}</div>;
const Layout = Object.assign(LayoutRoot, {
  Header: ({ children, className }: any) => <header className={className}>{children}</header>,
  Content: ({ children, className }: any) => <main className={className}>{children}</main>,
  Sider: ({ children, className }: any) => <aside className={className}>{children}</aside>,
});

const Drawer: any = ({ open, onClose, children, title, width = 320 }: any) =>
  open ? (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <div className="h-full bg-white p-4 shadow-xl" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  ) : null;

const Modal: any = ({ open, onCancel, onOk, title, children, footer, width }: any) =>
  open ? (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onCancel}>
      <div className="mx-auto mt-20 w-[92vw] rounded-md bg-white p-4 shadow-xl" style={{ maxWidth: width ?? 920 }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 text-lg font-semibold">{title}</div>
        <div>{children}</div>
        <div className="mt-4 flex justify-end gap-2">{footer ?? <><Button onClick={onCancel}>取消</Button><Button type="primary" onClick={onOk}>确定</Button></>}</div>
      </div>
    </div>
  ) : null;

const Tabs: any = ({ items, activeKey, onChange }: any) => {
  const [internal, setInternal] = useState(items[0]?.key);
  const active = activeKey ?? internal;
  return (
    <div>
      <div className="mb-3 flex gap-2 border-b">
        {items.map((it) => (
          <button
            key={it.key}
            className={`px-3 py-2 text-sm ${active === it.key ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-600"}`}
            onClick={() => {
              setInternal(it.key);
              onChange?.(it.key);
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
      {items.find((it) => it.key === active)?.children}
    </div>
  );
};

const Table: any = ({ columns = [], dataSource = [], rowKey }: any) => (
  <div className="overflow-x-auto rounded-md border">
    <table className="w-full text-sm">
      <thead className="bg-slate-50">
        <tr>
          {columns.map((col: any) => (
            <th key={col.key ?? col.dataIndex ?? col.title} className="px-3 py-2 text-left font-medium text-slate-700">
              {col.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dataSource.map((record: any, idx: number) => (
          <tr key={record?.[rowKey] ?? idx} className="border-t">
            {columns.map((col: any) => {
              const value = col.dataIndex ? record[col.dataIndex] : undefined;
              return (
                <td key={col.key ?? col.dataIndex ?? col.title} className="px-3 py-2 align-top">
                  {typeof col.render === "function" ? col.render(value, record, idx) : value}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Select: any = ({ options = [], value, onChange, placeholder, className }: any) => (
  <select
    className={`${inputBase} ${className ?? ""}`}
    value={value ?? ""}
    onChange={(e) => onChange?.(e.target.value)}
  >
    <option value="">{placeholder ?? "请选择"}</option>
    {options.map((opt: any) => (
      <option key={opt.value} value={opt.value}>
        {opt.label ?? opt.value}
      </option>
    ))}
  </select>
);

const AutoComplete: any = ({ options = [], value, onChange, placeholder, className }: any) => {
  const listId = `ac-${Math.random().toString(36).slice(2)}`;
  return (
    <>
      <input className={`${inputBase} ${className ?? ""}`} list={listId} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} />
      <datalist id={listId}>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value} />
        ))}
      </datalist>
    </>
  );
};

const DatePicker: any = ({ value, onChange, className }: any) => (
  <input className={`${inputBase} ${className ?? ""}`} type="date" value={value ?? ""} onChange={(e) => onChange?.(e.target.value)} />
);
const InputNumber: any = ({ value, onChange, className, min, step }: any) => (
  <input className={`${inputBase} ${className ?? ""}`} type="number" min={min} step={step} value={value ?? ""} onChange={(e) => onChange?.(Number(e.target.value))} />
);

const Card: any = ({ title, children, className }: any) => (
  <div className={`rounded-md border bg-white ${className ?? ""}`}>
    {title ? <div className="border-b px-4 py-2 font-medium">{title}</div> : null}
    <div className="p-4">{children}</div>
  </div>
);
const Statistic: any = ({ title, value }: any) => (
  <div>
    <div className="text-xs text-slate-500">{title}</div>
    <div className="text-xl font-semibold">{value}</div>
  </div>
);
const Row: any = ({ children, className }: any) => <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${className ?? ""}`}>{children}</div>;
const Col: any = ({ children, className }: any) => <div className={className}>{children}</div>;

const Badge: any = ({ count, children }: any) => (
  <div className="relative inline-flex">
    {children}
    {typeof count === "number" && count > 0 ? <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{count}</span> : null}
  </div>
);
const Avatar: any = ({ icon, children, className, size }: any) => <span className={`inline-flex items-center justify-center rounded-full bg-slate-200 ${className ?? ""}`} style={{ width: size ?? 32, height: size ?? 32 }}>{icon ?? children}</span>;

const Dropdown: any = ({ menu, children }: any) => {
  const [open, setOpen] = useState(false);
  const child = Children.only(children) as ReactElement;
  return (
    <div className="relative inline-flex">
      {cloneElement(child, { onClick: () => setOpen((v) => !v) })}
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded-md border bg-white p-1 shadow">
          {(menu?.items ?? []).map((item: any, idx: number) =>
            item.type === "divider" ? (
              <div key={`d-${idx}`} className="my-1 h-px bg-slate-200" />
            ) : (
              <button
                key={item.key}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${item.danger ? "text-red-600" : ""}`}
                onClick={() => {
                  menu?.onClick?.({ key: item.key });
                  setOpen(false);
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
};

const Tooltip: any = ({ title, children }: any) => <span title={typeof title === "string" ? title : undefined}>{children}</span>;
const Popconfirm: any = ({ title, onConfirm, children }: any) => {
  const child = Children.only(children) as ReactElement;
  return cloneElement(child, {
    onClick: (e: any) => {
      e.preventDefault();
      if (window.confirm(typeof title === "string" ? title : "确认执行此操作？")) onConfirm?.();
    },
  });
};

const Checkbox: any = ({ checked, onChange, children }: any) => (
  <label className="inline-flex items-center gap-2 text-sm">
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange?.({ target: { checked: e.target.checked } })} />
    {children}
  </label>
);

const Collapse: any = ({ items = [], defaultActiveKey = [] as string[] }: any) => {
  const [open, setOpen] = useState<string[]>(Array.isArray(defaultActiveKey) ? defaultActiveKey : [defaultActiveKey]);
  return (
    <div className="space-y-2">
      {items.map((item: any) => {
        const active = open.includes(item.key);
        return (
          <div key={item.key} className="rounded-md border">
            <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium" onClick={() => setOpen((s) => (s.includes(item.key) ? s.filter((x) => x !== item.key) : [...s, item.key]))}>
              {item.label}
              <ChevronDown className={`h-4 w-4 transition ${active ? "rotate-180" : ""}`} />
            </button>
            {active ? <div className="border-t p-3">{item.children}</div> : null}
          </div>
        );
      })}
    </div>
  );
};

const Breadcrumb: any = ({ items = [] }: any) => (
  <div className="flex items-center gap-1 text-xs text-slate-500">
    {items.map((item: any, idx: number) => (
      <React.Fragment key={idx}>
        {idx > 0 ? <span>/</span> : null}
        <span>{item.title}</span>
      </React.Fragment>
    ))}
  </div>
);

const UploadDragger: any = ({ beforeUpload, disabled, children, className, accept }: any) => (
  <label className={`block cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center ${disabled ? "opacity-50" : ""} ${className ?? ""}`}>
    <input
      type="file"
      className="hidden"
      accept={accept}
      disabled={disabled}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void beforeUpload?.(file);
        e.currentTarget.value = "";
      }}
    />
    {children}
  </label>
);
const Upload = { Dragger: UploadDragger };

const List: any = ({ dataSource, renderItem }: any) => <div className="space-y-2">{(dataSource ?? []).map((item: any, i: number) => <div key={i}>{renderItem(item, i)}</div>)}</div>;
List.Item = ({ children, className }: any) => <div className={`rounded-md border p-3 ${className ?? ""}`}>{children}</div>;
List.Item.Meta = ({ title, description }: any) => (
  <div>
    <div className="font-medium">{title}</div>
    <div className="text-sm text-slate-500">{description}</div>
  </div>
);

const Descriptions: any = ({ items = [] }: any) => (
  <dl className="grid grid-cols-2 gap-3 text-sm">
    {items.map((it: any) => (
      <React.Fragment key={it.key ?? it.label}>
        <dt className="text-slate-500">{it.label}</dt>
        <dd>{it.children}</dd>
      </React.Fragment>
    ))}
  </dl>
);

const Progress: any = ({ percent = 0 }: any) => (
  <div className="h-2 rounded-full bg-slate-200">
    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, Number(percent)))}%` }} />
  </div>
);

const Alert: any = ({ message, description }: any) => (
  <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
    <div className="font-medium">{message}</div>
    {description ? <div className="text-sm text-slate-600">{description}</div> : null}
  </div>
);

export const ConfigProvider: any = ({ children }: any) => <>{children}</>;

export const App: any = Object.assign(
  ({ children }: any) => (
    <>
      {children}
      <Toaster richColors position="top-right" />
    </>
  ),
  {
    useApp: () => ({
      message: {
        success: (msg: string) => toast.success(msg),
        error: (msg: string) => toast.error(msg),
        warning: (msg: string) => toast.warning(msg),
        info: (msg: string) => toast.message(msg),
      },
    }),
  },
);

export {
  Alert,
  AutoComplete,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  FormObj as Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tooltip,
  Typography,
  Upload,
};

export type UploadProps = AnyObj;
export type FormInstance<T = any> = any;
export type TableProps<T = any> = any;
export type ThemeConfig = any;
