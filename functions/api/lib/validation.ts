import { z } from "zod";

export const loginBodySchema = z.object({
  username: z.string().trim().min(3, "账号长度不能少于3个字符"),
  password: z.string().min(6, "密码长度不能少于6个字符"),
});

export const profilePasswordBodySchema = z.object({
  oldPassword: z.string().min(1, "请输入旧密码"),
  newPassword: z.string().min(6, "新密码至少 6 位"),
});

const vehicleStatusSchema = z.enum(["normal", "repairing", "scrapped", "stopped"]);

export const vehicleUpsertBodySchema = z.object({
  plateNo: z.string().trim().min(2, "请输入号牌号码"),
  vehicleType: z.string().trim().min(1, "请选择车辆类型"),
  brandModel: z.string().trim().min(1, "请输入品牌型号"),
  vin: z.string().trim().min(1, "请输入车辆识别代号"),
  engineNo: z.string().trim().min(1, "请输入发动机号"),
  ownerDept: z.string().trim().min(1, "请输入使用部门"),
  ownerPerson: z.string().trim().min(1, "请输入责任人"),
  mileage: z.coerce.number().finite("里程必须为数字").nonnegative("里程不能为负数"),
  purchaseDate: z.string().trim().optional().nullable(),
  purchaseCost: z.coerce.number().finite("购置成本必须为数字").optional().nullable(),
  serviceLifeYears: z.coerce.number().int("使用年限必须为整数").min(0, "使用年限不能为负").optional().nullable(),
  scrapDate: z.string().trim().optional().nullable(),
  disposalMethod: z.string().trim().optional().nullable(),
  regDate: z.string().trim().optional().nullable(),
  loadSpec: z.string().trim().optional().nullable(),
  usageNature: z.string().trim().optional().nullable(),
  status: vehicleStatusSchema,
  remark: z.string().trim().optional().nullable(),
});

export const vehicleStatusBodySchema = z.object({
  status: vehicleStatusSchema,
});

export const vehicleCycleUpsertBodySchema = z.object({
  insuranceType: z.string().trim().optional().nullable(),
  insuranceVendor: z.string().trim().optional().nullable(),
  insuranceStart: z.string().trim().optional().nullable(),
  insuranceExpiry: z.string().trim().optional().nullable(),
  insuranceAttachmentKey: z.string().trim().optional().nullable(),
  annualLastDate: z.string().trim().optional().nullable(),
  annualExpiry: z.string().trim().optional().nullable(),
  maintLastDate: z.string().trim().optional().nullable(),
  maintIntervalDays: z.coerce.number().finite("保养间隔天数必须为数字").optional().nullable(),
  maintIntervalKm: z.coerce.number().finite("保养间隔里程必须为数字").optional().nullable(),
  maintNextDate: z.string().trim().optional().nullable(),
  maintNextKm: z.coerce.number().finite("下次保养里程必须为数字").optional().nullable(),
});

const maintenanceTargetSchema = z.enum(["vehicle", "equipment", "other"]);
const maintenanceTypeSchema = z.enum(["routine", "fault", "accident", "periodic"]);

export const maintenanceUpsertBodySchema = z
  .object({
    targetType: maintenanceTargetSchema,
    vehicleId: z.string().trim().optional().nullable(),
    equipmentName: z.string().trim().optional().nullable(),
    maintenanceType: maintenanceTypeSchema,
    maintenanceDate: z.string().trim().min(1, "维保日期无效"),
    itemDesc: z.string().trim().min(1, "请选择维保项目"),
    cost: z.coerce.number().finite("费用金额无效").nonnegative("费用金额无效"),
    vendor: z.string().trim().optional().nullable(),
    parts: z.string().trim().optional().nullable(),
    mileage: z.coerce.number().finite("里程必须为数字").optional().nullable(),
    remark: z.string().trim().optional().nullable(),
    attachmentKey: z.string().trim().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.targetType === "vehicle" && !value.vehicleId) {
      ctx.addIssue({ code: "custom", path: ["vehicleId"], message: "车辆维保必须选择车辆" });
    }
    if (value.targetType !== "vehicle" && !value.equipmentName) {
      ctx.addIssue({ code: "custom", path: ["equipmentName"], message: "设备/其他维保必须填写对象名称" });
    }
    if (value.targetType === "vehicle" && value.mileage == null) {
      ctx.addIssue({ code: "custom", path: ["mileage"], message: "车辆维保必须填写里程" });
    }
  });

const userRoleSchema = z.enum(["admin", "maintainer", "reader"]);

export const userCreateBodySchema = z.object({
  username: z.string().trim().min(3, "用户名长度不能少于3个字符"),
  password: z.string().min(6, "密码至少 6 位"),
  role: userRoleSchema,
});

export const userRoleBodySchema = z.object({
  role: userRoleSchema,
});

export const userPasswordBodySchema = z.object({
  password: z.string().min(6, "密码至少 6 位"),
});

export const userDisabledBodySchema = z.object({
  disabled: z.boolean(),
});

const stringArrayMapSchema = z.record(z.string(), z.array(z.string().trim()));

const ownerDirectoryEntrySchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().min(1),
});

const permissionsSchema = z
  .object({
    roles: z
      .object({
        admin: z.array(z.string()).optional(),
        maintainer: z.array(z.string()).optional(),
        reader: z.array(z.string()).optional(),
      })
      .partial()
      .optional(),
  })
  .partial();

export const systemConfigBodySchema = z.object({
  siteName: z.string().trim().min(1, "siteName 不能为空"),
  warnDays: z.coerce.number().finite().min(1).max(30).default(7),
  versionNote: z.string().trim().default("v1.0.0"),
  dropdowns: stringArrayMapSchema.optional().default({}),
  ownerDirectory: z.array(ownerDirectoryEntrySchema).optional(),
  permissions: permissionsSchema.optional(),
});

