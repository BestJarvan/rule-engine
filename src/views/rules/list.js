import React, { useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Select, Spin, message } from "antd";
import { useSearchParams } from "react-router-dom";
import { Utils } from "@bestjarvan/helper-rule-engine";
import loadConfig from "./config";
import {
  fetchRulesFact,
  fetchRulesFactOne,
  saveAllRules,
  fetchAttrList,
  fetchAttrDetails,
  fetchAllRulesDetail,
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
  const sceneCode = searchParams.get("scene");
  const sceneName = searchParams.get("name");
  const appList = searchParams.get("subscribeAppList")
  const subscribeAppList = appList ? appList.split(",") : null
  const factObjId = searchParams.get("factObjId");
  console.log("factObjId: ", factObjId);
  const simpleResultPropertyId = searchParams.get("simpleResultPropertyId");
  console.log("simpleResultPropertyId: ", simpleResultPropertyId);

  const [state, setState] = useState([
    {
      tree: initTree,
      config: loadedConfig,
      spelStr: "",
      spelErrors: [],
      id: uuid(),
    },
  ]);

  const [memo] = useState({
    tree: initTree,
    config: loadedConfig,
    spelStr: "",
    spelErrors: [],
    id: uuid(),
  });

  const [factList, setFactList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returnList, setReturnList] = useState([]);
  const [returnValueList, setReturnValueList] = useState([[]]);

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
      fetchRulesDetail();
    } catch (error) {}
  };

  const fetchRulesDetail = async () => {
    try {
      const { data } = await fetchAllRulesDetail({ sceneCode, sceneName });
      data.sceneName = sceneName;
      if (!data.factObjId) {
        const id = factObjId || factList[0].value;
        fetchFields(id);
        simpleResultPropertyId &&
          onChangeReturnAttr({
            id: simpleResultPropertyId,
            index: 0,
            flag: true,
          });
        form.setFieldsValue({
          factObjId: id,
          sceneName,
          rules: [
            {
              priority: 0,
              simpleResultPropertyId: simpleResultPropertyId || "",
              simpleRuleValueType: "select",
            },
          ],
        });
      } else {
        fetchFields(data.factObjId, data.rules);

        form.setFieldsValue({
          ...data,
          rules: [],
        });
      }
      setLoading(false);
    } catch (error) {}
  };

  const clearValue = () => {
    const arr = [
      {
        ...memo,
        tree: loadTree(emptyInitValue),
      },
    ];
    setState([...arr]);
  };

  const handleFactChange = factObjId => {
    clearValue();
    form.setFieldValue("rules", [
      {
        priority: 0,
        simpleRuleValueType: "select",
      },
    ]);
    setReturnValueList([[]]);
    fetchFields(factObjId);
  };

  const onChangeReturnAttr = async ({
    id,
    index,
    flag = false,
    returnList,
    spelLength,
  }) => {
    console.log("index: ", index);
    try {
      const rules = form.getFieldValue("rules");
      if (!flag) {
        rules[index].simpleRuleValue = void 0;
        form.setFieldValue("rules", rules);
      }
      const { data } = await fetchAttrDetails({ id });
      if (data.fromType === 2 && !data.valueList?.length) {
        // 配置属性源
        const { data: arr } = await fetchQueryPropertyUrlData({
          valueUrl: data.valueUrl,
          requestBody: data.requestBody,
        });
        const list = arr.map(v => ({
          value: String(v.value),
          label: v.label,
        }));

        if (!returnList) {
          const res = [...returnValueList];
          res[index] = list;
          setReturnValueList(res);
        } else {
          returnList[index] = list;
        }
        if (index === spelLength - 1) {
          setReturnValueList(returnList);
        }
      } else if (data.fromType === 1 || data.valueList?.length) {
        // 配置属性值
        const list = data.valueList.map(v => ({
          value: String(v.code),
          label: v.value,
        }));
        if (!returnList) {
          const res = [...returnValueList];
          res[index] = list;
          setReturnValueList(res);
        } else {
          returnList[index] = list;
        }
        if (index === spelLength - 1) {
          setReturnValueList(returnList);
        }
      }
    } catch (error) {}
  };

  const fetchAttrPropsList = async () => {
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
  };

  const fetchFields = async (factObjId, spelArr) => {
    try {
      const { data } = await fetchRulesFactOne({ factObjId });
      fetchAttrPropsList();

      const rules = [];

      const { config } = memo;
      config.fields = factFields(data);
      const returnList = [...returnValueList];
      if (spelArr?.length) {
        spelArr.forEach((v, i) => {
          const stateObj = {
            ...memo,
            id: uuid(),
          };
          const [tree, spelErrors] = loadFromSpel(v.expression, config);
          stateObj["tree"] = tree ? checkTree(tree, config) : memo.tree;
          stateObj["spelErrors"] = spelErrors;
          initTree = stateObj["tree"];
          stateObj["config"] = config;
          rules.push(stateObj);

          v.simpleResultPropertyId &&
            onChangeReturnAttr({
              id: v.simpleResultPropertyId,
              index: i,
              flag: true,
              returnList,
              spelLength: spelArr.length,
            });
          v.simpleRuleValue = v.simpleRuleValue.split(",");
        });
        setState([...rules]);

        form.setFieldValue("rules", spelArr);
      } else {
        const stateObj = {
          ...memo,
          id: uuid(),
        };
        stateObj["config"] = config;
        setState([stateObj]);
      }
    } catch (error) {}
  };

  const onFinish = async values => {
    const spelArr = [];
    const map = {};
    for (let i = 0; i < state.length; i++) {
      const { tree: immutableTree, config } = state[i];
      const [spel] = _spelFormat(immutableTree, config);
      const item = {
        ...values.rules[i],
      };
      if (map[item.priority]) {
        message.error(`优先级[${item.priority}], 不能重复!`);
        return;
      } else {
        map[item.priority] = true;
      }
      if (spel) {
        spelArr.push({
          ...item,
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
          subscribeAppList,
          rules: spelArr,
        })
      );
      console.log("params: ", params);

      params.rules.forEach(v => {
        if (Array.isArray(v.simpleRuleValue)) {
          v.simpleRuleValue = v.simpleRuleValue.join(",");
        }
      });

      await saveAllRules(params);
      message.success("操作成功");
    } catch (error) {}
  };
  const onFinishFailed = errorInfo => {
    console.log("Failed:", errorInfo);
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
          return (
            <>
              {fields.map((v, i) => {
                const stateItem = state[i];
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
                            onChangeReturnAttr({ id, index: i });
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
                          options={returnValueList[i]}
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
    simpleResultPropertyId &&
      onChangeReturnAttr({
        id: simpleResultPropertyId,
        index: arr.length - 1,
        flag: true,
      });

    const rules = form.getFieldValue("rules");
    rules.push({
      priority: 0,
      simpleResultPropertyId: simpleResultPropertyId || "",
      simpleRuleValueType: "select",
    });
    form.setFieldValue("rules", rules);
  };

  const onDelete = index => {
    if (state.length === 1) {
      message.error("至少保留一条规则!");
      return;
    }

    setState(prevState => {
      prevState.splice(index, 1);
      return [...prevState];
    });

    const rules = form.getFieldValue("rules");
    rules.splice(index, 1);
    form.setFieldValue("rules", rules);
  };

  return (
    <div className="query-wrap">
      <div className="query-form">
        <Spin spinning={loading}>
          <Form
            name="basic"
            initialValues={{
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
              name="sceneName"
              disabled
              rules={[
                {
                  required: true,
                  message: "请输入规则名称",
                },
              ]}
            >
              <Input disabled />
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
            </Form.Item>
          </Form>
        </Spin>
      </div>
    </div>
  );
};

export default DemoQueryBuilder;
