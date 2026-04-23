/**
 * shadcn/Radix 兼容层：保留原页面使用的类 Ant Design API，底层全部走 @/components/ui（shadcn）。
 * 不再依赖 antd 包，也不再将实现命名为 antd-bridge。
 */
import React, {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

import { Avatar as UIAvatar, AvatarFallback } from "@/components/ui/avatar";
import { Button as UIButton } from "@/components/ui/button";
import { Card as UICard, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton as UISkeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AnyObj = Record<string, any>;
const normalizeLabelText = (label: unknown): string | null => {
  if (typeof label === "string") return label.trim() || null;
  if (typeof label === "number") return String(label);
  return null;
};

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

export type FormInstance<T extends AnyObj = AnyObj> = {
  getFieldValue: (name: any) => any;
  getFieldsValue: () => T;
  setFieldValue: (name: any, value: any) => void;
  setFieldsValue: (next: Partial<T>) => void;
  resetFields: () => void;
  validateFields: () => Promise<T>;
  __setValues?: React.Dispatch<React.SetStateAction<any>>;
  __initial?: any;
  __items?: Map<string, { rules?: Array<{ required?: boolean; min?: number; message?: string }>; labelText?: string | null }>;
};

const createFormInstance = <T extends AnyObj>(): FormInstance<T> => {
  const valueRef = { current: {} as T };
  const items = new Map<string, { rules?: Array<{ required?: boolean; min?: number; message?: string }>; labelText?: string | null }>();
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
      const initial = form.__initial != null ? { ...(form.__initial as AnyObj) } : {};
      valueRef.current = initial as T;
      form.__setValues?.(valueRef.current);
    },
    validateFields: async () => {
      const errors: string[] = [];
      items.forEach((meta, name) => {
        const value: unknown = getByPath(valueRef.current as AnyObj, name);
        const fieldName = meta.labelText || name;
        for (const rule of meta.rules ?? []) {
          if (rule.required && (value == null || value === "" || (Array.isArray(value) && value.length === 0))) {
            const pickText = String(fieldName ?? "");
            const shouldPick = /类型|分类|状态|日期|车辆|对象|部门|人员|方式|结果|项目|类别|选择|单位|性质/.test(pickText);
            errors.push(rule.message ?? `${shouldPick ? "请选择" : "请填写"}${fieldName}`);
            break;
          }
          if (typeof rule.min === "number" && typeof value === "string" && value.length < rule.min) {
            errors.push(rule.message ?? `${fieldName}长度不能少于${rule.min}个字符`);
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
  const [values, setValues] = useState<any>(() => {
    const current = typeof inst.getFieldsValue === "function" ? inst.getFieldsValue() : {};
    return initialValues ?? current ?? {};
  });
  // When a shared form instance already has values (set before mount), hydrate UI from it.
  useEffect(() => {
    const current = typeof inst.getFieldsValue === "function" ? inst.getFieldsValue() : {};
    if (current && Object.keys(current).length > 0) {
      setValues(current);
    }
    // Clear stale validation rules from previous form usages/tabs.
    inst.__items?.clear?.();
  }, [inst]);
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
  if (name != null) form.__items?.set(pathKey(name), { rules, labelText: normalizeLabelText(label) });
  useEffect(() => {
    if (name == null || initialValue == null) return;
    if (form.getFieldValue(name) != null) return;
    form.setFieldValue(name, initialValue);
  }, [form, name, initialValue]);
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
      {label ? (
        <Label className="mb-1 block">{label}</Label>
      ) : null}
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
  useForm: <T extends AnyObj = AnyObj>() => [FormInstance<T>];
};

const FormObj = Object.assign(FormComp, {
  Item: FormItem,
  List: FormList,
  useForm: <T extends AnyObj = AnyObj>() => {
    const formRef = useRef<FormInstance<T> | null>(null);
    if (!formRef.current) {
      formRef.current = createFormInstance<T>();
    }
    return [formRef.current];
  },
}) as FormComponent;

const CompatButton = React.forwardRef<HTMLButtonElement, any>(
  ({ type, htmlType, danger, icon, loading, block, shape, children, className, ...rest }, ref) => {
    let variant: any = "secondary";
    if (type === "primary") variant = "primary";
    else if (type === "text" || type === "link") variant = "ghost";
    if (danger && type === "primary") variant = "destructive";
    else if (danger) variant = "outline";

    return (
      <UIButton
        ref={ref}
        type={htmlType ?? "button"}
        variant={variant}
        fullWidth={!!block}
        disabled={!!loading || rest.disabled}
        className={cn(
          danger && type !== "primary" && "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
          shape === "circle" && "h-9 w-9 rounded-full p-0",
          className,
        )}
        {...rest}
      >
        {loading ? <span className="opacity-70">…</span> : null}
        {icon}
        {children}
      </UIButton>
    );
  },
);
CompatButton.displayName = "CompatButton";

const Space = React.forwardRef<HTMLDivElement, any>(({ children, className, direction = "horizontal", wrap, size }, ref) => (
  <div
    ref={ref}
    className={cn("flex gap-2", direction === "vertical" ? "flex-col" : "items-center", wrap ? "flex-wrap" : "", className)}
    style={{ gap: Array.isArray(size) ? size[0] : size }}
  >
    {children}
  </div>
));
Space.displayName = "Space";

const Typography: any = {
  Text: ({ children, className, type, strong }: any) => (
    <span className={cn(className, type === "secondary" ? "text-slate-500" : "", strong ? "font-semibold" : "")}>{children}</span>
  ),
  Title: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
};

const Skeleton: any = ({ active, paragraph, className }: any) => (
  <div className={cn("space-y-2", active ? "animate-pulse" : "", className)}>
    {Array.from({ length: paragraph?.rows ?? 3 }).map((_, i) => (
      <UISkeleton key={i} className="h-4 w-full" />
    ))}
  </div>
);

const Menu: any = ({ items, selectedKeys, onClick, className }: any) => (
  <ul className={cn("space-y-1", className)}>
    {(items ?? []).map((item: any) => {
      const active = selectedKeys?.includes(item.key);
      return (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => onClick?.({ key: item.key })}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm",
              active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100",
            )}
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

const Drawer: any = ({ open, onClose, children, title, width = 320, styles }: any) => (
  <Sheet open={!!open} onOpenChange={(next) => !next && onClose?.()}>
    <SheetContent side="left" className="flex w-full max-w-none flex-col p-0 sm:max-w-none" style={{ width }} hideClose>
      <SheetHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 px-4 py-3" style={styles?.header}>
        <SheetTitle className="text-left">{title}</SheetTitle>
        <button type="button" className="rounded-sm p-1 text-slate-500 hover:bg-slate-100" onClick={() => onClose?.()} aria-label="关闭">
          ×
        </button>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-auto" style={styles?.body}>
        {children}
      </div>
    </SheetContent>
  </Sheet>
);

const Modal: any = ({ open, onCancel, onOk, title, children, footer, width }: any) => {
  const maxW = width ?? 920;
  const maxWidthStyle = typeof maxW === "number" ? `${maxW}px` : maxW;
  return (
    <Dialog
      open={!!open}
      onOpenChange={(next) => {
        if (!next) onCancel?.();
      }}
    >
      <DialogContent
        className="max-h-[90vh] w-[92vw] overflow-y-auto sm:max-w-none"
        style={{ maxWidth: maxWidthStyle }}
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div>{children}</div>
        <DialogFooter>
          {footer !== undefined ? (
            footer
          ) : (
            <>
              <UIButton variant="secondary" onClick={() => onCancel?.()}>
                取消
              </UIButton>
              <UIButton variant="primary" onClick={() => onOk?.()}>
                确定
              </UIButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Tabs: any = ({ items, activeKey, onChange }: any) => {
  const safeItems = Array.isArray(items) ? items : [];
  const [internal, setInternal] = useState(safeItems[0]?.key);
  const active = activeKey ?? internal;
  return (
    <div>
      <div className="mb-3 inline-flex h-9 items-center rounded-sm bg-slate-100 p-1">
        {safeItems.map((it: any) => (
          <button
            key={it.key}
            type="button"
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition",
              active === it.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
            onClick={() => {
              setInternal(it.key);
              onChange?.(it.key);
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
      {safeItems.find((it: any) => it.key === active)?.children}
    </div>
  );
};

const selectBase =
  "flex h-8 w-full rounded-sm border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

const Table: any = ({ columns = [], dataSource = [], rowKey, scroll, sticky, className, ..._rest }: any) => {
  const wrapperStyle: React.CSSProperties = {};
  if (scroll?.y) wrapperStyle.maxHeight = scroll.y;

  const tableStyle: React.CSSProperties = {};
  if (scroll?.x === "max-content") {
    tableStyle.minWidth = "max-content";
  } else if (typeof scroll?.x === "number" || typeof scroll?.x === "string") {
    tableStyle.minWidth = scroll.x;
  }

  const stickyHeaderClass = sticky ? "sticky top-0 z-10 bg-slate-50" : "bg-slate-50";

  return (
    <div className={cn("overflow-auto rounded-sm border border-slate-200", className)} style={wrapperStyle}>
      <table className="w-full text-sm" style={tableStyle}>
      <thead className={stickyHeaderClass}>
        <tr>
          {columns.map((col: any) => (
            <th key={col.key ?? col.dataIndex ?? col.title} className="whitespace-nowrap px-3 py-1.5 text-left text-sm font-semibold text-slate-800">
              {col.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dataSource.map((record: any, idx: number) => (
          <tr key={record?.[rowKey] ?? idx} className={cn("border-t border-slate-200", idx % 2 === 1 ? "bg-slate-100/70" : "bg-white")}>
            {columns.map((col: any) => {
              const value = col.dataIndex ? record[col.dataIndex] : undefined;
              return (
                <td key={col.key ?? col.dataIndex ?? col.title} className={cn("whitespace-nowrap px-3 py-1.5 align-top text-sm leading-5", col.className)}>
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
};

const Select = React.forwardRef<HTMLSelectElement, any>(({ options = [], value, onChange, placeholder, className, style }, ref) => (
  <select ref={ref} className={cn(selectBase, className)} style={style} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)}>
    <option value="">{placeholder ?? "请选择"}</option>
    {options.map((opt: any) => (
      <option key={opt.value} value={opt.value}>
        {opt.label ?? opt.value}
      </option>
    ))}
  </select>
));
Select.displayName = "Select";

const AutoComplete = React.forwardRef<HTMLInputElement, any>(({ options = [], value, onChange, placeholder, className }, ref) => {
  const reactId = useId();
  const listId = `ac-${reactId.replace(/:/g, "")}`;
  return (
    <>
      <input ref={ref} className={cn(selectBase, className)} list={listId} value={value ?? ""} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} />
      <datalist id={listId}>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value} />
        ))}
      </datalist>
    </>
  );
});
AutoComplete.displayName = "AutoComplete";

const DatePicker = React.forwardRef<HTMLInputElement, any>(({ value, onChange, className }, ref) => (
  <input ref={ref} className={cn(selectBase, className)} type="date" value={value ?? ""} onChange={(e) => onChange?.(e.target.value)} />
));
DatePicker.displayName = "DatePicker";

const InputNumber = React.forwardRef<HTMLInputElement, any>(({ value, onChange, className, min, step }, ref) => (
  <input ref={ref} className={cn(selectBase, className)} type="number" min={min} step={step} value={value ?? ""} onChange={(e) => onChange?.(Number(e.target.value))} />
));
InputNumber.displayName = "InputNumber";

const Card: any = ({ title, extra, children, className, headClassName, bodyClassName }: any) => (
  <UICard className={cn("overflow-hidden", className)}>
    {title || extra ? (
      <div className={cn("flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2", headClassName)}>
        <div className="min-w-0 font-medium text-slate-900">{title}</div>
        {extra ? <div className="shrink-0">{extra}</div> : null}
      </div>
    ) : null}
    <CardContent className={cn("p-4", bodyClassName)}>{children}</CardContent>
  </UICard>
);

const Statistic: any = ({ title, value, valueStyle, precision }: any) => {
  const display =
    typeof precision === "number" && (typeof value === "number" || typeof value === "string")
      ? Number(value).toFixed(precision)
      : value;
  return (
    <div>
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-xl font-semibold text-slate-900" style={valueStyle}>
        {display}
      </div>
    </div>
  );
};

const Row: any = ({ children, className }: any) => <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2", className)}>{children}</div>;
const Col: any = ({ children, className }: any) => <div className={className}>{children}</div>;

const Badge: any = ({ count, children, overflowCount = 99, offset }: any) => {
  let label: ReactNode = count;
  if (typeof count === "number" && typeof overflowCount === "number" && count > overflowCount) {
    label = `${overflowCount}+`;
  }
  const off = Array.isArray(offset) ? offset : [0, 0];
  const [ox, oy] = [off[0] ?? 0, off[1] ?? 0];
  return (
    <div className="relative inline-flex">
      {children}
      {typeof count === "number" && count > 0 ? (
        <span
          className="absolute inline-flex min-h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white"
          style={{ transform: `translate(${ox}px, ${oy}px)`, right: 0, top: 0 }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
};

const Avatar: any = ({ icon, children, className, size = 32 }: any) => (
  <UIAvatar className={cn(className)} style={{ width: size, height: size }}>
    <AvatarFallback className="bg-slate-200 text-slate-700">{icon ?? children}</AvatarFallback>
  </UIAvatar>
);

const Dropdown: any = ({ menu, children }: any) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-auto min-w-[120px]">
      {(menu?.items ?? []).map((item: any, idx: number) =>
        item.type === "divider" ? (
          <DropdownMenuSeparator key={`d-${idx}`} />
        ) : (
          <DropdownMenuItem
            key={item.key ?? idx}
            danger={item.danger}
            onSelect={() => menu?.onClick?.({ key: item.key })}
            className="gap-2"
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ),
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);

const Tooltip: any = ({ title, children }: any) => (
  <UITooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex max-w-full">{children}</span>
    </TooltipTrigger>
    {title != null && String(title).length > 0 ? <TooltipContent>{title}</TooltipContent> : null}
  </UITooltip>
);

const Popconfirm: any = ({ title, onConfirm, onCancel, okText, cancelText, children }: any) => {
  const [open, setOpen] = useState(false);
  const child = Children.only(children) as ReactElement;
  const content = title ?? "确认执行此操作？";
  const close = () => setOpen(false);
  return (
    <>
      {cloneElement(child, {
        onClick: (e: any) => {
          e?.preventDefault?.();
          e?.stopPropagation?.();
          setOpen(true);
        },
      })}
      <Modal
        open={open}
        onCancel={() => {
          close();
          onCancel?.();
        }}
        title="确认"
        width={520}
        footer={
          <div className="flex justify-end gap-2">
            <UIButton variant="secondary" onClick={() => {
              close();
              onCancel?.();
            }}>
              {cancelText ?? "取消"}
            </UIButton>
            <UIButton
              variant="primary"
              onClick={() => {
                close();
                onConfirm?.();
              }}
            >
              {okText ?? "确认"}
            </UIButton>
          </div>
        }
      >
        <div className="text-sm text-slate-700">{content}</div>
      </Modal>
    </>
  );
};

const Checkbox: any = ({ checked, onChange, children }: any) => (
  <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange?.({ target: { checked: e.target.checked } })} className="rounded border-slate-300" />
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
          <div key={item.key} className="rounded-md border border-slate-200">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
              onClick={() => setOpen((s) => (s.includes(item.key) ? s.filter((x) => x !== item.key) : [...s, item.key]))}
            >
              {item.label}
              <ChevronDown className={cn("h-4 w-4 transition", active ? "rotate-180" : "")} />
            </button>
            {active ? <div className="border-t border-slate-200 p-3">{item.children}</div> : null}
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

const UploadDragger: any = ({ beforeUpload, disabled, children, className, accept, multiple }: any) => (
  <label className={cn("block cursor-pointer rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center", disabled ? "opacity-50" : "", className)}>
    <input
      type="file"
      className="hidden"
      accept={accept}
      multiple={!!multiple}
      disabled={disabled}
      onChange={async (e) => {
        const files = Array.from(e.target.files ?? []);
        for (const file of files) {
          // keep sequential uploads to simplify UI and avoid saturating bandwidth
          // eslint-disable-next-line no-await-in-loop
          await beforeUpload?.(file);
        }
        e.currentTarget.value = "";
      }}
    />
    {children}
  </label>
);
const Upload = { Dragger: UploadDragger };

const List: any = ({ dataSource, renderItem }: any) => (
  <div className="space-y-2">{(dataSource ?? []).map((item: any, i: number) => <div key={i}>{renderItem(item, i)}</div>)}</div>
);
List.Item = ({ children, className }: any) => <div className={cn("rounded-md border border-slate-200 p-3", className)}>{children}</div>;
List.Item.Meta = ({ title, description }: any) => (
  <div>
    <div className="font-medium">{title}</div>
    <div className="text-sm text-slate-500">{description}</div>
  </div>
);

const Descriptions: any = ({ items = [], children, column = 2 }: any) => {
  const cols = Math.max(1, Number(column) || 2);
  return (
    <dl className="grid gap-3 text-sm" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {children}
      {!children
        ? items.map((it: any) => (
            <React.Fragment key={it.key ?? it.label}>
              <dt className="text-slate-500">{it.label}</dt>
              <dd>{it.children}</dd>
            </React.Fragment>
          ))
        : null}
    </dl>
  );
};

Descriptions.Item = ({ label, children, span = 1 }: any) => {
  const s = Math.max(1, Number(span) || 1);
  const col: React.CSSProperties = { gridColumn: `span ${s} / span ${s}` };
  return (
    <>
      <dt className="text-slate-500" style={col}>
        {label}
      </dt>
      <dd style={col}>{children}</dd>
    </>
  );
};

const Progress: any = ({ percent = 0 }: any) => (
  <div className="h-2 rounded-full bg-slate-200">
    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, Number(percent)))}%` }} />
  </div>
);

const Alert: any = ({ message, description, type, className }: any) => (
  <div
    className={cn(
      "rounded-md border p-3",
      type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
      type === "error" && "border-red-200 bg-red-50 text-red-900",
      type === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
      (!type || type === "info") && "border-blue-200 bg-blue-50 text-slate-900",
      className,
    )}
  >
    <div className="font-medium">{message}</div>
    {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}
  </div>
);

const InputSearch: any = ({ onSearch, onChange, value, defaultValue, placeholder, className, style }: any) => {
  const isControlled = typeof onChange === "function";
  const [internalValue, setInternalValue] = useState(() => ((value ?? defaultValue ?? "") as string));
  const currentValue = isControlled ? (value ?? "") : internalValue;

  useEffect(() => {
    if (!isControlled) setInternalValue((value ?? defaultValue ?? "") as string);
  }, [defaultValue, isControlled, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isControlled) {
      onChange?.(e);
    } else {
      setInternalValue(e.target.value);
    }
  };

  const submit = () => onSearch?.(currentValue);

  return (
    <div className={cn("flex gap-2", className)} style={style}>
      <UIInput value={currentValue} onChange={handleChange} placeholder={placeholder} onKeyDown={(e) => (e.key === "Enter" ? submit() : undefined)} />
      <UIButton type="button" variant="secondary" onClick={submit}>
        搜索
      </UIButton>
    </div>
  );
};

const InputField: any = Object.assign(
  React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { suffix?: ReactNode; allowClear?: boolean; onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void }>(
    ({ className, suffix, allowClear, onPressEnter, value, onChange, ...rest }, ref) => {
      const clear = () => {
        (onChange as any)?.({ target: { value: "" } });
      };
      const inner = (
        <UIInput
          ref={ref}
          className={cn(suffix || allowClear ? "pr-9" : "", className)}
          value={value as any}
          onChange={onChange as any}
          onKeyDown={(e) => {
            if (e.key === "Enter") onPressEnter?.(e);
            rest.onKeyDown?.(e as any);
          }}
          {...rest}
        />
      );
      if (!suffix && !allowClear) return inner;
      return (
        <div className="relative w-full">
          {inner}
          {allowClear && value !== undefined && value !== "" ? (
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={clear} aria-label="清除">
              ×
            </button>
          ) : null}
          {suffix ? (
            <span className={cn("absolute top-1/2 -translate-y-1/2", allowClear && value ? "right-8" : "right-2")}>{suffix}</span>
          ) : null}
        </div>
      );
    },
  ),
  {
    Password: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
      <UIInput ref={ref} type="password" {...props} />
    )),
    TextArea: (props: any) => <Textarea {...props} />,
    Search: InputSearch,
  },
);

export const ConfigProvider: any = ({ children }: any) => <>{children}</>;

function AppShell({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export const App: any = Object.assign(AppShell, {
  useApp: () => ({
    message: {
      success: (msg: string) => toast.success(msg),
      error: (msg: string) => toast.error(msg),
      warning: (msg: string) => toast.warning(msg),
      info: (msg: string) => toast.message(msg),
    },
  }),
});

export {
  Alert,
  AutoComplete,
  Avatar,
  Badge,
  Breadcrumb,
  CompatButton as Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  FormObj as Form,
  InputField as Input,
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
export type TableProps<T = any> = any;
export type ThemeConfig = any;
