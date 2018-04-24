import qs from 'qs';
import merge from 'lodash.merge';
import getDeep from 'lodash.get';
import {mapQueryFields} from './validation';


const _pruneNullLeaves = (obj) => {
    return Object.assign(...Object.entries(obj).map(([k, v]) => {
        if (v === null) {
            return {};
        } else if (typeof v === 'object') {
            return {[k]: _pruneNullLeaves(v)};
        } else {
            return {[k]: v};
        }
    }));
};

const _applySerialization = (stateData, map) => {
    const result = {};
    Object.entries(map).forEach(([k, {stateField}]) => {
        const val = getDeep(stateData, stateField);
        if (val === null) {
            return;
        }
        result[k] = val;
    });
    return result;
};

export const queryStringMiddleware = (history, {reduxPathname, routes}, config = {}) => {
    const {usePush} = config;
    return store => next => action => {
        const result = next(action);
        const state = store.getState();
        const currentPath = reduxPathname(state);
        const routeConfig = routes[currentPath];

        if (routeConfig) {
            const {listen, select, serialize} = routeConfig;
            let data = _pruneNullLeaves(select(state));
            if (listen === action.type) {
                if (serialize) {
                    data = _applySerialization(data, serialize);
                }
                const queryString = qs.stringify(data);
                const path = `${currentPath}?${queryString}`;
                if (usePush) {
                    history.push(path);
                } else {
                    history.replace(path);
                }
            }
        }
        return result;
    };
};

export const createQueryStringReducer = (config, namespaceFunc, qsFunc) => {
    return (state, action) => {
        const queryString = qsFunc(state, action);
        if (queryString) {
            const values = qs.parse(queryString);
            const namespace = namespaceFunc ? namespaceFunc(state, action) : null;
            let newValues = null;
            try {
                newValues = mapQueryFields(values, config);
            } catch (e) {
                console.warn(e);
                newValues = {};
            }
            return merge({}, state, namespace ? {[namespace]: newValues} : newValues);
        }
        return state;
    };
};
