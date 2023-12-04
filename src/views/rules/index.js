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
import FormulaModal from '../../components/formula'
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
let initValue = emptyInitValue;
let initTree;
initTree = checkTree(loadTree(initValue), loadedConfig);

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

  // text、 select、 formula
  const [valueType, setValueType] = useState('text')
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [factList, setFactList] = useState([])
  const [returnList, setReturnList] = useState([])
  const [returnValueList, setReturnValueList] = useState([])
  const [formulaList, setFormulaList] = useState([])
  const [formulaText, setFormulaText] = useState([])

  useEffect(() => {
    fetchAllRulesObj()
    window.addEventListener("update", onConfigChanged);
    return () => {
      window.removeEventListener("update", onConfigChanged);
    };
    // eslint-disable-next-line
  }, [factList.length])

  const factFormulaList = (obj) => {
    const o = JSON.parse(JSON.stringify(obj))
    const l = o.fields.filter(v => v.fieldType === 'number').map(s => ({
      ...s,
      label: s.factFieldName,
      value: `f_${s.id}`,
      isLeaf: true
     }))
   
    return [{
      label: obj.objName,
      value: `s_${obj.id}`,
      children: l
    }]
  }

  const factFields = (data) => {
    const obj = {}
    data.fields.forEach(item => {
      const filed = {
        label: item.factFieldName,
        type: item.fieldType,
      }
      if (['multiselect', 'select'].includes(item.fieldType)) {
        filed['valueSources'] = ['value']
        if (item.fromType === 1 || (item.propertySelectList && item.propertySelectList.length)) {
          // 配置属性值
          filed['fieldSettings'] = {
            listValues: item.propertySelectList.map(s => ({
              title: s.label,
              value: item.propertyValueType === 'String' ? String(s.value) : Number(s.value)
            }))
          }
        } else if (item.fromType === 2) {
          // 远端拉取属性源
          filed['fieldSettings'] = {
            listValues: [],
            asyncFetch: async () => {
              try {
                const { data } = await fetchQueryPropertyUrlData({
                  valueUrl: item.propertySelectUrl,
                  requestBody: item.requestBody
                })

                return {
                  values: data.map(s => ({
                    title: s.label,
                    value: item.propertyValueType === 'String' ? String(s.value) : Number(s.value)
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

      setValueType(data.simpleRuleValueType)

      data.simpleResultPropertyId && onChangeReturnAttr(data.simpleResultPropertyId)

      if (data.formulaText) {
        setFormulaText(data.formulaText)
      }

      form.setFieldsValue({
        factObjId: data.factObjId,
        ruleName: data.ruleName,
        priority: data.priority,
        simpleResultPropertyId: data.simpleResultPropertyId,
        simpleRuleValueType: data.simpleRuleValueType,
        simpleRuleValue: data.simpleRuleValueArray || data.simpleRuleValue
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

  const setSimpleRuleValue = (e) => {
    if (!e) return
    form.setFieldsValue({
      simpleRuleValue: e
    })
  }

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
    form.setFieldValue('simpleResultPropertyId', void 0)
    form.setFieldValue('simpleRuleValue', void 0)
    setReturnValueList([])
    fetchFields(factObjId)
  }

  const onChangeReturn = async (val) => {
    const type = form.getFieldValue('simpleRuleValueType')
    if (type === 'select') {
      // select
      form.setFieldValue('simpleRuleValue', void 0)
      setReturnValueList([])
    } else {
      // text
      form.setFieldValue('simpleResultPropertyId', void 0)
      form.setFieldValue('simpleRuleValue', void 0)
    }
    setValueType(type)
  }

  const onChangeReturnAttr = async (id) => {
    try {
      form.setFieldValue('simpleRuleValue', void 0)
      const { data } = await fetchAttrDetails({ id })
      if (data.fromType === 2) {
        // 配置属性源
        const { data: arr } = await fetchQueryPropertyUrlData({
          valueUrl: data.valueUrl,
          requestBody: data.requestBody
        })
        const list = arr.map(v => ({
          value: String(v.value),
          label: v.label
        }))
        setReturnValueList(list)
      } else if (data.fromType === 1) {
        // 配置属性值
        const list = data.valueList.map(v => ({
          value: String(v.code),
          label: v.value
        }))
        setReturnValueList(list)
      }
    } catch (error) {
    }
  }

  const fetchFields = async (factObjId, spel) => {
    try {
      const { data } = await fetchRulesFactOne({ factObjId, ruleId })

      setFormulaList(factFormulaList(data))
      
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
        onlySelect: true,
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
        表达式: 
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

  const setReturnValue = ({ formula, formulaText }) => {
    if (formula) {
      setSimpleRuleValue(formula)
    }
    if (formulaText) {
      setFormulaText(formulaText)
    }
  }

  const onFinish = async (values) => {
    const {tree: immutableTree, config} = state
    const [spel] = _spelFormat(immutableTree, config)
    if (!spel) {
      message.error('请配置至少一条规则')
      return
    }
    try {
      const params = JSON.parse(JSON.stringify({
        ...values,
        sceneCode,
        expression: spel
      }))
      if (ruleId) {
        params['id'] = ruleId
      }
      if (formulaText) {
        params['formulaText'] = formulaText
      }
      if (Array.isArray(params.simpleRuleValue)) {
        params.simpleRuleValue = params.simpleRuleValue.join(',')
      }
      console.log('params: ', params);
      const { msg } = await saveRules(params)
      message.success(msg)
    } catch (error) {
    }
  };
  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  const showModal = () => {
    setIsModalOpen(true);
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

  const renderFormula = () => {
    let dom
    if (valueType === 'formula') {
      dom = (
        <Button type="primary" className="formula" onClick={showModal}>
          配置公式
        </Button>
      )
    }
    return dom
  }

  const renderReturnField = () => {
    let dom = (
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
        <Input />
      </Form.Item>
    )
    if (valueType === 'select') {
      dom = (
        <>
          <Form.Item
            label="返回结果属性"
            name="simpleResultPropertyId"
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

          <Form.Item
            label="返回结果"
            name="simpleRuleValue"
            rules={[
              {
                required: true,
                message: '请选择返回结果',
              },
            ]}
          >
            <Select
              mode="multiple"
              showArrow
              showSearch={false}
              style={{
                width: 220,
              }}
              options={returnValueList}
            />
          </Form.Item>
        </>
      )
    }

    return dom
  }

  return (
    <div className="query-wrap">
      <div className="query-form">
        <Form
          name="basic"
          initialValues={{
            priority: 0,
            status: true,
            simpleRuleValueType: 'text',
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
            <InputNumber
              style={{
                width: 220,
              }}
              min={0}
              max={999}
            />
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
          
          { renderBox() }

          <Form.Item
            label="返回结果类型"
            name="simpleRuleValueType"
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
                  value: 'text',
                  label: '文本',
                },
                {
                  value: 'select',
                  label: 'Select',
                },
                {
                  value: 'formula',
                  label: '公式计算',
                },
              ]}
            />
          </Form.Item>

          { renderFormula() }

          { renderReturnField() }
          

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
      
      <FormulaModal
        show={ isModalOpen }
        formulaList={ formulaList }
        ruleId={ ruleId }
        formulaText={ formulaText }
        setReturnValue={ setReturnValue }
        setIsModalOpen={ setIsModalOpen }
      />
    </div>
  );
};


export default DemoQueryBuilder;
