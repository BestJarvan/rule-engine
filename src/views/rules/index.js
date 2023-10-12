import React, { useEffect, useState, useCallback } from "react";
import {
  Button, InputNumber, Form, Input, Select, message,
} from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Query, Builder, Utils, 
} from "@bestjarvan/helper-rule-engine";
import throttle from "lodash/throttle";
import loadConfig from "./config";
import {
  fetchRulesFact,
  fetchRulesFactOne,
  fetchRuleDetail,
  saveRules,
  fetchAttrList,
  fetchAttrDetails,
  fetchQueryPropertyUrlData,
} from '../../api/rule'
// import loadedInitValue from "./init_value";
// import loadedInitLogic from "./init_logic";
import clone from "clone";
import './index.css'

const stringify = JSON.stringify;
const {
  _spelFormat,
  checkTree,
  loadTree,
  uuid,
  // loadFromJsonLogic,
  loadFromSpel,
  isValidTree
} = Utils;
const preStyle = { backgroundColor: "darkgrey", margin: "10px", padding: "10px" };
const preErrorStyle = { backgroundColor: "lightpink", margin: "10px", padding: "10px" };

const emptyInitValue = {id: uuid(), type: "group"};
const loadedConfig = loadConfig();
// let initValue = loadedInitValue && Object.keys(loadedInitValue).length > 0 ? loadedInitValue : emptyInitValue;
// const initLogic = loadedInitLogic && Object.keys(loadedInitLogic).length > 0 ? loadedInitLogic : undefined;
let initValue = emptyInitValue;
let initTree;
initTree = checkTree(loadTree(initValue), loadedConfig);
// initTree = checkTree(loadFromJsonLogic(initLogic, loadedConfig), loadedConfig); // <- this will work same  

console.log('loadedConfig: ', loadedConfig);

// Trick to hot-load new config when you edit `config.tsx`
const updateEvent = new CustomEvent("update", { detail: {
  config: loadedConfig,
  _initTree: initTree,
  _initValue: initValue,
} });
window.dispatchEvent(updateEvent);

