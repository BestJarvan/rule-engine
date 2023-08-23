import React, { useEffect, useState, useCallback } from "react";
import {
  Button, InputNumber, Form, Input, Select, message,
} from 'antd';
import { useSearchParams } from 'react-router-dom';
import {
  Query, Builder, Utils, 
} from "react-awesome-query-builder";
import throttle from "lodash/throttle";
import loadConfig from "./config";
import {
  fetchRulesFact,
  fetchRulesFactOne,
  fetchRuleDetail,
  saveRules,
} from '../../api/rule'
// import loadedInitValue from "./init_value";
// import loadedInitLogic from "./init_logic";
import clone from "clone";
import './index.css'

const stringify = JSON.stringify;
const {
  elasticSearchFormat,
  jsonLogicFormat,
  queryString,
  _mongodbFormat,
  _sqlFormat,
  _spelFormat,
  getTree,
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
  const isEdit = searchParams.get('type') === 'edit'
  const scene = searchParams.get('scene')
  const ruleId = searchParams.get('id')

  const [state, setState] = useState({
    tree: initTree, 
    config: loadedConfig,
    spelStr: "",
    spelErrors: [],
  });

  const [factList, setFactList] = useState([])

  useEffect(() => {
    fetchAllRulesObj()
    window.addEventListener("update", onConfigChanged);
    return () => {
      window.removeEventListener("update", onConfigChanged);
    };
    // eslint-disable-next-line
  }, [factList.length])

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
      console.log('error: ', error);
    }
  }

  const fetchRulesDetail = async () => {
    try {
      const { data } = await fetchRuleDetail({ id: ruleId })
      console.log('data: ', data);
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
    fetchFields(factObjId)
  }

  const fetchFields = async (factObjId, spel) => {
    try {
      const { data } = await fetchRulesFactOne({ factObjId })
      const obj = {}
      data.fields.forEach(item => {
        obj[`data.${item.factFieldCode}`] = {
          label: item.factFieldName,
          type: item.fieldType,
        }
      })
      console.log('obj: ', obj);
      const stateObj = {
        ...state, 
      }
      const {config} = state
      config.fields = obj
      if (spel) {
        const [tree, spelErrors] = loadFromSpel(spel, config);
        stateObj['tree'] = tree ? checkTree(tree, config) : state.tree
        stateObj['spelErrors'] = spelErrors
      }
      stateObj['config'] = config
      setState(stateObj)
    } catch (error) {
    }
  }


  const renderResult = ({tree: immutableTree, config}) => {
    const isValid = isValidTree(immutableTree);
    const treeJs = getTree(immutableTree);
    const {logic, data: logicData, errors: logicErrors} = jsonLogicFormat(immutableTree, config);
    const [spel, spelErrors] = _spelFormat(immutableTree, config);
    const queryStr = queryString(immutableTree, config);
    const humanQueryStr = queryString(immutableTree, config, true);
    const [sql, sqlErrors] = _sqlFormat(immutableTree, config);
    const [mongo, mongoErrors] = _mongodbFormat(immutableTree, config);
    const elasticSearch = elasticSearchFormat(immutableTree, config);

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
        <hr/>
        <div>
        stringFormat: 
          <pre style={preStyle}>
            {stringify(queryStr, undefined, 2)}
          </pre>
        </div>
        <hr/>
        <div>
        humanStringFormat: 
          <pre style={preStyle}>
            {stringify(humanQueryStr, undefined, 2)}
          </pre>
        </div>
        <hr/>
        <div>
        sqlFormat: 
          { sqlErrors.length > 0 
            && <pre style={preErrorStyle}>
              {stringify(sqlErrors, undefined, 2)}
            </pre> 
          }
          <pre style={preStyle}>
            {stringify(sql, undefined, 2)}
          </pre>
        </div>
        <hr/>
        <div>
          <a href="http://jsonlogic.com/play.html" target="_blank" rel="noopener noreferrer">jsonLogicFormat</a>: 
          { logicErrors.length > 0 
            && <pre style={preErrorStyle}>
              {stringify(logicErrors, undefined, 2)}
            </pre> 
          }
          { !!logic
            && <pre style={preStyle}>
              {"// Rule"}:<br />
              {stringify(logic, undefined, 2)}
              <br />
              <hr />
              {"// Data"}:<br />
              {stringify(logicData, undefined, 2)}
            </pre>
          }
        </div>
        <hr/>
        <div>
        mongodbFormat: 
          { mongoErrors.length > 0 
            && <pre style={preErrorStyle}>
              {stringify(mongoErrors, undefined, 2)}
            </pre> 
          }
          <pre style={preStyle}>
            {stringify(mongo, undefined, 2)}
          </pre>
        </div>
        <hr/>
        <div>
        elasticSearchFormat: 
          <pre style={preStyle}>
            {stringify(elasticSearch, undefined, 2)}
          </pre>
        </div>
        <hr/>
        <div>
        Tree: 
          <pre style={preStyle}>
            {stringify(treeJs, undefined, 2)}
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

  const renderForm = () => {
    const onFinish = async (values) => {
      console.log('Success:', values);
      const {tree: immutableTree, config} = state
      const [spel] = _spelFormat(immutableTree, config)
      if (!spel) {
        message.error('请配置至少一条规则')
        return
      }
      try {
        const params = {
          ...values,
          scene,
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

    return (
      <Form
        name="basic"
        initialValues={{
          priority: 0,
          status: true,
        }}
        form={form}
        labelAlign="left"
        labelCol={{ style: { width: 100 } }}
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
              width: 120,
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

        <Form.Item>
          <Button type="primary" htmlType="submit">
            保存
          </Button>
          <Button className="btn-margin">
            返回
          </Button>
        </Form.Item>
      </Form>
    )
  }

  return (
    <div className="query-wrap">
      <div className="query-form">
        {renderForm()}
      </div>
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
  );
};


export default DemoQueryBuilder;
