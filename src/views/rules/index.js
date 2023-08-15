import React, { useEffect, useState, useCallback } from "react";
import {
  Query, Builder, Utils, 
} from "react-awesome-query-builder";
import throttle from "lodash/throttle";
import loadConfig from "./config";
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


// Trick to hot-load new config when you edit `config.tsx`
const updateEvent = new CustomEvent("update", { detail: {
  config: loadedConfig,
  _initTree: initTree,
  _initValue: initValue,
} });
window.dispatchEvent(updateEvent);


const DemoQueryBuilder = () => {
  const memo = {};

  const [state, setState] = useState({
    tree: initTree, 
    config: loadedConfig,
    spelStr: "",
    spelErrors: []
  });

  useEffect(() => {
    window.addEventListener("update", onConfigChanged);
    return () => {
      window.removeEventListener("update", onConfigChanged);
    };
  });


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

  return (
    <div className="query-wrap">
      <div>
        <button onClick={resetValue}>reset</button>
        <button onClick={clearValue}>clear</button>
        <button onClick={validate}>validate</button>
        <button onClick={switchShowLock}>show lock: {state.config.settings.showLock ? "on" : "off"}</button>
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
        <button onClick={importFromSpel}>import</button>
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