const DemoQueryBuilder = () => {
  const memo = {};
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = searchParams.get('type') === 'edit'
  const sceneCode = searchParams.get('scene')
  const ruleId = searchParams.get('id')

  const [state, setState] = useState({
    tree: initTree, 
    config: loadedConfig,
    spelStr: "",
    spelErrors: [],
  });

  const [visibleItem, setVisibleItem] = useState(false)

  const [returnDetail, setReturnDetail] = useState({})
  const [factList, setFactList] = useState([])
  const [returnList, setReturnList] = useState([])
  const [returnValueList, setReturnValueList] = useState([])

  useEffect(() => {
    fetchAllRulesObj()
    window.addEventListener("update", onConfigChanged);
    return () => {
      window.removeEventListener("update", onConfigChanged);
    };
    // eslint-disable-next-line
  }, [factList.length])

  const factFields = (data) => {
    const obj = {}
    data.fields.forEach(item => {
      const filed = {
        label: item.factFieldName,
        type: item.fieldType,
      }
      if (item.fieldType === 'select') {
        filed['valueSources'] = ['value']
        if (item.fromType === 1) {
          // 配置属性值
          filed['fieldSettings'] = {
            listValues: item.propertySelectList.map(s => ({
              title: s.label,
              value: s.value
            }))
          }
        } else if (item.fromType === 2) {
          // 远端拉取属性源
          filed['fieldSettings'] = {
            listValues: [],
            asyncFetch: async () => {
              try {
                const { data } = await fetchQueryPropertyUrlData({
                  valueUrl: item.propertySelectUrl
                })
                console.log('data: ', data);
                return {
                  values: data.map(s => ({
                    title: s.label,
                    value: s.value
                  }))
                }
              } catch (error) {
              }
            }
          }
        }
      }
      obj[`data.${item.factFieldCode}`] = filed
    })
    console.log('obj: ', obj);
    return obj
  }

  // 获取所有可选事实对象
  const fetchAllRulesObj = async () => {
    try {
      const { data } = await fetchRulesFact({})
      const list = data.map(v => ({
        value: v.id,
        label: v.objName
      }))
      setFactList(list);
      if (isEdit) {
        fetchRulesDetail()
      } else {
        fetchFields(list[0].value)
        form.setFieldsValue({
          factObjId: list[0].value
        })
      }
    } catch (error) {
    }
  }

  const fetchRulesDetail = async () => {
    try {
      const { data } = await fetchRuleDetail({ id: ruleId })
      fetchFields(data.factObjId, data.expression)

      form.setFieldsValue({
        factObjId: data.factObjId,
        ruleName: data.ruleName,
        priority: data.priority,
        simpleRuleValue: data.simpleRuleValue
      })

    } catch (error) {
    }
  }

  const onConfigChanged = (e) => {
    const {detail: {config, _initTree, _initValue}} = e
    console.log("Updating config...");
    setState({
      ...state,
      config,
    });
    initTree = _initTree;
    initValue = _initValue;
  };

  const switchShowLock = () => {
    const newConfig = clone(state.config);
    newConfig.settings.showLock = !newConfig.settings.showLock;
    setState({...state, config: newConfig});
  };

  const resetValue = () => {
    setState({
      ...state,
      tree: initTree, 
    });
  };

  const validate = () => {
    setState({
      ...state,
      tree: checkTree(state.tree, state.config)
    });
  };

  const onChangeSpelStr = (e) => {
    const spelStr = e.target.value;
    setState({
      ...state,
      spelStr
    });
  };

  const importFromSpel = () => {
    const [tree, spelErrors] = loadFromSpel(state.spelStr, state.config);
    setState({
      ...state, 
      tree: tree ? checkTree(tree, state.config) : state.tree,
      spelErrors
    });
  };

  const clearValue = () => {
    setState({
      ...state,
      tree: loadTree(emptyInitValue), 
    });
  };
  const renderBuilder = useCallback((bprops) => {
    memo._actions = bprops.actions;
    return (
      <div className="query-builder-container" style={{padding: "10px"}}>
        <div className="query-builder qb-lite">
          <Builder {...bprops} />
        </div>
      </div>
    );
  // eslint-disable-next-line
  }, []);
  const onChange = useCallback((immutableTree, config, actionMeta) => {
    console.log('config: ', config);
    console.log('immutableTree: ', immutableTree);
    if (actionMeta)
      console.info(actionMeta);
    memo.immutableTree = immutableTree;
    memo.config = config;
    updateResult();
  // eslint-disable-next-line
  }, []);

  const updateResult = throttle(() => {
    setState(prevState => ({...prevState, tree: memo.immutableTree, config: memo.config}));
  }, 100);

  const handleFactChange = (factObjId) => {
    clearValue()
    // setReturnList([])
    form.setFieldValue('factReturnAttr', void 0)
    form.setFieldValue('factReturnVal', void 0)
    setReturnValueList([])
    fetchFields(factObjId)
  }

  const onChangeReturn = async (val) => {
    const flag = form.getFieldValue('factReturnType') === 1
    if (flag) {
      // select
      form.setFieldValue('simpleRuleValue', void 0)
      setReturnValueList([])
    } else {
      // text
      form.setFieldValue('factReturnAttr', void 0)
      form.setFieldValue('factReturnVal', void 0)
      form.setFieldValue('simpleRuleValue', void 0)
    }
    setVisibleItem(flag)
  }

  const onChangeReturnAttr = async (id) => {
    try {
      form.setFieldValue('factReturnVal', void 0)
      const { data } = await fetchAttrDetails({ id })
      setReturnDetail(data)
      if (data.fromType === 2) {
        // 配置属性源
        const { data: arr } = await fetchQueryPropertyUrlData({
          valueUrl: data.valueUrl,
          requestBody: data.requestBody
        })
        setReturnValueList(arr)
      } else if (data.fromType === 1) {
        // 配置属性值
        const list = data.valueList.map(v => ({
          value: v.code,
          label: v.value
        }))
        setReturnValueList(list)
      }
    } catch (error) {
    }
  }

  const fetchFields = async (factObjId, spel) => {
    try {
      const { data } = await fetchRulesFactOne({ factObjId })
      
      const stateObj = {
        ...state, 
      }
      const {config} = state
      config.fields = factFields(data)
      if (spel) {
        const [tree, spelErrors] = loadFromSpel(spel, config);
        stateObj['tree'] = tree ? checkTree(tree, config) : state.tree
        console.log('stateObj: ', stateObj);
        stateObj['spelErrors'] = spelErrors
        initTree = stateObj['tree']
      }
      stateObj['config'] = config
      setState(stateObj)

      const { data: { list = [] } } = await fetchAttrList({
        ruleFactObjId: factObjId,
        pageNum: 1,
        pageSize: 9999,
        type: 2
      })
      const arr = list.map(v => ({
        label: v.name,
        value: v.id
      }))
      setReturnList(arr)
  
    } catch (error) {
    }
  }

  const jumpBack = () => {
    navigate(-1)
  }


  const renderResult = ({tree: immutableTree, config}) => {
    const isValid = isValidTree(immutableTree);
    const [spel, spelErrors] = _spelFormat(immutableTree, config);

    return (
      <div>
        {isValid ? null : <pre style={preErrorStyle}>{"Tree has errors"}</pre>}
        <br />
        <div>
        spelFormat: 
          { spelErrors.length > 0 
            && <pre style={preErrorStyle}>
              {stringify(spelErrors, undefined, 2)}
            </pre> 
          }
          <pre style={preStyle}>
            {stringify(spel, undefined, 2)}
          </pre>
        </div>
        {/* <hr/>
      <div>
        queryBuilderFormat: 
          <pre style={preStyle}>
            {stringify(queryBuilderFormat(immutableTree, config), undefined, 2)}
          </pre>
      </div> */}
      </div>
    );
  };

  const onFinish = async (values) => {
    const {tree: immutableTree, config} = state
    const [spel] = _spelFormat(immutableTree, config)
    if (!spel) {
      message.error('请配置至少一条规则')
      return
    }
    try {
      const params = {
        ...values,
        sceneCode,
        expression: spel
      }
      if (ruleId) {
        params['id'] = ruleId
      }
      const { msg } = await saveRules(params)
      message.success(msg)
    } catch (error) {
    }
  };
  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  const renderBox = () => {
    return (
      <div>
        <div>
          <Button onClick={resetValue}>重置</Button>
          <Button className="btn-margin" onClick={clearValue}>清空</Button>
          <Button className="btn-margin" onClick={validate}>校验</Button>
          <Button className="btn-margin" onClick={switchShowLock}>显示锁定: {state.config.settings.showLock ? "显示" : "隐藏"}</Button>
        </div>
        
        <Query
          {...state.config}
          value={state.tree}
          onChange={onChange}
          renderBuilder={renderBuilder}
        />

        <div className="query-import-spel">
          SpEL:
          <input className="query-import-input" type="text" value={state.spelStr} onChange={onChangeSpelStr} />
          <button onClick={importFromSpel}>导入规则</button>
          <br />
          { state.spelErrors.length > 0 
              && <pre style={preErrorStyle}>
                {stringify(state.spelErrors, undefined, 2)}
              </pre> 
          }
        </div>

        <div className="query-builder-result">
          {renderResult(state)}
        </div>
      </div>
    )
  }

  const initFormItem = () => {
    // 0文本 1单选 2多选
    const type = returnDetail.valueType

    const res = type === 0 ? (<Form.Item
      label="返回结果"
      name="simpleRuleValue"
      rules={[
        {
          required: true,
          message: '请输入返回结果',
        },
      ]}
    >
      <Input
        style={{
          width: 220,
        }}
      />
    </Form.Item>)
    :
    (<Form.Item
      label="返回结果"
      name="factReturnVal"
      rules={[
        {
          required: true,
          message: '请选择返回结果',
        },
      ]}
    >
      <Select
        mode={ type === 2 ? 'multiple' : void 0 }
        showArrow
        showSearch={false}
        style={{
          width: 220,
        }}
        options={returnValueList}
      />
    </Form.Item>)

    return res
  }

  return (
    <div className="query-wrap">
      <div className="query-form">
        <Form
          name="basic"
          initialValues={{
            priority: 0,
            status: true,
            factReturnType: 0,
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
            rules={[
              {
                required: true,
                message: '请输入规则名称',
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="优先级"
            name="priority"
            rules={[
              {
                required: true,
                message: '请输入优先级',
              },
            ]}
          >
            <InputNumber min={0} max={999} />
          </Form.Item>

          <Form.Item
            label="事实对象"
            name="factObjId"
            rules={[
              {
                required: true,
                message: '请选择事实对象',
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
          
          {/* <Form.Item
            label="是否启用"
            name="status"
            valuePropName="checked"
            rules={[
              {
                required: true,
                message: '请选择是否启用',
              },
            ]}
          >
            <Switch defaultChecked checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item> */}

          { renderBox() }

          <Form.Item
            label="返回结果类型"
            name="factReturnType"
            rules={[
              {
                required: true,
                message: '请选择返回结果类型',
              },
            ]}
          >
            <Select
              style={{
                width: 220,
              }}
              onChange={onChangeReturn}
              options={[
                {
                  value: 0,
                  label: '文本',
                },
                {
                  value: 1,
                  label: '配置',
                },
              ]}
            />
          </Form.Item>

          {visibleItem ?
            <>
              <Form.Item
                label="返回结果属性"
                name="factReturnAttr"
                rules={[
                  {
                    required: true,
                    message: '请选择返回结果属性',
                  },
                ]}
              >
                <Select
                  style={{
                    width: 220,
                  }}
                  onChange={onChangeReturnAttr}
                  options={returnList}
                />
              </Form.Item>

              { initFormItem() }
            </>
            :
            <Form.Item
              label="返回结果"
              name="simpleRuleValue"
              rules={[
                {
                  required: true,
                  message: '请输入返回结果',
                },
              ]}
            >
              <Input
                style={{
                  width: 220,
                }}
              />
            </Form.Item>
          }
          

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
