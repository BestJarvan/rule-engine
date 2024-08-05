import React, { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Switch,
} from "antd";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Utils } from "@bestjarvan/helper-rule-engine";
import loadConfig from "./config";
import {
  fetchRulesFact,
  fetchRulesFactOne,
  fetchRuleDetail,
  saveAllRules,
  fetchAttrList,
  fetchAttrDetails,
  fetchQueryPropertyUrlData,
} from "../../api/rule";
import Rule from "./rule";
import "./index.css";

const { _spelFormat, checkTree, loadTree, uuid, loadFromSpel } = Utils;

const emptyInitValue = { id: uuid(), type: "group" };
const loadedConfig = loadConfig();
let initValue = emptyInitValue;
let initTree;
initTree = checkTree(loadTree(initValue), loadedConfig);

console.log("loadedConfig: ", loadedConfig);

// Trick to hot-load new config when you edit `config.tsx`
const updateEvent = new CustomEvent("update", {
  detail: {
    config: loadedConfig,
    _initTree: initTree,
    _initValue: initValue,
  },
});
window.dispatchEvent(updateEvent);

const DemoQueryBuilder = () => {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = searchParams.get("type") !== "add";
  const isCopy = searchParams.get("type") === "copy";
  const sceneCode = searchParams.get("scene");
  const ruleName = searchParams.get("name");
  const ruleId = searchParams.get("id");

  const [state, setState] = useState([
    {
      tree: initTree,
      config: loadedConfig,
      spelStr: "",
      spelErrors: [],
      id: uuid(),
    },
  ]);

  const [memo, setMemo] = useState({
    tree: initTree,
    config: loadedConfig,
    spelStr: "",
    spelErrors: [],
    id: uuid(),
  });

  const [factList, setFactList] = useState([]);
  const [returnList, setReturnList] = useState([]);
  const [returnValueList, setReturnValueList] = useState([]);

  useEffect(() => {
    fetchAllRulesObj();
    // eslint-disable-next-line
  }, [factList.length]);

  const factFields = data => {
    const obj = {};
    data.fields.forEach(item => {
      const filed = {
        label: item.factFieldName,
        type: item.fieldType,
      };
      if (["multiselect", "select"].includes(item.fieldType)) {
        filed["valueSources"] = ["value"];
        if (
          item.fromType === 1 ||
          (item.propertySelectList && item.propertySelectList.length)
        ) {
          // 配置属性值
          filed["fieldSettings"] = {
            listValues: item.propertySelectList.map(s => ({
              title: s.label,
              value:
                item.propertyValueType === "String"
                  ? String(s.value)
                  : Number(s.value),
            })),
          };
        } else if (item.fromType === 2) {
          // 远端拉取属性源
          filed["fieldSettings"] = {
            listValues: [],
            asyncFetch: async () => {
              try {
                const { data } = await fetchQueryPropertyUrlData({
                  valueUrl: item.propertySelectUrl,
                  requestBody: item.requestBody,
                });

                return {
                  values: data.map(s => ({
                    title: s.label,
                    value:
                      item.propertyValueType === "String"
                        ? String(s.value)
                        : Number(s.value),
                  })),
                };
              } catch (error) {}
            },
          };
        }
      } else if (["treemultiselect"].includes(item.fieldType)) {
        function formatList(list) {
          return list.map(s => {
            const o = {
              title: s.label,
              value: s.value,
            };
            if (s.children.length) {
              o["children"] = formatList(s.children);
            }
            return o;
          });
        }
        const arr = formatList(item.propertySelectList);
        filed["fieldSettings"] = {
          treeExpandAll: true,
          listValues: arr,
        };
      }
      obj[`data.${item.factFieldCode}`] = filed;
    });
    console.log("obj: ", obj);
    return obj;
  };

  // 获取所有可选事实对象
  const fetchAllRulesObj = async () => {
    try {
      const { data } = await fetchRulesFact({});
      const list = data.map(v => ({
        value: v.id,
        label: v.objName,
      }));
      setFactList(list);
      if (isEdit) {
        fetchRulesDetail();
      } else {
        fetchFields(list[0].value);
        form.setFieldsValue({
          factObjId: list[0].value,
          ruleName,
          rules: [
            {
              priority: 0,
              simpleRuleValueType: "select",
            },
          ],
        });
      }
    } catch (error) {}
  };

  const fetchRulesDetail = async () => {
    try {
      const { data } = await fetchRuleDetail({ id: ruleId });
      fetchFields(data.factObjId, data.expression);

      // setValueType(data.simpleRuleValueType);

      // data.simpleResultPropertyId &&
      //   onChangeReturnAttr(data.simpleResultPropertyId);

      const obj = {
        factObjId: data.factObjId,
        enable: !!data.enable,

        // priority: data.priority,
        // simpleResultPropertyId: data.simpleResultPropertyId,
        // simpleRuleValueType: data.simpleRuleValueType,
        // simpleRuleValue: data.simpleRuleValueArray || data.simpleRuleValue,
      };

      if (isCopy) {
        obj["ruleName"] = void 0;
      } else {
        obj["ruleName"] = ruleName;
      }

      form.setFieldsValue(obj);
    } catch (error) {}
  };

  const clearValue = () => {
    setState([
      {
        ...memo,
        tree: initTree,
      },
    ]);
  };

  const handleFactChange = factObjId => {
    clearValue();
    form.setFieldValue("rules", [
      {
        priority: 0,
        simpleRuleValueType: "select",
      },
    ]);
    setReturnValueList([]);
    fetchFields(factObjId);
  };

  const onChangeReturnAttr = async (id, index) => {
    try {
      const rules = form.getFieldValue("rules");
      rules[index].simpleRuleValue = void 0;
      form.setFieldValue("rules", rules);
      const { data } = await fetchAttrDetails({ id });
      if (data.fromType === 2) {
        // 配置属性源
        const { data: arr } = await fetchQueryPropertyUrlData({
          valueUrl: data.valueUrl,
          requestBody: data.requestBody,
        });
        const list = arr.map(v => ({
          value: String(v.value),
          label: v.label,
        }));
        setReturnValueList(list);
      } else if (data.fromType === 1) {
        // 配置属性值
        const list = data.valueList.map(v => ({
          value: String(v.code),
          label: v.value,
        }));
        setReturnValueList(list);
      }
    } catch (error) {}
  };

  const fetchFields = async (factObjId, spel) => {
    try {
      const { data } = await fetchRulesFactOne({ factObjId, ruleId });
      const stateObj = {
        ...memo,
        id: uuid(),
      };
      const { config } = memo;
      config.fields = factFields(data);
      if (spel) {
        const [tree, spelErrors] = loadFromSpel(spel, config);
        stateObj["tree"] = tree ? checkTree(tree, config) : memo.tree;
        stateObj["spelErrors"] = spelErrors;
        initTree = stateObj["tree"];
      }
      stateObj["config"] = config;
      setMemo(stateObj);
      setState([stateObj]);

      const {
        data: { list = [] },
      } = await fetchAttrList({
        onlySelect: true,
        pageNum: 1,
        pageSize: 9999,
        type: 2,
      });
      const arr = list.map(v => ({
        label: v.name,
        value: v.id,
      }));
      setReturnList(arr);
    } catch (error) {}
  };

  const jumpBack = () => {
    navigate(-1);
  };

  const onFinish = async values => {
    console.log("values: ", values);
    const spelArr = [];
    for (let i = 0; i < state.length; i++) {
      const { tree: immutableTree, config } = state[i];
      const [spel] = _spelFormat(immutableTree, config);
      if (spel) {
        spelArr.push({
          ...values.rules[i],
          expression: spel,
        });
      } else {
        message.error("请配置至少一条规则");
        return;
      }
    }

    try {
      const params = JSON.parse(
        JSON.stringify({
          ...values,
          sceneCode,
          rules: spelArr,
        })
      );
      console.log("params: ", params);
      if (!isCopy && ruleId) {
        params["id"] = ruleId;
      }

      if (Array.isArray(params.simpleRuleValue)) {
        params.simpleRuleValue = params.simpleRuleValue.join(",");
      }

      await saveAllRules(params);
      message.success("操作成功");
    } catch (error) {}
  };
  const onFinishFailed = errorInfo => {
    console.log("Failed:", errorInfo);
  };

  const onDelete = index => {
    setState(prevState => {
      prevState.splice(index, 1);
      return [...prevState];
    });
  };

  const onUpdateState = ({ state: v, index }) => {
    setState(prevState => {
      prevState[index] = {
        ...v,
      };
      return [...prevState];
    });
  };

  const filterOption = (input, option) =>
    (option?.label ?? "").toLowerCase().includes(input.toLowerCase());

  const renderBox = () => {
    const dom = (
      <Form.List name="rules">
        {(fields, { add, remove }) => {
          console.log("fie222111lds: ", fields);
          return (
            <>
              {fields.map((v, i) => {
                console.log("field11s: ", fields);
                const stateItem = state[i];
                console.log("stateItem: ", stateItem);
                return (
                  <div className="rule-wrap" key={stateItem.id}>
                    <Rule
                      state={stateItem}
                      index={i}
                      onUpdateState={onUpdateState}
                      onDelete={onDelete}
                    />
                    <div className="rule-wrap__item">
                      <Form.Item
                        label="优先级"
                        name={[v.name, "priority"]}
                        rules={[
                          {
                            required: true,
                            message: "请输入优先级",
                          },
                        ]}
                      >
                        <InputNumber
                          style={{
                            width: 220,
                          }}
                          min={0}
                          max={999}
                        />
                      </Form.Item>
                      <Form.Item
                        label="返回结果属性"
                        name={[v.name, "simpleResultPropertyId"]}
                        rules={[
                          {
                            required: true,
                            message: "请选择返回结果属性",
                          },
                        ]}
                      >
                        <Select
                          style={{
                            width: 220,
                          }}
                          onChange={id => {
                            onChangeReturnAttr(id, i);
                          }}
                          options={returnList}
                        />
                      </Form.Item>

                      <Form.Item
                        label="返回结果"
                        name={[v.name, "simpleRuleValue"]}
                        rules={[
                          {
                            required: true,
                            message: "请选择返回结果",
                          },
                        ]}
                      >
                        <Select
                          mode="multiple"
                          showArrow
                          showSearch
                          filterOption={filterOption}
                          style={{
                            width: 500,
                          }}
                          options={returnValueList}
                        />
                      </Form.Item>
                    </div>
                  </div>
                );
              })}
            </>
          );
        }}
      </Form.List>
    );
    return dom;
  };

  const handleAddOne = () => {
    const arr = state;
    arr.push({
      ...memo,
      id: uuid(),
    });

    setState([...arr]);

    const rules = form.getFieldValue("rules");
    rules.push({
      priority: 0,
      simpleRuleValueType: "select",
    });
    form.setFieldValue("rules", rules);
  };

  return (
    <div className="query-wrap">
      <div className="query-form">
        <Form
          name="basic"
          initialValues={{
            enable: true,
            status: true,
            rules: [
              {
                priority: 0,
                simpleRuleValueType: "select",
              },
            ],
          }}
          form={form}
          labelAlign="left"
          labelCol={{ style: { width: 120 } }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="规则名称"
            name="ruleName"
            disabled
            rules={[
              {
                required: true,
                message: "请输入规则名称",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="是否启用"
            name="enable"
            valuePropName="checked"
            rules={[
              {
                required: true,
                message: "请选择是否启用",
              },
            ]}
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item
            label="事实对象"
            name="factObjId"
            rules={[
              {
                required: true,
                message: "请选择事实对象",
              },
            ]}
          >
            <Select
              style={{
                width: 220,
              }}
              onChange={handleFactChange}
              options={factList}
            />
          </Form.Item>

          {renderBox()}

          <Form.Item>
            <Button type="primary" onClick={handleAddOne}>
              新增条件
            </Button>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
            <Button className="btn-margin" onClick={jumpBack}>
              返回
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default DemoQueryBuilder;
