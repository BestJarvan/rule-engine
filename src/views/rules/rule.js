import React, { useCallback } from "react";
import { Button } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { Query, Builder, Utils } from "@bestjarvan/helper-rule-engine";
import throttle from "lodash/throttle";
import loadConfig from "./config";
import clone from "clone";
import "./index.css";

const { checkTree, loadTree, uuid, isValidTree } = Utils;
const preErrorStyle = {
  backgroundColor: "lightpink",
  margin: "10px",
  padding: "10px",
};

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

const DemoQueryBuilder = props => {
  console.log("prop2222s: ", props);
  const memo = {};

  const setState = obj => {
    props.onUpdateState(obj);
  };

  const switchShowLock = () => {
    const newConfig = clone(props.state.config);
    newConfig.settings.showLock = !newConfig.settings.showLock;
    setState({
      state: { ...props.state, config: newConfig },
      index: props.index,
    });
  };

  const resetValue = () => {
    setState({
      state: {
        ...props.state,
        tree: initTree,
      },
      index: props.index,
    });
  };

  const validate = () => {
    setState({
      state: {
        ...props.state,
        tree: checkTree(props.state.tree, props.state.config),
      },
      index: props.index,
    });
  };

  const deleteItem = () => {
    props.onDelete(props.index);
  };

  const clearValue = () => {
    setState({
      state: {
        ...props.state,
        tree: loadTree(emptyInitValue),
      },
      index: props.index,
    });
  };
  const renderBuilder = useCallback(bprops => {
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
    console.log("config: ", config);
    console.log("immutableTree: ", immutableTree);
    if (actionMeta) console.info(actionMeta);
    memo.immutableTree = immutableTree;
    memo.config = config;
    updateResult();
    // eslint-disable-next-line
  }, []);

  const updateResult = throttle(() => {
    setState({
      state: { ...props.state, tree: memo.immutableTree, config: memo.config },
      index: props.index,
    });
  }, 100);

  const renderResult = ({ tree: immutableTree, config }) => {
    const isValid = isValidTree(immutableTree);

    return (
      <div>
        {isValid ? null : <pre style={preErrorStyle}>{"Tree has errors"}</pre>}
      </div>
    );
  };

  return (
    <div>
      <div className="btns">
        <div>
          <Button onClick={resetValue}>重置</Button>
          <Button className="btn-margin" onClick={clearValue}>
            清空
          </Button>
          <Button className="btn-margin" onClick={validate}>
            校验
          </Button>
          <Button className="btn-margin" onClick={switchShowLock}>
            显示锁定: {props.state.config.settings.showLock ? "显示" : "隐藏"}
          </Button>
        </div>
        <Button
          type="primary"
          danger
          shape="circle"
          icon={<DeleteOutlined />}
          onClick={deleteItem}
        />
      </div>
      <Query
        {...props.state.config}
        value={props.state.tree}
        onChange={onChange}
        renderBuilder={renderBuilder}
      />

      <div className="query-builder-result">{renderResult(props.state)}</div>
    </div>
  );
};

export default DemoQueryBuilder;
