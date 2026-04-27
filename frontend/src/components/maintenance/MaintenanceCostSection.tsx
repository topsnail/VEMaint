import { Button, Col, Form, Input, InputNumber, Row, Select, Space, Tooltip } from "@/components/ui/legacy";
import type { FormInstance } from "@/components/ui/legacy";
import { actionBtn } from "../../lib/ui/buttonTokens";

type SelectOption = { value: string; label: string };

type MaintenanceCostSectionProps = {
  form: FormInstance;
  currentUserName: string;
  itemDescOptions: SelectOption[];
  resultStatusOptions: SelectOption[];
};

export function MaintenanceCostSection({ form, currentUserName, itemDescOptions, resultStatusOptions }: MaintenanceCostSectionProps) {
  return (
    <Row gutter={16}>
      <Col span={24} className="md:col-span-2">
        <Form.Item noStyle shouldUpdate>
          {() => {
            const labor = Number(form.getFieldValue("laborCost") ?? 0);
            const material = Number(form.getFieldValue("materialCost") ?? 0);
            const misc = Number(form.getFieldValue("miscCost") ?? 0);
            const partRows = (Array.isArray(form.getFieldValue("partDetails")) ? form.getFieldValue("partDetails") : []) as Array<{
              qty?: number;
              unitPrice?: number;
            }>;
            const partAmount = partRows.reduce((sum, row) => sum + Number(row?.qty ?? 0) * Number(row?.unitPrice ?? 0), 0);
            const effectiveMaterial = partRows.length > 0 ? partAmount : material;
            const total = labor + effectiveMaterial + misc;
            const isVehicle = form.getFieldValue("targetType") === "vehicle";
            const materialLabel = isVehicle ? "配件" : "更换部件";
            const laborLabel = isVehicle ? "工时" : "工时（小时）";
            const miscLabel = isVehicle ? "其他" : "其他费用";
            const remarkPlaceholder = isVehicle ? "车辆维保补充说明" : "设备/其他对象维保补充说明";
            const quickTemplates = isVehicle ? ["更换机油机滤", "更换刹车片", "四轮定位/动平衡"] : ["更换滤芯", "电路排查", "润滑保养"];

            return (
              <div className="mb-4 w-full min-w-0 rounded-main border border-[#e5e7eb] bg-[#fafafa] px-3 py-3">
                <Form.Item name="itemDesc" initialValue="保养" hidden>
                  <Input />
                </Form.Item>
                <Row gutter={12}>
                  <Form.Item name="materialCost" hidden>
                    <InputNumber />
                  </Form.Item>
                  {isVehicle ? (
                    <Col span={8}>
                      <Form.Item label={laborLabel} name="laborCost" className="!mb-3">
                        <InputNumber min={0} precision={2} className="w-full" placeholder="工时费" />
                      </Form.Item>
                    </Col>
                  ) : null}
                  <Col span={8}>
                    <Form.Item label={miscLabel} name="miscCost" className="!mb-1">
                      <InputNumber min={0} precision={2} className="w-full" placeholder="其他费" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="合计" className="!mb-1">
                      <Input readOnly value={`¥${Number.isFinite(total) ? total.toFixed(2) : "0.00"}`} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label={(
                        <span>
                          总计
                          <Tooltip title="建议与左侧合计保持一致；如有折扣或补贴可手动调整">
                            <span className="ml-1 cursor-help text-slate-400">?</span>
                          </Tooltip>
                        </span>
                      )}
                      name="cost"
                      rules={[{ required: true, message: "请输入总费用" }]}
                      className="!mb-1"
                    >
                      <InputNumber min={0} precision={2} className="w-full" placeholder="总费用" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="维保人" className="!mb-0">
                      <Input readOnly value={currentUserName} />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="处理结果" name="resultStatus" className="!mb-0">
                      <Select allowClear options={resultStatusOptions} placeholder="请选择" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="备注" name="remark" className="!mb-0">
                      <Input placeholder={remarkPlaceholder} />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Space wrap size={[8, 8]} className="mt-0.5">
                      {quickTemplates.map((tpl) => (
                        <Button
                          key={tpl}
                          size="small"
                          onClick={() => {
                            const current = String(form.getFieldValue("remark") ?? "").trim();
                            form.setFieldValue("remark", [current, tpl].filter(Boolean).join("；"));
                          }}
                        >
                          + {tpl}
                        </Button>
                      ))}
                    </Space>
                  </Col>
                  <Col span={24}>
                    <Form.List name="partDetails">
                      {(fields, { add, remove }) => (
                        <div className="mt-0.5 w-full rounded-main border border-[#e5e7eb] bg-white px-3 py-2">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-[#334155]">配件明细</span>
                            <Button size="small" onClick={() => add()}>
                              新增配件
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {fields.map((field) => (
                              <Row key={field.key} gutter={8} align="middle">
                                <Col span={5}>
                                  <Form.Item {...field} name={[field.name, "partName"]} className="!mb-0">
                                    <Input placeholder="名称" />
                                  </Form.Item>
                                </Col>
                                <Col span={4}>
                                  <Form.Item {...field} name={[field.name, "spec"]} className="!mb-0">
                                    <Input placeholder="规格" />
                                  </Form.Item>
                                </Col>
                                <Col span={3}>
                                  <Form.Item {...field} name={[field.name, "unit"]} className="!mb-0">
                                    <Input placeholder="单位" />
                                  </Form.Item>
                                </Col>
                                <Col span={3}>
                                  <Form.Item {...field} name={[field.name, "qty"]} className="!mb-0">
                                    <InputNumber min={0} className="w-full" placeholder="数量" />
                                  </Form.Item>
                                </Col>
                                <Col span={4}>
                                  <Form.Item {...field} name={[field.name, "unitPrice"]} className="!mb-0">
                                    <InputNumber min={0} precision={2} className="w-full" placeholder="单价" />
                                  </Form.Item>
                                </Col>
                                <Col span={4}>
                                  <Form.Item noStyle shouldUpdate>
                                    {() => {
                                      const qty = Number(form.getFieldValue(["partDetails", field.name, "qty"]) ?? 0);
                                      const price = Number(form.getFieldValue(["partDetails", field.name, "unitPrice"]) ?? 0);
                                      return <Input readOnly value={`¥${(qty * price).toFixed(2)}`} />;
                                    }}
                                  </Form.Item>
                                </Col>
                                <Col span={1}>
                                  <Button type="text" className={actionBtn.textDanger} onClick={() => remove(field.name)}>
                                    删
                                  </Button>
                                </Col>
                              </Row>
                            ))}
                          </div>
                          <div className="mt-1 text-right text-sm text-[#64748b]">配件明细合计：¥{partAmount.toFixed(2)}</div>
                        </div>
                      )}
                    </Form.List>
                  </Col>
                </Row>
                <div className="mt-1">
                  <Form.Item noStyle shouldUpdate>
                    {() => {
                      const cost = Number(form.getFieldValue("cost") ?? 0);
                      const diff = Math.abs(cost - total);
                      if (!Number.isFinite(cost) || diff < 0.01) return null;
                      return (
                        <div className="text-[11px] text-amber-600">
                          当前“总计”与“合计”相差 ¥{diff.toFixed(2)}，请确认是否为折扣/附加费用。
                        </div>
                      );
                    }}
                  </Form.Item>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="small" className={actionBtn.smallNeutral} onClick={() => form.setFieldValue("cost", Number.isFinite(total) ? total : 0)}>
                    用合计覆盖总计
                  </Button>
                </div>
              </div>
            );
          }}
        </Form.Item>
      </Col>
      <Col span={24} className="md:col-span-2">
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) =>
            getFieldValue("itemDesc") === "其他" ? (
              <Form.Item label="项目补充说明" name="itemDescOther" rules={[{ required: true, message: "请选择“其他”时请补充说明具体项目" }]}>
                <Input placeholder="请输入具体维保项目，例如：线路排查、结构焊补等" />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </Col>
    </Row>
  );
}
