import { AutoComplete, Col, DatePicker, Form, InputNumber, Row, Select, Tooltip } from "@/components/ui/legacy";
import type { FormInstance } from "@/components/ui/legacy";
import { useEffect } from "react";

type SelectOption = { value: string; label: string };

type VehicleOption = {
  id: string;
  plateNo: string;
  brandModel: string;
};

type MaintenanceBasicSectionProps = {
  form: FormInstance;
  vehicles: VehicleOption[];
  equipmentNameOptions: SelectOption[];
  equipmentTypeOptions: SelectOption[];
  equipmentCategoryOptions: SelectOption[];
  maintenanceTypeOptions: SelectOption[];
  fixedTargetType?: "vehicle" | "equipment";
};

export function MaintenanceBasicSection({
  form,
  vehicles,
  equipmentNameOptions,
  equipmentTypeOptions,
  equipmentCategoryOptions,
  maintenanceTypeOptions,
  fixedTargetType,
}: MaintenanceBasicSectionProps) {
  useEffect(() => {
    if (!fixedTargetType) return;
    form.setFieldValue("targetType", fixedTargetType);
  }, [fixedTargetType, form]);

  return (
    <Row gutter={16}>
      {fixedTargetType ? (
        <Form.Item name="targetType" initialValue={fixedTargetType} noStyle>
          <input type="hidden" />
        </Form.Item>
      ) : (
        <Col span={12}>
          <Form.Item
            label={(
              <span>
                关联类型
                <Tooltip title="车辆维保会关联里程与车牌，设备维保会启用设备属性字段">
                  <span className="ml-1 cursor-help text-slate-400">?</span>
                </Tooltip>
              </span>
            )}
            name="targetType"
            initialValue="vehicle"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "vehicle", label: "车辆" },
                { value: "equipment", label: "设备" },
                { value: "other", label: "其他" },
              ]}
              placeholder="请选择关联类型"
            />
          </Form.Item>
        </Col>
      )}
      <Col span={12}>
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) =>
            getFieldValue("targetType") === "vehicle" ? (
              <Form.Item label="车辆" name="vehicleId" rules={[{ required: true }]}>
                <Select
                  options={vehicles.map((v) => ({ value: v.id, label: `${v.plateNo} / ${v.brandModel}` }))}
                  showSearch
                  optionFilterProp="label"
                  placeholder="搜索车牌或品牌型号"
                />
              </Form.Item>
            ) : (
              <Form.Item label={fixedTargetType === "equipment" ? "设备名称" : "对象名称"} name="equipmentName" rules={[{ required: true }]}>
                <AutoComplete
                  className="w-full"
                  options={equipmentNameOptions}
                  placeholder={fixedTargetType === "equipment" ? "请选择或输入设备名称" : "请选择或输入设备/其他对象名称"}
                  filterOption={(inputValue, option) => (option?.value ?? "").toString().toLowerCase().includes(inputValue.trim().toLowerCase())}
                />
              </Form.Item>
            )
          }
        </Form.Item>
      </Col>
      <Form.Item noStyle shouldUpdate>
        {({ getFieldValue }) =>
          getFieldValue("targetType") === "equipment" ? (
            <>
              <Col span={12}>
                <Form.Item label="设备类型" name="equipmentType">
                  <Select allowClear options={equipmentTypeOptions} placeholder="选择设备类型（可选）" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="设备分类" name="equipmentCategory">
                  <Select allowClear options={equipmentCategoryOptions} placeholder="选择设备分类（可选）" />
                </Form.Item>
              </Col>
            </>
          ) : null
        }
      </Form.Item>
      <Col span={12}>
        <Form.Item
          label={(
            <span>
              维保类型
              <Tooltip title="用于后续报表统计，请尽量选择最贴近实际场景的类型">
                <span className="ml-1 cursor-help text-slate-400">?</span>
              </Tooltip>
            </span>
          )}
          name="maintenanceType"
          initialValue="routine"
          rules={[{ required: true }]}
        >
          <Select options={maintenanceTypeOptions} placeholder="请选择维保类型" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="维保日期" name="maintenanceDate" rules={[{ required: true }]}>
          <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="选择维保日期" />
        </Form.Item>
      </Col>
      <Form.Item noStyle shouldUpdate>
        {({ getFieldValue }) =>
          getFieldValue("targetType") === "vehicle" ? (
            <Col span={12}>
              <Form.Item
                label={(
                  <span>
                    本次里程（车辆必填）
                    <Tooltip title="里程将用于后续保养计划计算，请填写当前真实读数">
                      <span className="ml-1 cursor-help text-slate-400">?</span>
                    </Tooltip>
                  </span>
                )}
                name="mileage"
                rules={[{ required: true, message: "车辆维保请填写本次里程" }]}
              >
                <InputNumber min={0} className="w-full" placeholder="请输入本次里程（km）" />
              </Form.Item>
            </Col>
          ) : null
        }
      </Form.Item>
    </Row>
  );
}
