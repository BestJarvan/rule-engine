import React, { useCallback } from "react";
import {
  Button, InputNumber
} from 'antd';
import {
  Query, Builder, Utils,
} from "@bestjarvan/helper-rule-engine";
import throttle from "lodash/throttle";
import loadConfig from "./config";
import clone from "clone";
import './index.css'

const {
  checkTree,
  loadTree,
  uuid,
  isValidTree
} = Utils;
const preErrorStyle = { backgroundColor: "lightpink", margin: "10px", padding: "10px" };

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

const DemoQueryBuilder = (props) => {
  console.log('prop2222s: ', props);
  const memo = {};

  // const [state, setState] = useState({
  //   tree: initTree,
  //   config: loadedConfig,
  //   spelStr: "",
  //   spelErrors: [],
  // });


  // useEffect(() => {
  //   if (props.state.config.fields) {
  //     console.log('props: ', props);
  //     // const state1 = JSON.parse(JSON.stringify(props.state))
  //     // console.log('state1: ', state1);
  //     // setState({ ...state1 })
  //     setState({ ...props.state })
  //   }
  // }, [props.state])

  const setState = (obj) => {
    props.onUpdateState(obj)
  }

  const switchShowLock = () => {
    const newConfig = clone(props.state.config);
    newConfig.settings.showLock = !newConfig.settings.showLock;
    setState({ ...props.state, config: newConfig });
  };

  const resetValue = () => {
    setState({
      ...props.state,
      tree: initTree,
    });
  };

  const validate = () => {
    setState({
      ...props.state,
      tree: checkTree(props.state.tree, props.state.config)
    });
  };

  const clearValue = () => {
    setState({
      ...props.state,
      tree: loadTree(emptyInitValue),
    });
  };
  const renderBuilder = useCallback((bprops) => {
    memo._actions = bprops.actions;
    return (
      <div className="query-builder-container" style={{ padding: "10px" }}>
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
    setState(prevState => ({ ...prevState, tree: memo.immutableTree, config: memo.config }));
  }, 100);

  const renderResult = ({ tree: immutableTree, config }) => {
    const isValid = isValidTree(immutableTree);

    return (
      <div>
        {isValid ? null : <pre style={preErrorStyle}>{"Tree has errors"}</pre>}
      </div>
    );
  };

  const onChangeInput = (value) => {
    console.log('changed', value);
  };

  return (
    <div className="rule-wrap">
      <div className="btns">
        <Button onClick={resetValue}>重置</Button>
        <Button className="btn-margin" onClick={clearValue}>清空</Button>
        <Button className="btn-margin" onClick={validate}>校验</Button>
        <Button className="btn-margin" onClick={switchShowLock}>显示锁定: {props.state.config.settings.showLock ? "显示" : "隐藏"}</Button>
      </div>
      <div className="sort">
        <span>优先级 </span>
        <InputNumber
          style={{
            width: 220,
          }}
          placeholder="请输入优先级"
          onChange={onChangeInput}
          min={0}
          max={999}
        />
      </div>
      <Query
        {...props.state.config}
        value={props.state.tree}
        onChange={onChange}
        renderBuilder={renderBuilder}
      />

      <div className="query-builder-result">
        {renderResult(props.state)}
      </div>
    </div>
  )
};


export default DemoQueryBuilder;
