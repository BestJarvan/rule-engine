import React, { useEffect, useState } from "react";
import {
  Button, Form, Input, Select, message, Switch
} from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Utils,
} from "@bestjarvan/helper-rule-engine";
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
import Rule from './rule'
import './index.css'

const { TextArea } = Input
const {
  _spelFormat,
  checkTree,
  loadTree,
  uuid,
  loadFromSpel,
} = Utils;

const emptyInitValue = { id: uuid(), type: "group" };
const loadedConfig = loadConfig();
let initValue = emptyInitValue;
let initTree;
initTree = checkTree(loadTree(initValue), loadedConfig);

console.log('loadedConfig: ', loadedConfig);

// Trick to hot-load new config when you edit `config.tsx`
const updateEvent = new CustomEvent("update", {
  detail: {
    config: loadedConfig,
    _initTree: initTree,
    _initValue: initValue,
  }
});
window.dispatchEvent(updateEvent);

const DemoQueryBuilder = () => {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = searchParams.get('type') !== 'add'
  const isCopy = searchParams.get('type') === 'copy'
  const sceneCode = searchParams.get('scene')
  const ruleId = searchParams.get('id')

  const [state, setState] = useState([{
    tree: initTree,
    config: loadedConfig,
    spelStr: "",
    spelErrors: [],
  }]);

  // text、 select、 formula
  const [valueType, setValueType] = useState('text')
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [factList, setFactList] = useState([])
  const [returnList, setReturnList] = useState([])
  const [returnValueList, setReturnValueList] = useState([])
  const [formulaList, setFormulaList] = useState([])
  const [formulaText, setFormulaText] = useState('')

  useEffect(() => {
    fetchAllRulesObj()
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
      } else if (['treemultiselect'].includes(item.fieldType)) {
        function formatList(list) {
          return list.map(s => {
            const o = {
              title: s.label,
              value: s.value,
            }
            if (s.children.length) {
              o['children'] = formatList(s.children)
            }
            return o
          })
        }
        const arr = formatList(item.propertySelectList)
        filed['fieldSettings'] = {
          treeExpandAll: true,
          listValues: arr
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

      const obj = {
        factObjId: data.factObjId,
        priority: data.priority,
        enable: !!data.enable,
        simpleResultPropertyId: data.simpleResultPropertyId,
        simpleRuleValueType: data.simpleRuleValueType,
        simpleRuleValue: data.simpleRuleValueArray || data.simpleRuleValue
      }

      if (!isCopy) {
        obj['ruleName'] = data.ruleName
      }

      form.setFieldsValue(obj)

    } catch (error) {
    }
  }

  const setSimpleRuleValue = (e) => {
    if (!e) return
    form.setFieldsValue({
      simpleRuleValue: e
    })
  }

  const clearValue = () => {
    setState([{
      ...state[0],
      tree: loadTree(emptyInitValue),
    }]);
  };

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
      console.log(11);
      setFormulaList(factFormulaList(data))
      console.log(12);
      const stateObj = {
        ...state[0],
      }
      const { config } = state[0]
      config.fields = factFields(data)
      if (spel) {
        console.log('spel: ', spel);
        const [tree, spelErrors] = loadFromSpel(spel, config);
        stateObj['tree'] = tree ? checkTree(tree, config) : state[0].tree
        console.log('stateObj: ', stateObj);
        stateObj['spelErrors'] = spelErrors
        initTree = stateObj['tree']
      }
      stateObj['config'] = config
      console.log('stateObj: ', stateObj);
      setState([stateObj])

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

  const setReturnValue = ({ formula, formulaText }) => {
    console.log('formulaText: ', formulaText);
    console.log('formula: ', formula);
    if (formula) {
      setSimpleRuleValue(formula)
    }
    if (formulaText) {
      setFormulaText(formulaText)
    }
  }

  const onFinish = async (values) => {
    const { tree: immutableTree, config } = state
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
      if (!isCopy && ruleId) {
        params['id'] = ruleId
      }
      if (formulaText) {
        params['formulaText'] = formulaText
      }
      if (Array.isArray(params.simpleRuleValue)) {
        params.simpleRuleValue = params.simpleRuleValue.join(',')
      }
      if (valueType === 'json') {
        try {
          params.simpleRuleValue = JSON.stringify(JSON.parse(params.simpleRuleValue))
        } catch (error) {
          message.error('格式化失败, 请检查需要格式化的文本')
          return
        }
      }
      console.log('params: ', params);
      await saveRules(params)
      message.success('操作成功')
    } catch (error) {
    }
  };
  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  const checkValueFormat = () => {
    const value = form.getFieldValue('simpleRuleValue')
    if (!value) {
      message.error('请输入返回结果后校验！')
      return
    }
    try {
      const formattedJson = JSON.stringify(JSON.parse(value), null, 2)
      form.setFieldValue('simpleRuleValue', formattedJson)
    } catch (error) {
      console.log('errorJson: ', error);
      message.error('格式化失败, 请检查需要格式化的文本')
    }
  }

  const showModal = () => {
    setIsModalOpen(true);
  };

  const onUpdateState = (e) => {
    // setState(e)
  }

  const filterOption = (input, option) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase());

  const renderBox = () => {
    return (
      state.map((v, i) => (
        <Rule state={v} key={i} onUpdateState={onUpdateState} />
      ))
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

  const renderJsonPre = () => {
    let dom
    if (valueType === 'json') {
      dom = (
        <>
          <Button type="primary" className="formula" onClick={checkValueFormat}>
            格式化
          </Button>
        </>
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
        <Input
          disabled={valueType === 'formula'}
        />
      </Form.Item>
    )
    if (valueType === 'json' || valueType === 'groovyScript') {
      dom = (
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
          <TextArea
            autoSize={{ minRows: 4, maxRows: 30 }}
          />
        </Form.Item>
      )
    } else if (valueType === 'select') {
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
              showSearch
              filterOption={filterOption}
              style={{
                width: 500,
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
            enable: true,
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
            label="是否启用"
            name="enable"
            valuePropName="checked"
            rules={[
              {
                required: true,
                message: '请选择是否启用',
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

          {renderBox()}

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
                {
                  value: 'json',
                  label: 'JSON',
                },
                {
                  value: 'groovyScript',
                  label: 'GroovyScript',
                },
              ]}
            />
          </Form.Item>

          {renderFormula()}

          {renderReturnField()}

          {renderJsonPre()}


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
        show={isModalOpen}
        formulaList={formulaList}
        ruleId={ruleId}
        formulaText={formulaText}
        setReturnValue={setReturnValue}
        setIsModalOpen={setIsModalOpen}
      />
    </div>
  );
};


export default DemoQueryBuilder;
