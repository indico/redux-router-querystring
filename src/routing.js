import qs from 'qs';
import merge from 'lodash.merge';
import getDeep from 'lodash.get';
import {mapQueryFields} from './validation';


const _pruneNullLeaves = (obj) => {
    if (!Object.entries(obj).length) {
        return {};
    }
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

export const stateToQueryString = (state, map) => qs.stringify(_applySerialization(state, map));

export const queryStringMiddleware = (history, {reduxPathname, routes}, config = {}) => {
    const {usePush} = config;
    return store => next => action => {
        const result = next(action);
        const state = store.getState();
        const currentPath = reduxPathname(state);
        const routeConfig = routes[currentPath];

        if (routeConfig) {
            const {listen, select, serialize} = routeConfig;
            const qsState = select(state);

            if (qsState === null) {
                return result;
            }
            let data = _pruneNullLeaves(qsState);
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

export const createQueryStringReducer = (config, qsFunc, resetFunc = (s => s)) => {
    return (state, action) => {
        const result = qsFunc(state, action);

        if (!result) {
            return resetFunc(state, null, null);
        }

        const {queryString, namespace} = result;
        if (queryString) {
            const values = qs.parse(queryString);
            let newValues = null;
            try {
                newValues = mapQueryFields(values, config);
                return merge({}, state, namespace ? {[namespace]: newValues} : newValues);
            } catch (e) {
                console.warn(e);
            }
        }
        return resetFunc(state, namespace, queryString);
    };
};
