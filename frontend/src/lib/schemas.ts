import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(3, "账号长度不能少于3个字符"),
  password: z.string().min(6, "密码长度不能少于6个字符"),
});

export const vehicleSubmitSchema = z.object({
  plateNo: z.string().trim().min(2, "请输入号牌号码"),
  vehicleType: z.string().trim().min(1, "请选择车辆类型"),
  brandModel: z.string().trim().min(1, "请输入品牌型号"),
  vin: z.string().trim().min(1, "请输入车辆识别代号"),
  engineNo: z.string().trim().min(1, "请输入发动机号"),
  ownerDept: z.string().trim().min(1, "请输入使用部门"),
  ownerPerson: z.string().trim().min(1, "请输入责任人"),
  mileage: z.number().nonnegative("里程不能为负数"),
});

export const maintenanceSubmitSchema = z
  .object({
    targetType: z.enum(["vehicle", "equipment", "other"]),
    vehicleId: z.string().optional(),
    equipmentName: z.string().optional(),
    maintenanceType: z.enum(["routine", "fault", "accident", "periodic"]),
    maintenanceDate: z.string().trim().min(1, "维保日期无效"),
    itemDesc: z.string().trim().min(1, "请选择维保项目"),
    cost: z.number().nonnegative("费用金额无效"),
    mileage: z.number().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.targetType === "vehicle" && !value.vehicleId) {
      ctx.addIssue({ code: "custom", path: ["vehicleId"], message: "请选择车辆" });
    }
    if (value.targetType !== "vehicle" && !value.equipmentName?.trim()) {
      ctx.addIssue({ code: "custom", path: ["equipmentName"], message: "请输入对象名称" });
    }
    if (value.targetType === "vehicle" && (value.mileage == null || Number.isNaN(value.mileage))) {
      ctx.addIssue({ code: "custom", path: ["mileage"], message: "车辆维保请填写本次里程" });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;

export const profilePasswordSchema = z.object({
  oldPassword: z.string().min(1, "请输入旧密码"),
  newPassword: z.string().min(6, "新密码至少 6 位"),
});

export type ProfilePasswordInput = z.infer<typeof profilePasswordSchema>;
