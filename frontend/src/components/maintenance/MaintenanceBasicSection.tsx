import { AutoComplete, Col, DatePicker, Form, InputNumber, Row, Select } from "antd";
import type { FormInstance } from "antd";

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
  equipmentLocationOptions: SelectOption[];
  maintenanceTypeOptions: SelectOption[];
};

export function MaintenanceBasicSection({
  form,
  vehicles,
  equipmentNameOptions,
  equipmentTypeOptions,
  equipmentCategoryOptions,
  equipmentLocationOptions,
  maintenanceTypeOptions,
}: MaintenanceBasicSectionProps) {
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="关联类型" name="targetType" initialValue="vehicle" rules={[{ required: true }]}>
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
              <Form.Item label="对象名称" name="equipmentName" rules={[{ required: true }]}>
                <AutoComplete
                  className="w-full"
                  options={equipmentNameOptions}
                  placeholder="请选择或输入设备/其他对象名称"
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
              <Col span={12}>
                <Form.Item label="设备位置" name="equipmentLocation">
                  <Select allowClear options={equipmentLocationOptions} placeholder="选择设备位置（可选）" />
                </Form.Item>
              </Col>
            </>
          ) : null
        }
      </Form.Item>
      <Col span={12}>
        <Form.Item label="维保类型" name="maintenanceType" initialValue="routine" rules={[{ required: true }]}>
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
              <Form.Item label="本次里程（车辆必填）" name="mileage" rules={[{ required: true, message: "车辆维保请填写本次里程" }]}>
                <InputNumber min={0} className="w-full" placeholder="请输入本次里程（km）" />
              </Form.Item>
            </Col>
          ) : null
        }
      </Form.Item>
    </Row>
  );
}
